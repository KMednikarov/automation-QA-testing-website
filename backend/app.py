"""Atlas: deterministic data and controlled defects for API/UI training."""
import csv
import hashlib
import hmac
import io
import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, model_validator, create_model

DB_PATH = os.environ.get('ATLAS_DB_PATH', str(Path(__file__).with_name('atlas.sqlite3')))
from backend.defects import DEFECTS, DEFECT_CATALOGUE

app = FastAPI(title='Atlas Training API', version='1.0.0', description='Sales analytics for UI and API testing. Training-only accounts and synthetic data. See /api/training for the active defect settings.')
security = HTTPBearer(auto_error=False)

@contextmanager
def db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

def password_hash(password, salt):
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100_000).hex()

def seed(c):
    for table in ('sessions', 'reports', 'sales', 'users', 'settings'):
        c.execute(f'DELETE FROM {table}')
    for ident, name, email, role in [(1,'Alex Morgan','admin@atlas.test','admin'),(2,'Sam Taylor','analyst@atlas.test','analyst'),(3,'Jordan Lee','jordan@atlas.test','analyst')]:
        salt = secrets.token_hex(16)
        c.execute('INSERT INTO users VALUES (?,?,?,?,?,?)',(ident,name,email,role,salt,password_hash('Training123!',salt)))
    regions = ['Europe','North America','Asia Pacific','Latin America']
    products = [('Cloud platform',1490),('Data pipeline',890),('Analytics suite',1190),('Managed storage',490)]
    for i in range(120):
        product, price = products[i % 4]
        c.execute('INSERT INTO sales (id,date,customer,region,product,quantity,unit_price,discount) VALUES (?,?,?,?,?,?,?,?)',
            (i+1,(date(2026,1,1)+timedelta(days=i)).isoformat(),['Meridian Labs','Northstar Co.','Vertex Systems','Pioneer Group','Helix Digital'][i%5],regions[(i//3)%4],product,1+i%8,price,(i%4)*5))
    c.execute("INSERT INTO reports (id,name,region,start_date,end_date,owner_id,created_at) VALUES (1,'European growth overview','Europe','2026-01-01','2026-04-30',1,'2026-05-01T09:00:00Z')")
    c.execute("INSERT INTO reports (id,name,region,start_date,end_date,owner_id,created_at) VALUES (2,'Q1 sales performance',NULL,'2026-01-01','2026-03-31',2,'2026-05-01T10:30:00Z')")
    for key in DEFECTS:
        c.execute('INSERT INTO settings VALUES (?,0)',(key,))

def initialize():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with db() as c:
        c.executescript('''
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sales (id INTEGER PRIMARY KEY,date TEXT NOT NULL,customer TEXT NOT NULL,region TEXT NOT NULL,product TEXT NOT NULL,quantity INTEGER NOT NULL,unit_price REAL NOT NULL,discount REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY,name TEXT NOT NULL,region TEXT,start_date TEXT,end_date TEXT,owner_id INTEGER REFERENCES users(id),created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY,enabled INTEGER NOT NULL);
        ''')
        if not c.execute('SELECT 1 FROM users').fetchone():
            seed(c)
        # Add newly introduced flags without changing existing data or settings.
        c.executemany('INSERT OR IGNORE INTO settings VALUES (?,0)', [(key,) for key in DEFECTS])

initialize()

def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if not credentials:
        raise HTTPException(401,'Sign in to continue', headers={'WWW-Authenticate':'Bearer'})
    with db() as c:
        row = c.execute('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>?',(credentials.credentials,datetime.now(timezone.utc).isoformat())).fetchone()
    if not row:
        raise HTTPException(401,'Session expired or invalid', headers={'WWW-Authenticate':'Bearer'})
    return dict(row)

def admin(user=Depends(current_user)):
    if user['role'] != 'admin':
        raise HTTPException(403,'Administrator access required')
    return user

class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid')

class Login(StrictModel):
    email: str
    password: str

@app.get('/api/health',tags=['System'])
def health():
    with db() as c:
        c.execute('SELECT 1').fetchone()
    return {'status':'ok'}

@app.post('/api/auth/login',tags=['Authentication'])
def login(data: Login):
    with db() as c:
        user = c.execute('SELECT * FROM users WHERE email=?',(data.email.lower().strip(),)).fetchone()
        if not user or not hmac.compare_digest(user['password_hash'],password_hash(data.password,user['salt'])):
            raise HTTPException(401,'Incorrect email or password')
        token = secrets.token_urlsafe(32)
        c.execute('INSERT INTO sessions VALUES (?,?,?)',(token,user['id'],(datetime.now(timezone.utc)+timedelta(hours=12)).isoformat()))
    return {'access_token':token,'token_type':'bearer','user':{k:user[k] for k in ('id','name','email','role')}}

@app.get('/api/auth/me',tags=['Authentication'])
def me(user=Depends(current_user)):
    return user

@app.post('/api/auth/logout',status_code=204,tags=['Authentication'])
def logout(credentials=Depends(security),user=Depends(current_user)):
    with db() as c:
        c.execute('DELETE FROM sessions WHERE token=?',(credentials.credentials,))
    return Response(status_code=204)

Region = Literal['Europe','North America','Asia Pacific','Latin America']

class Filters(StrictModel):
    region: Region | None = None
    start_date: date | None = None
    end_date: date | None = None
    @model_validator(mode='after')
    def ordered_dates(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError('Start date must not follow end date')
        return self

def filters(region: Region | None = None,start_date: date | None = None,end_date: date | None = None):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(422,'Start date must not follow end date')
    return Filters(region=region,start_date=start_date,end_date=end_date)

def settings(c):
    return {r['name']:bool(r['enabled']) for r in c.execute('SELECT * FROM settings')}

def select_sales(c, f):
    clauses, values = [], []
    if f.region:
        clauses.append('region=?'); values.append(f.region)
    if f.start_date:
        clauses.append('date>=?'); values.append(f.start_date.isoformat())
    if f.end_date:
        clauses.append('date'+ ('<' if settings(c)['exclude_end_date'] else '<=')+'?'); values.append(f.end_date.isoformat())
    return [dict(r) for r in c.execute('SELECT * FROM sales'+(' WHERE '+' AND '.join(clauses) if clauses else '')+' ORDER BY date,id', values)]

def net(row):
    return round(row['quantity']*row['unit_price']*(1-row['discount']/100),2)

def enrich(row):
    return {**row,'revenue':net(row)}

@app.get('/api/sales',tags=['Sales'])
def sales(f: Filters=Depends(filters), page:int=Query(1,ge=1), page_size:int=Query(10,ge=1,le=100),user=Depends(current_user)):
    with db() as c:
        rows = select_sales(c,f)
        flags = settings(c)
        total = c.execute('SELECT COUNT(*) FROM sales').fetchone()[0] if flags['wrong_filtered_total'] else len(rows)
    offset = (page-1)*page_size
    if flags['pagination_overlap'] and page > 1:
        offset -= 1
    return {'items':[enrich(r) for r in rows[offset:offset+page_size]],'total':total,'page':page,'page_size':page_size}

class SaleInput(StrictModel):
    date: date
    customer: str = Field(min_length=1,max_length=100, pattern=r'.*\S.*')
    region: Region
    product: str = Field(min_length=1,max_length=100, pattern=r'.*\S.*')
    quantity: int = Field(ge=1,le=10000,strict=True)
    unit_price: float = Field(gt=0,le=1000000,allow_inf_nan=False)
    discount: float = Field(default=0,ge=0,le=100,allow_inf_nan=False)

@app.post('/api/sales',status_code=201,tags=['Sales'])
def create_sale(data: SaleInput,user=Depends(admin)):
    with db() as c:
        cursor = c.execute('INSERT INTO sales (date,customer,region,product,quantity,unit_price,discount) VALUES (?,?,?,?,?,?,?)',tuple(data.model_dump(mode='json').values()))
        return enrich(dict(c.execute('SELECT * FROM sales WHERE id=?',(cursor.lastrowid,)).fetchone()))

@app.get('/api/sales/{sale_id}',tags=['Sales'])
def get_sale(sale_id:int,user=Depends(current_user)):
    with db() as c:
        row=c.execute('SELECT * FROM sales WHERE id=?',(sale_id,)).fetchone()
    if not row:
        with db() as c:
            if settings(c)['missing_sale_success']: return {}
        raise HTTPException(404,'Sale not found')
    return enrich(dict(row))

@app.put('/api/sales/{sale_id}',tags=['Sales'])
def update_sale(sale_id:int,data:SaleInput,user=Depends(admin)):
    with db() as c:
        if settings(c)['sale_update_ignored_discount']:
            old = c.execute('SELECT discount FROM sales WHERE id=?', (sale_id,)).fetchone()
            if old: data = data.model_copy(update={'discount': old['discount']})
        result=c.execute('UPDATE sales SET date=?,customer=?,region=?,product=?,quantity=?,unit_price=?,discount=? WHERE id=?',(*data.model_dump(mode='json').values(),sale_id))
        if not result.rowcount: raise HTTPException(404,'Sale not found')
        return enrich(dict(c.execute('SELECT * FROM sales WHERE id=?',(sale_id,)).fetchone()))

@app.delete('/api/sales/{sale_id}',status_code=204,tags=['Sales'])
def delete_sale(sale_id:int,user=Depends(admin)):
    with db() as c:
        if not c.execute('DELETE FROM sales WHERE id=?',(sale_id,)).rowcount: raise HTTPException(404,'Sale not found')
    return Response(status_code=204)

@app.get('/api/dashboard',tags=['Analytics'])
def dashboard(f:Filters=Depends(filters),user=Depends(current_user)):
    with db() as c:
        rows=select_sales(c,f)
        flags=settings(c)
        buggy=flags['ignore_discounts']
    revenue=lambda r: r['quantity']*r['unit_price'] if buggy else net(r)
    by_region={r:round(sum(revenue(x) for x in rows if x['region']==r),2) for r in ('Europe','North America','Asia Pacific','Latin America')}
    months=sorted(set(r['date'][:7] for r in rows))
    total=round(sum(revenue(r) for r in rows),2)
    return {'revenue':total,'orders':len(rows),'customers':len(rows) if flags['customer_count_orders'] else len(set(r['customer'] for r in rows)),'average_order':round(total/len(rows),2) if rows else 0,'by_region':by_region,'monthly':[{'month':m,'revenue':round(sum(revenue(r) for r in rows if r['date'].startswith(m)),2)} for m in months]}

class ReportInput(Filters):
    name: str = Field(min_length=1,max_length=100,pattern=r'.*\S.*')

def report_row(c,report_id):
    r=c.execute('SELECT r.*,u.name AS owner FROM reports r JOIN users u ON u.id=r.owner_id WHERE r.id=?',(report_id,)).fetchone()
    if not r: raise HTTPException(404,'Report not found')
    return dict(r)

def can_edit(c,r,user):
    if user['role']!='admin' and r['owner_id']!=user['id']:
        raise HTTPException(403,'You can only modify your own reports')

@app.get('/api/reports',tags=['Reports'])
def reports(user=Depends(current_user)):
    with db() as c:
        return [dict(r) for r in c.execute('SELECT r.*,u.name AS owner FROM reports r JOIN users u ON u.id=r.owner_id ORDER BY r.id DESC')]

@app.post('/api/reports',status_code=201,tags=['Reports'])
def create_report(data:ReportInput,response:Response,user=Depends(current_user)):
    with db() as c:
        if settings(c)['report_create_wrong_status']: response.status_code = 200
        cursor=c.execute('INSERT INTO reports (name,region,start_date,end_date,owner_id,created_at) VALUES (?,?,?,?,?,?)',(data.name,data.region,str(data.start_date) if data.start_date else None,str(data.end_date) if data.end_date else None,user['id'],datetime.now(timezone.utc).isoformat()))
        return report_row(c,cursor.lastrowid)

@app.get('/api/reports/{report_id}',tags=['Reports'])
def get_report(report_id:int,user=Depends(current_user)):
    with db() as c: return report_row(c,report_id)

@app.put('/api/reports/{report_id}',tags=['Reports'])
def update_report(report_id:int,data:ReportInput,user=Depends(current_user)):
    with db() as c:
        r=report_row(c,report_id); can_edit(c,r,user)
        c.execute('UPDATE reports SET name=?,region=?,start_date=?,end_date=? WHERE id=?',(data.name,data.region,str(data.start_date) if data.start_date else None,str(data.end_date) if data.end_date else None,report_id))
        return report_row(c,report_id)

@app.delete('/api/reports/{report_id}',status_code=204,tags=['Reports'])
def delete_report(report_id:int,user=Depends(current_user)):
    with db() as c:
        r=report_row(c,report_id)
        if not settings(c)['report_permissions']: can_edit(c,r,user)
        c.execute('DELETE FROM reports WHERE id=?',(report_id,))
    return Response(status_code=204)

@app.get('/api/reports/{report_id}/export',tags=['Reports'])
def export_report(report_id:int,user=Depends(current_user)):
    with db() as c:
        r=report_row(c,report_id)
        region = None if settings(c)['export_ignores_region'] else r['region']
        rows=select_sales(c,Filters(region=region,start_date=r['start_date'],end_date=r['end_date']))
    output=io.StringIO(); writer=csv.writer(output)
    writer.writerow(['id','date','customer','region','product','quantity','unit_price','discount','revenue'])
    for row in rows:
        # Prevent spreadsheet formula execution when trainees enter customer/product data.
        writer.writerow([("'"+str(v) if isinstance(v,str) and v.startswith(('=','+','-','@','\t','\r')) else v) for v in enrich(row).values()])
    return Response(output.getvalue(),media_type='text/csv',headers={'Content-Disposition':f'attachment; filename="atlas-report-{report_id}.csv"'})

@app.get('/api/training',tags=['Training'])
def training(user=Depends(current_user)):
    with db() as c: flags=settings(c)
    return {'mode':'training' if any(flags.values()) else 'clean','defects':flags,'catalogue':DEFECT_CATALOGUE}

# Supplied fields are updated; omitted fields retain their saved values.
# This keeps older clients sending just the original three flags compatible.
DefectSettings = create_model('DefectSettings', __base__=StrictModel, **{key: (bool, False) for key in DEFECTS})

@app.put('/api/training/defects',tags=['Training'])
def set_defects(data:DefectSettings,user=Depends(admin)):
    with db() as c:
        for k,v in data.model_dump(exclude_unset=True).items(): c.execute('UPDATE settings SET enabled=? WHERE name=?',(int(v),k))
    with db() as c: return {'defects':settings(c)}

class ResetInput(StrictModel):
    confirmation: Literal['RESET TRAINING DATA']

@app.post('/api/training/reset',tags=['Training'])
def reset(data:ResetInput,user=Depends(admin)):
    with db() as c: seed(c)
    return {'message':'Restored 120 sales, 2 reports, and clean mode. All sessions were revoked. Please sign in again.'}

DIST=Path(__file__).resolve().parents[1]/'frontend'/'dist'
if DIST.exists():
    app.mount('/assets',StaticFiles(directory=DIST/'assets'),name='assets')
    @app.get('/',include_in_schema=False)
    def index(): return FileResponse(DIST/'index.html')
