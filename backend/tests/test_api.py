import csv
import io

import pytest
from fastapi.testclient import TestClient
from backend import app as module

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setattr(module,'DB_PATH',str(tmp_path/'test.sqlite3'))
    module.initialize()
    with TestClient(module.app) as c:
        yield c

def auth(client,email='admin@atlas.test'):
    r=client.post('/api/auth/login',json={'email':email,'password':'Training123!'})
    assert r.status_code==200
    return {'Authorization':'Bearer '+r.json()['access_token']}

def sample(**overrides):
    return {'date':'2026-04-30','customer':'Test customer','region':'Europe','product':'Test product','quantity':2,'unit_price':100,'discount':10,**overrides}

def enable(client,headers,**flags):
    payload={key:False for key in module.DEFECTS};payload.update(flags)
    assert client.put('/api/training/defects',headers=headers,json=payload).status_code==200

def test_auth_roles_and_logout(client):
    assert client.get('/api/sales').status_code==401
    assert client.post('/api/auth/login',json={'email':'admin@atlas.test','password':'wrong'}).status_code==401
    h=auth(client,'analyst@atlas.test')
    assert client.get('/api/auth/me',headers=h).json()['role']=='analyst'
    assert client.post('/api/sales',headers=h,json=sample()).status_code==403
    assert client.put('/api/training/defects',headers=h,json={key:True for key in module.DEFECTS}).status_code==403
    assert client.post('/api/training/reset',headers=h,json={'confirmation':'RESET TRAINING DATA'}).status_code==403
    assert client.post('/api/auth/logout',headers=h).status_code==204
    assert client.get('/api/auth/me',headers=h).status_code==401

def test_sales_lifecycle_and_persistence(client):
    h=auth(client)
    r=client.post('/api/sales',headers=h,json=sample());assert r.status_code==201
    ident=r.json()['id'];assert r.json()['revenue']==180
    assert client.get(f'/api/sales/{ident}',headers=h).json()['customer']=='Test customer'
    r=client.put(f'/api/sales/{ident}',headers=h,json=sample(discount=20));assert r.status_code==200
    assert client.get(f'/api/sales/{ident}',headers=h).json()['revenue']==160
    assert client.delete(f'/api/sales/{ident}',headers=h).status_code==204
    assert client.get(f'/api/sales/{ident}',headers=h).status_code==404
    assert client.delete(f'/api/sales/{ident}',headers=h).status_code==404

@pytest.mark.parametrize('changes',[{'quantity':0},{'quantity':1.5},{'quantity':True},{'unit_price':-1},{'discount':101},{'discount':-1},{'region':'Atlantis'},{'date':'bad-date'},{'customer':'   '},{'surprise':True}])
def test_sale_validation(client,changes):
    assert client.post('/api/sales',headers=auth(client),json=sample(**changes)).status_code==422

def test_filters_pagination_and_aggregation(client):
    h=auth(client)
    a=client.get('/api/sales?page=1&page_size=100',headers=h).json()
    b=client.get('/api/sales?page=2&page_size=100',headers=h).json()
    assert len(a['items'])==100 and len(b['items'])==20 and a['total']==120
    assert not {r['id'] for r in a['items']} & {r['id'] for r in b['items']}
    summary=client.get('/api/dashboard',headers=h).json()
    assert summary['orders']==120
    assert summary['revenue']==round(sum(r['revenue'] for r in a['items']+b['items']),2)
    assert summary['revenue']==sum(summary['by_region'].values())
    assert summary['revenue']==sum(r['revenue'] for r in summary['monthly'])
    filtered=client.get('/api/sales?region=Europe&start_date=2026-01-01&end_date=2026-01-01',headers=h).json()
    assert filtered['total']==1
    assert client.get('/api/sales?start_date=2026-04-01&end_date=2026-01-01',headers=h).status_code==422
    assert client.get('/api/sales?page=0',headers=h).status_code==422
    assert client.get('/api/sales?page_size=101',headers=h).status_code==422
    empty=client.get('/api/dashboard?start_date=2030-01-01',headers=h).json()
    assert empty['orders']==empty['revenue']==empty['average_order']==0

def test_report_workflow_permissions_and_export(client):
    analyst=auth(client,'analyst@atlas.test');admin=auth(client)
    payload={'name':'My Europe report','region':'Europe','start_date':'2026-01-01','end_date':'2026-01-31'}
    r=client.post('/api/reports',headers=analyst,json=payload);assert r.status_code==201
    ident=r.json()['id']
    assert client.get(f'/api/reports/{ident}',headers=analyst).json()['owner_id']==2
    assert client.put(f'/api/reports/{ident}',headers=analyst,json={**payload,'name':'Updated'}).status_code==200
    exported=client.get(f'/api/reports/{ident}/export',headers=analyst)
    assert exported.status_code==200
    rows=list(csv.DictReader(io.StringIO(exported.text)))
    expected=client.get('/api/sales?region=Europe&start_date=2026-01-01&end_date=2026-01-31&page_size=100',headers=analyst).json()['items']
    assert len(rows)==len(expected)>0
    assert [int(r['id']) for r in rows]==[r['id'] for r in expected]
    assert all(r['region']=='Europe' for r in rows)
    assert client.delete('/api/reports/1',headers=analyst).status_code==403
    assert client.put('/api/reports/1',headers=analyst,json=payload).status_code==403
    assert client.delete(f'/api/reports/{ident}',headers=analyst).status_code==204
    assert client.get(f'/api/reports/{ident}',headers=admin).status_code==404
    assert client.post('/api/reports',headers=analyst,json={**payload,'end_date':'2025-01-01'}).status_code==422

def test_controlled_defects_and_reset(client):
    admin=auth(client);analyst=auth(client,'analyst@atlas.test')
    clean=client.get('/api/dashboard',headers=admin).json()['revenue']
    assert client.get('/api/training',headers=admin).json()['mode']=='clean'
    enable(client,admin,exclude_end_date=True)
    assert client.get('/api/sales?start_date=2026-01-01&end_date=2026-01-01',headers=admin).json()['total']==0
    enable(client,admin,ignore_discounts=True)
    assert client.get('/api/dashboard',headers=admin).json()['revenue']>clean
    enable(client,admin,report_permissions=True)
    assert client.delete('/api/reports/1',headers=analyst).status_code==204
    assert client.post('/api/training/reset',headers=admin,json={'confirmation':'wrong'}).status_code==422
    assert client.post('/api/training/reset',headers=admin,json={'confirmation':'RESET TRAINING DATA'}).status_code==200
    assert client.get('/api/auth/me',headers=analyst).status_code==401
    admin=auth(client)
    assert client.get('/api/training',headers=admin).json()['mode']=='clean'
    assert client.get('/api/dashboard',headers=admin).json()['revenue']==clean
    assert len(client.get('/api/reports',headers=admin).json())==2

def test_csv_formula_escaping(client):
    h=auth(client)
    client.post('/api/sales',headers=h,json=sample(customer='=1+1'))
    report=client.post('/api/reports',headers=h,json={'name':'All'}).json()
    rows=list(csv.DictReader(io.StringIO(client.get(f"/api/reports/{report['id']}/export",headers=h).text)))
    assert any(r['customer']=="'=1+1" for r in rows)
