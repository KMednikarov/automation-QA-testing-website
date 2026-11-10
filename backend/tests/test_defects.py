"""Maintainer checks: the same correct API assertion detects each opt-in bug."""
import csv
import io

import pytest

from backend import app as module
from backend.defects import API_DEFECTS, UI_DEFECTS
from backend.tests.test_api import client, auth, sample, enable  # noqa: F401


def date_boundary(c, h):
    result = c.get('/api/sales?start_date=2026-01-01&end_date=2026-01-01', headers=h).json()
    assert result['total'] == 1


def discounts(c, h):
    rows = c.get('/api/sales?page_size=100', headers=h).json()['items']
    rows += c.get('/api/sales?page=2&page_size=100', headers=h).json()['items']
    assert c.get('/api/dashboard', headers=h).json()['revenue'] == round(sum(r['revenue'] for r in rows), 2)


def ownership(c, h):
    analyst = auth(c, 'analyst@atlas.test')
    ident = c.post('/api/reports', headers=h, json={'name': 'Ownership fixture'}).json()['id']
    try:
        assert c.delete(f'/api/reports/{ident}', headers=analyst).status_code == 403
    finally:
        c.delete(f'/api/reports/{ident}', headers=h)


def region(c, h):
    rows = c.get('/api/sales?region=Europe&page_size=100', headers=h).json()['items']
    assert rows and all(r['region'] == 'Europe' for r in rows)


def pagination(c, h):
    first = c.get('/api/sales?page=1', headers=h).json()['items']
    second = c.get('/api/sales?page=2', headers=h).json()['items']
    assert not {r['id'] for r in first} & {r['id'] for r in second}


def total(c, h):
    result = c.get('/api/sales?region=Europe&page_size=100', headers=h).json()
    assert result['total'] == len(result['items']) == 30


def update_discount(c, h):
    ident = c.post('/api/sales', headers=h, json=sample()).json()['id']
    try:
        assert c.put(f'/api/sales/{ident}', headers=h, json=sample(discount=20)).status_code == 200
        assert c.get(f'/api/sales/{ident}', headers=h).json()['discount'] == 20
    finally:
        c.delete(f'/api/sales/{ident}', headers=h)


def export_region(c, h):
    ident = c.post('/api/reports', headers=h, json={'name': 'Europe fixture', 'region': 'Europe'}).json()['id']
    try:
        body = c.get(f'/api/reports/{ident}/export', headers=h).text
        rows = list(csv.DictReader(io.StringIO(body)))
        assert rows and all(r['region'] == 'Europe' for r in rows)
    finally:
        c.delete(f'/api/reports/{ident}', headers=h)


def revoked_session(c, h):
    analyst = auth(c, 'analyst@atlas.test')
    assert c.post('/api/auth/logout', headers=analyst).status_code == 204
    assert c.get('/api/auth/me', headers=analyst).status_code == 401


def customers(c, h):
    assert c.get('/api/dashboard', headers=h).json()['customers'] == 5


CONTRACTS = [date_boundary, discounts, ownership, region, pagination, total,
             update_discount, export_region, revoked_session, customers]


@pytest.mark.parametrize('entry,contract', zip(API_DEFECTS, CONTRACTS), ids=[x[0] for x in API_DEFECTS])
def test_correct_contract_detects_each_api_defect(client, entry, contract):
    h = auth(client)
    contract(client, h)
    enable(client, h, **{entry[1]: True})
    with pytest.raises(AssertionError):
        contract(client, h)
    enable(client, h)
    contract(client, h)


def test_catalogue_and_default_clean_mode(client):
    data = client.get('/api/training', headers=auth(client)).json()
    assert len(data['catalogue']['api']) == len(data['catalogue']['ui']) == 10
    assert len(data['defects']) == 20
    assert len(set(x['key'] for group in data['catalogue'].values() for x in group)) == 20
    assert not any(data['defects'].values()) and data['mode'] == 'clean'


def test_ui_flags_do_not_change_api_contracts(client):
    h = auth(client)
    enable(client, h, **{key: True for _, key, _, _ in UI_DEFECTS})
    for contract in CONTRACTS:
        contract(client, h)


def test_existing_database_gets_disabled_new_flags_without_reset(client):
    h = auth(client)
    ident = client.post('/api/sales', headers=h, json=sample(customer='Preserve me')).json()['id']
    with module.db() as connection:
        connection.execute("DELETE FROM settings WHERE name NOT IN ('exclude_end_date','ignore_discounts','report_permissions')")
        connection.execute("UPDATE settings SET enabled=1 WHERE name='exclude_end_date'")
    module.initialize()
    flags = client.get('/api/training', headers=h).json()['defects']
    assert len(flags) == 20 and flags['exclude_end_date']
    assert sum(flags.values()) == 1
    assert client.get(f'/api/sales/{ident}', headers=h).json()['customer'] == 'Preserve me'


def test_legacy_settings_payload_and_reset_remain_supported(client):
    h = auth(client)
    original = dict(exclude_end_date=True, ignore_discounts=False, report_permissions=False)
    result = client.put('/api/training/defects', headers=h, json=original)
    assert result.status_code == 200
    assert result.json()['defects']['exclude_end_date']
    assert sum(result.json()['defects'].values()) == 1
    enable(client, h, **{key: True for key in module.DEFECTS})
    client.post('/api/training/reset', headers=h, json={'confirmation': 'RESET TRAINING DATA'})
    assert client.get('/api/training', headers=h).status_code == 401
    state = client.get('/api/training', headers=auth(client)).json()
    assert state['mode'] == 'clean' and not any(state['defects'].values())
