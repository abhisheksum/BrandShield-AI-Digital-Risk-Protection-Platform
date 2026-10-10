import os
import tempfile
import importlib
from unittest.mock import AsyncMock, patch
from io import BytesIO
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

_db_file=tempfile.NamedTemporaryFile(prefix="brandshield-tests-",suffix=".db",delete=False)
_db_file.close()
os.environ["DATABASE_URL"]="sqlite:///"+_db_file.name.replace("\\","/")
import app.db as database
database.DATABASE_URL=os.environ["DATABASE_URL"]
database.engine.dispose()
database.engine=database.create_engine(database.DATABASE_URL,connect_args={"check_same_thread":False})
database.SessionLocal=database.sessionmaker(bind=database.engine,expire_on_commit=False)
import app.main as application
importlib.reload(application)
app=application.app

def test_demo_and_arbitrary_brand_scans_and_rescan_dedup():
    with TestClient(app) as c:
        brands=c.get('/api/brands').json()
        demo=next(b for b in brands if b['demo'])
        result=c.post(f"/api/brands/{demo['id']}/demo").json()
        assert result['social']['scanned'] == 11 and result['apps']['scanned'] == 11
        assert result['social']['official'] == 1 and result['apps']['official'] == 1
        made=c.post('/api/brands',json={'name':'Arbitrary Evaluator Brand','aliases':['Evaluator']})
        assert made.status_code == 201
        bid=made.json()['id']
        assert c.post(f'/api/brands/{bid}/scans/social').json()['scanned'] == 10
        assert c.post(f'/api/brands/{bid}/scans/apps').json()['scanned'] == 10
        before=c.get('/api/findings',params={'brand_id':bid}).json()
        c.post(f'/api/brands/{bid}/scans/social')
        after=c.get('/api/findings',params={'brand_id':bid}).json()
        assert len(before)==20 and len(after)==20
        dashboard=c.get('/api/dashboard',params={'brand_id':bid}).json()
        assert dashboard['social_scanned']==10 and dashboard['apps_scanned']==10

def test_input_validation_and_health():
    with TestClient(app) as c:
        assert c.get('/api/health').json()['status']=='ok'
        assert c.post('/api/brands',json={'name':''}).status_code==422
        assert c.post('/api/brands/1/assets',json={'kind':'social','url':'file:///etc/passwd'}).status_code==422

def test_review_status_is_persisted():
    with TestClient(app) as c:
        bid=c.get('/api/brands').json()[0]['id']
        c.post(f'/api/brands/{bid}/scans/social')
        rows=c.get('/api/findings',params={'brand_id':bid}).json()
        fid=rows[0]['id']
        assert c.patch(f'/api/findings/{fid}/review',json={'status':'investigating'}).status_code==200
        assert c.get(f'/api/findings/{fid}').json()['review_status']=='investigating'
        c.post(f'/api/brands/{bid}/scans/social')
        assert c.get(f'/api/findings/{fid}').json()['review_status']=='investigating'
        assert c.patch(f'/api/findings/{fid}/review',json={'status':'bad-state'}).status_code==422

def test_assets_can_be_updated_and_are_included_in_official_exclusion():
    with TestClient(app) as c:
        brand=c.post('/api/brands',json={'name':'Asset Update Brand'}).json()
        asset=c.post(f"/api/brands/{brand['id']}/assets",json={'kind':'social','platform':'Mastodon','handle':'assetupdate'}).json()
        changed=c.put(f"/api/assets/{asset['id']}",json={'platform':'Mastodon','handle':'assetupdate','url':'https://social.example/@assetupdate'}).json()
        assert changed['url']=='https://social.example/@assetupdate'
        assert c.put(f"/api/assets/{asset['id']}",json={'url':'file:///etc/passwd'}).status_code==422
        scan=c.post(f"/api/brands/{brand['id']}/scans/social").json()
        assert scan['official']==1

def test_logo_upload_validates_and_serves_image():
    with TestClient(app) as c:
        brand=c.post('/api/brands',json={'name':'Logo Upload Brand'}).json()
        buf=BytesIO()
        Image.new('RGB',(12,12),(20,80,130)).save(buf,format='PNG')
        uploaded=c.post(f"/api/brands/{brand['id']}/logo",files={'file':('logo.png',buf.getvalue(),'image/png')})
        assert uploaded.status_code==200
        assert c.get(uploaded.json()['logo_url']).status_code==200
        invalid=c.post(f"/api/brands/{brand['id']}/logo",files={'file':('bad.png',b'not an image','image/png')})
        assert invalid.status_code==422
        Path('uploads',Path(uploaded.json()['logo_url']).name).unlink(missing_ok=True)

def test_live_source_failure_is_reported_without_breaking_synthetic_scan():
    with TestClient(app) as c:
        brand=c.post('/api/brands',json={'name':'Source Failure Brand'}).json()
        with patch('app.main.itunes_search',new_callable=AsyncMock,return_value={'status':'unavailable','records':[],'source':'Apple iTunes Search API','error':'simulated timeout'}):
            response=c.post(f"/api/brands/{brand['id']}/scans/apps?live=true")
        assert response.status_code==201
        result=response.json()
        assert result['scanned']==10
        assert result['source_status']['itunes']['status']=='unavailable'
