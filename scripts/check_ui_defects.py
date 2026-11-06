"""Verify every UI challenge in clean, enabled, and restored modes on a private DB.

Install backend/requirements-browser.txt. Run with the repository venv Python.
CHROMIUM_PATH optionally selects an existing Chromium executable.
"""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.request import Request, urlopen

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.defects import DEFECT_CATALOGUE


def run_check(page, key, enabled, api):
    """Check the real UI against its documented clean or intentional behavior."""
    def navigate(name):
        page.get_by_role('navigation').get_by_role('button', name=name, exact=True).click()
        expect(page.get_by_role('heading', name=name, exact=True)).to_be_visible()

    def query(action):
        with page.expect_response(lambda r: '/api/sales?' in r.url):
            action()
        expect(page.locator('.loading')).not_to_be_visible()

    if key == 'ui_region_ignored':
        query(lambda: page.get_by_label('Region', exact=True).select_option('Europe'))
        expect(page.get_by_test_id('sales-orders')).to_have_text('120' if enabled else '30')
        assert api('/sales?region=Europe')['total'] == 30
    elif key == 'ui_clear_keeps_region':
        query(lambda: page.get_by_label('Region', exact=True).select_option('Europe'))
        expect(page.get_by_test_id('sales-orders')).to_have_text('30')
        page.get_by_role('button', name='Clear', exact=True).click()
        expect(page.get_by_label('Region', exact=True)).to_have_value('Europe' if enabled else '')
        expect(page.get_by_test_id('sales-orders')).to_have_text('30' if enabled else '120')
    elif key == 'ui_next_page_stuck':
        navigate('Sales data')
        page.get_by_role('button', name='Next', exact=True).click()
        expect(page.locator('.pagination')).to_contain_text('Page 1' if enabled else 'Page 2')
        if enabled:
            # Verify after the event settles, not just against pre-click content.
            page.wait_for_timeout(150)
            expect(page.locator('tbody tr').first).to_contain_text('SL-0001')
        else:
            expect(page.locator('tbody tr').first).to_contain_text('SL-0011')
    elif key == 'ui_previous_page_stuck':
        navigate('Sales data')
        query(lambda: page.get_by_role('button', name='Next', exact=True).click())
        expect(page.locator('.pagination')).to_contain_text('Page 2')
        page.get_by_role('button', name='Previous', exact=True).click()
        expect(page.locator('.pagination')).to_contain_text('Page 2' if enabled else 'Page 1')
        if enabled: page.wait_for_timeout(150)
        expect(page.locator('tbody tr').first).to_contain_text('SL-0011' if enabled else 'SL-0001')
    elif key == 'ui_wrong_currency':
        expect(page.get_by_test_id('net-revenue')).to_have_text('€471,180' if enabled else '$471,180')
        assert api('/dashboard')['revenue'] == 471180
    elif key == 'ui_gross_sale_revenue':
        navigate('Sales data')
        expect(page.locator('tbody tr').nth(1).locator('td.numeric')).to_have_text('$1,780' if enabled else '$1,691')
        assert api('/sales/2')['revenue'] == 1691
    elif key == 'ui_report_cancel_saves':
        navigate('Reports')
        page.get_by_role('button', name='Create report', exact=True).click()
        page.get_by_label('Report name').fill('Cancelled report')
        dialog = page.get_by_role('dialog')
        dialog.get_by_role('button', name='Cancel', exact=True).click()
        expect(dialog).not_to_be_visible()
        matching = [r for r in api('/reports') if r['name'] == 'Cancelled report']
        assert bool(matching) == enabled
        if enabled: expect(page.get_by_role('heading', name='Cancelled report', exact=True)).to_be_visible()
        else: expect(page.get_by_role('heading', name='Cancelled report', exact=True)).not_to_be_visible()
    elif key == 'ui_report_edit_name_ignored':
        navigate('Reports')
        card = page.locator('section.report').filter(has_text='European growth overview')
        card.get_by_role('button', name='Edit', exact=True).click()
        page.get_by_label('Report name').fill('Renamed report')
        page.get_by_role('dialog').get_by_role('button', name='Save changes', exact=True).click()
        expect(page.get_by_role('dialog')).not_to_be_visible()
        name = 'European growth overview' if enabled else 'Renamed report'
        expect(page.get_by_role('heading', name=name, exact=True)).to_be_visible()
        assert api('/reports/1')['name'] == name
    elif key == 'ui_delete_cancel_deletes':
        navigate('Reports')
        page.get_by_role('button', name='Delete European growth overview', exact=True).click()
        page.get_by_role('dialog').get_by_role('button', name='Cancel', exact=True).click()
        expect(page.get_by_role('dialog')).not_to_be_visible()
        records = api('/reports')
        assert any(r['id'] == 1 for r in records) != enabled
        heading = page.get_by_role('heading', name='European growth overview', exact=True)
        if enabled: expect(heading).not_to_be_visible()
        else: expect(heading).to_be_visible()
    elif key == 'ui_mobile_export_hidden':
        navigate('Reports')
        export = page.get_by_role('button', name='Export CSV', exact=True).first
        expect(export).to_be_visible()
        page.set_viewport_size({'width': 390, 'height': 844})
        if enabled: expect(export).not_to_be_visible()
        else: expect(export).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    else:
        raise AssertionError(f'No check for {key}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--python', default=sys.executable, help='Python with backend requirements installed')
    args = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix='atlas-ui-check-') as tmp:
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        token = ''

        def api(path, method='GET', body=None):
            request = Request(base+'/api'+path, method=method,
                              data=json.dumps(body).encode() if body is not None else None,
                              headers={'Content-Type': 'application/json', 'Authorization': 'Bearer '+token})
            with urlopen(request, timeout=10) as response:
                payload = response.read()
                return json.loads(payload) if payload else None

        with open(Path(tmp)/'server.log', 'w+') as log:
            server = subprocess.Popen([args.python, '-m', 'uvicorn', 'backend.app:app', '--host', '127.0.0.1', '--port', str(port)],
                                      cwd=ROOT, env={**os.environ, 'ATLAS_DB_PATH': str(Path(tmp)/'private.sqlite3')}, stdout=log, stderr=log)
            try:
                for _ in range(100):
                    try:
                        api('/health')
                        break
                    except OSError:
                        if server.poll() is not None: raise RuntimeError('Test server exited')
                        time.sleep(.1)
                else: raise RuntimeError('Test server did not become ready')
                token = api('/auth/login', 'POST', {'email': 'admin@atlas.test', 'password': 'Training123!'})['access_token']
                with sync_playwright() as p:
                    options = {'headless': True}
                    if os.environ.get('CHROMIUM_PATH'):
                        options['executable_path'] = os.environ['CHROMIUM_PATH']
                    browser = p.chromium.launch(**options)
                    for item in (x for x in DEFECT_CATALOGUE if x['area'] == 'UI'):
                        for phase, enabled in [('clean', False), ('enabled', True), ('restored', False)]:
                            api('/training/reset', 'POST', {'confirmation': 'RESET TRAINING DATA'})
                            token = api('/auth/login', 'POST', {'email': 'admin@atlas.test', 'password': 'Training123!'})['access_token']
                            api('/training/defects', 'PUT', {item['key']: enabled})
                            context = browser.new_context(viewport={'width': 1440, 'height': 1000})
                            page = context.new_page()
                            errors = []
                            page.on('pageerror', lambda e: errors.append(str(e)))
                            page.goto(base)
                            page.get_by_role('button', name='Use administrator account', exact=True).click()
                            page.get_by_role('button', name='Sign in to workspace', exact=True).click()
                            expect(page.get_by_test_id('sales-orders')).to_have_text('120')
                            expect(page.locator('.loading')).not_to_be_visible()
                            run_check(page, item['key'], enabled, api)
                            assert not errors, errors
                            context.close()
                            print(f"PASS {item['id']} {phase}", flush=True)
                    # The instructor screen exposes all twenty independent controls.
                    context = browser.new_context()
                    page = context.new_page(); page.goto(base)
                    page.get_by_role('button', name='Use administrator account', exact=True).click()
                    page.get_by_role('button', name='Sign in to workspace', exact=True).click()
                    page.get_by_role('navigation').get_by_role('button', name='Instructor lab').click()
                    expect(page.get_by_role('switch')).to_have_count(20)
                    switch = page.get_by_role('switch', name='The repeated record', exact=True)
                    switch.click()
                    expect(switch).to_have_attribute('aria-checked', 'true')
                    assert api('/training')['defects']['pagination_overlap']
                    switch.click()
                    expect(switch).to_have_attribute('aria-checked', 'false')
                    print('PASS instructor catalogue and toggle persistence', flush=True)
                    browser.close()
            except Exception:
                log.flush(); log.seek(0); print(log.read(), file=sys.stderr)
                raise
            finally:
                server.terminate()
                server.wait(timeout=10)

if __name__ == '__main__':
    main()
