from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db import SessionLocal, init_db
from app.models import Brand, OfficialAsset, Scan, Candidate, Finding
from app.schemas import BrandIn, BrandUpdate, AssetIn, AssetUpdate, ReviewUpdate
from app.detection import evaluate
from app.sources import synthetic_candidates, itunes_search

@asynccontextmanager
async def lifespan(_app):
    init_db()
    with SessionLocal() as db:
        if db.scalar(select(Brand.id).limit(1)) is None:
            b=Brand(name="Kampus.VC", description="Demo venture platform", industry="Venture Capital", website="https://kampus.vc", aliases=["Kampus VC"], demo=True)
            db.add(b); db.flush()
            db.add_all([OfficialAsset(brand_id=b.id,kind="social",platform="Instagram",handle="kampus.vc",url="https://www.instagram.com/kampus.vc"),OfficialAsset(brand_id=b.id,kind="app",platform="Apple App Store",name="Kampus VC",identifier="vc.kampus.app",url="https://apps.apple.com/app/id000000001",publisher="Kampus VC")])
            db.commit()
    yield

app = FastAPI(title="BrandShield API", description="Evidence-first digital risk protection MVP", version="0.1.0", lifespan=lifespan)

from pathlib import Path
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

def get_db():
    db=SessionLocal()
    try: yield db
    finally: db.close()

@app.exception_handler(ValueError)
async def value_error(_, exc): return JSONResponse(status_code=422,content={"detail":str(exc)})

@app.get("/api/health")
def health(db: Session=Depends(get_db)):
    db.execute(select(Brand.id).limit(1)).first()
    return {"status":"ok","database":"connected","service":"BrandShield API"}

@app.get("/api/brands")
def brands(db: Session=Depends(get_db)):
    return [brand_dict(b) for b in db.scalars(select(Brand).order_by(Brand.id)).all()]

def brand_dict(b):
    return {"id":b.id,"name":b.name,"description":b.description,"industry":b.industry,"website":b.website,"logo_url":f"/uploads/{Path(b.logo_path).name}" if b.logo_path else "","aliases":b.aliases or [],"demo":b.demo,"assets":[asset_dict(a) for a in b.assets]}
def asset_dict(a): return {"id":a.id,"kind":a.kind,"platform":a.platform,"name":a.name,"handle":a.handle,"url":a.url,"identifier":a.identifier,"publisher":a.publisher,"status":"Declared by organization"}
def get_brand(db,id):
    b=db.get(Brand,id)
    if not b: raise HTTPException(404,"Brand not found")
    return b

@app.post("/api/brands",status_code=201)
def create_brand(data: BrandIn,db: Session=Depends(get_db)):
    b=Brand(**data.model_dump(),demo=False); db.add(b); db.commit(); db.refresh(b); return brand_dict(b)

@app.get("/api/brands/{brand_id}")
def get_brand_api(brand_id:int,db:Session=Depends(get_db)): return brand_dict(get_brand(db,brand_id))

@app.put("/api/brands/{brand_id}")
def update_brand(brand_id:int,data:BrandUpdate,db:Session=Depends(get_db)):
    b=get_brand(db,brand_id)
    for k,v in data.model_dump().items(): setattr(b,k,v)
    db.commit(); db.refresh(b); return brand_dict(b)

@app.post("/api/brands/{brand_id}/logo")
async def upload_logo(brand_id:int,file:UploadFile=File(...),db:Session=Depends(get_db)):
    b=get_brand(db,brand_id)
    if file.content_type not in {"image/png","image/jpeg","image/webp"}:
        raise HTTPException(415,"Upload a PNG, JPEG, or WebP image")
    payload=await file.read(5*1024*1024+1)
    if len(payload)>5*1024*1024: raise HTTPException(413,"Logo must be 5 MB or smaller")
    try:
        from io import BytesIO
        from PIL import Image
        with Image.open(BytesIO(payload)) as img:
            img.verify()
            fmt=img.format
    except Exception: raise HTTPException(422,"Image is invalid or corrupted")
    ext={"PNG":"png","JPEG":"jpg","WEBP":"webp"}.get(fmt)
    if not ext: raise HTTPException(415,"Upload a PNG, JPEG, or WebP image")
    UPLOAD_DIR.mkdir(exist_ok=True)
    target=UPLOAD_DIR/f"brand-{b.id}.{ext}"
    target.write_bytes(payload)
    b.logo_path=str(target); db.commit(); db.refresh(b)
    return {"brand_id":b.id,"logo_url":f"/uploads/{target.name}"}

@app.post("/api/brands/{brand_id}/assets",status_code=201)
def add_asset(brand_id:int,data:AssetIn,db:Session=Depends(get_db)):
    get_brand(db,brand_id); a=OfficialAsset(brand_id=brand_id,**data.model_dump()); db.add(a); db.commit(); db.refresh(a); return asset_dict(a)

@app.put("/api/assets/{asset_id}")
def update_asset(asset_id:int,data:AssetUpdate,db:Session=Depends(get_db)):
    a=db.get(OfficialAsset,asset_id)
    if not a: raise HTTPException(404,"Asset not found")
    for key,value in data.model_dump(exclude_unset=True).items(): setattr(a,key,value)
    db.commit(); db.refresh(a); return asset_dict(a)

@app.delete("/api/assets/{asset_id}",status_code=204)
def delete_asset(asset_id:int,db:Session=Depends(get_db)):
    a=db.get(OfficialAsset,asset_id)
    if not a: raise HTTPException(404,"Asset not found")
    db.delete(a); db.commit()

@app.post("/api/brands/{brand_id}/demo",status_code=201)
def load_demo(brand_id:int,db:Session=Depends(get_db)):
    b=get_brand(db,brand_id)
    if not b.demo: raise HTTPException(400,"Demo data can only be run for the seeded demo brand")
    social=synthetic_candidates(b,"social"); apps=synthetic_candidates(b,"app")
    social.extend(official_candidate(b,a) for a in b.assets if a.kind=="social")
    apps.extend(official_candidate(b,a) for a in b.assets if a.kind=="app")
    return {"brand":brand_dict(b),"social":run_scan(db,b,"social",social,{"synthetic":{"status":"available","source":"BrandShield deterministic demo adapter"}}),"apps":run_scan(db,b,"app",apps,{"synthetic":{"status":"available","source":"BrandShield deterministic demo adapter"}})}

@app.post("/api/demo/load",status_code=201)
def load_demo_brand(db:Session=Depends(get_db)):
    b=db.scalar(select(Brand).where(Brand.demo==True).limit(1))  # noqa: E712
    if b is None:
        b=Brand(name="Kampus.VC",description="Demo venture platform",industry="Venture Capital",website="https://kampus.vc",aliases=["Kampus VC"],demo=True)
        db.add(b); db.flush()
        db.add_all([OfficialAsset(brand_id=b.id,kind="social",platform="Instagram",handle="kampus.vc",url="https://www.instagram.com/kampus.vc"),OfficialAsset(brand_id=b.id,kind="app",platform="Apple App Store",name="Kampus VC",identifier="vc.kampus.app",url="https://apps.apple.com/app/id000000001",publisher="Kampus VC")])
        db.commit(); db.refresh(b)
    social=synthetic_candidates(b,"social"); apps=synthetic_candidates(b,"app")
    social.extend(official_candidate(b,a) for a in b.assets if a.kind=="social")
    apps.extend(official_candidate(b,a) for a in b.assets if a.kind=="app")
    return {"brand":brand_dict(b),"social":run_scan(db,b,"social",social,{"synthetic":{"status":"available","source":"BrandShield deterministic demo adapter"}}),"apps":run_scan(db,b,"app",apps,{"synthetic":{"status":"available","source":"BrandShield deterministic demo adapter"}})}

def official_candidate(b,a):
    return {"kind":a.kind,"stable_id":f"declared:{a.kind}:{a.id}","platform":a.platform,"name":a.name or b.name,"handle":a.handle,"url":a.url,"identifier":a.identifier,"publisher":a.publisher,"description":b.description,"source_type":"imported","source_name":"Organization-declared official asset","retrieved_at":None}

def run_scan(db,b,kind,records,source_status):
    scan=Scan(brand_id=b.id,kind=kind,status="completed",source_status=source_status); db.add(scan); db.flush()
    counts={"scanned":0,"flagged":0,"official":0,"not_flagged":0}
    for record in records:
        row=db.scalar(select(Candidate).where(Candidate.brand_id==b.id,Candidate.kind==kind,Candidate.stable_id==record["stable_id"]))
        if row is None:
            fields={k:v for k,v in record.items() if k in {"kind","stable_id","platform","name","handle","url","identifier","publisher","description","source_type","source_name","retrieved_at"}}
            row=Candidate(brand_id=b.id,**fields); db.add(row); db.flush()
        else:
            for key in ("platform","name","handle","url","identifier","publisher","description","source_type","source_name","retrieved_at"):
                if key in record: setattr(row,key,record[key])
        result=evaluate(b,record,[*b.assets]); f=db.scalar(select(Finding).where(Finding.candidate_id==row.id).order_by(Finding.id.desc()).limit(1))
        if f is None: f=Finding(candidate_id=row.id,review_status="open")
        f.scan_id=scan.id
        for key,value in result.items(): setattr(f,key,value)
        db.add(f); counts["scanned"]+=1; counts["flagged"]+=int(result["flagged"]); counts["official"]+=int(result["official_match"]); counts["not_flagged"]+=int(not result["flagged"] and not result["official_match"])
    db.commit()
    return {"scan_id":scan.id,"brand_id":b.id,"kind":kind,"status":scan.status,"source_status":source_status,**counts}

@app.post("/api/brands/{brand_id}/scans/social",status_code=201)
def social_scan(brand_id:int,db:Session=Depends(get_db)):
    b=get_brand(db,brand_id); records=synthetic_candidates(b,"social")
    records.extend(official_candidate(b,a) for a in b.assets if a.kind=="social")
    return run_scan(db,b,"social",records,{"synthetic":{"status":"available","source":"BrandShield deterministic demo adapter","limitations":"Synthetic records only; no live social API configured."}})

@app.post("/api/brands/{brand_id}/scans/apps",status_code=201)
async def app_scan(brand_id:int,live:bool=Query(False),db:Session=Depends(get_db)):
    b=get_brand(db,brand_id); records=synthetic_candidates(b,"app")
    records.extend(official_candidate(b,a) for a in b.assets if a.kind=="app")
    statuses={"synthetic":{"status":"available","source":"BrandShield deterministic demo adapter"}}
    if live:
        source=await itunes_search(b.name)
        statuses["itunes"]={k:v for k,v in source.items() if k!="records"}
        records.extend(source["records"])
    return run_scan(db,b,"app",records,statuses)

@app.get("/api/scans/{scan_id}")
def scan_status(scan_id:int,db:Session=Depends(get_db)):
    s=db.get(Scan,scan_id)
    if not s: raise HTTPException(404,"Scan not found")
    return {"id":s.id,"brand_id":s.brand_id,"kind":s.kind,"status":s.status,"source_status":s.source_status,"created_at":s.created_at}

def finding_dict(f,db):
    c=db.get(Candidate,f.candidate_id)
    return {"id":f.id,"scan_id":f.scan_id,"candidate_id":c.id,"kind":c.kind,"name":c.name,"platform":c.platform,"handle":c.handle,"url":c.url,"identifier":c.identifier,"publisher":c.publisher,"description":c.description,"source_type":c.source_type,"source_name":c.source_name,"retrieved_at":c.retrieved_at,"official_match":f.official_match,"flagged":f.flagged,"score":f.score,"severity":f.severity,"reasons":f.reasons,"evidence":f.evidence,"review_status":f.review_status}

@app.get("/api/findings")
def findings(brand_id:int|None=None,kind:str|None=None,flagged:bool|None=None,db:Session=Depends(get_db)):
    q=select(Finding).join(Scan).join(Candidate)
    if brand_id is not None: q=q.where(Scan.brand_id==brand_id)
    if kind: q=q.where(Candidate.kind==kind)
    if flagged is not None: q=q.where(Finding.flagged==flagged)
    return [finding_dict(f,db) for f in db.scalars(q.order_by(Finding.id.desc())).all()]

@app.get("/api/findings/{finding_id}")
def get_finding(finding_id:int,db:Session=Depends(get_db)):
    f=db.get(Finding,finding_id)
    if not f: raise HTTPException(404,"Finding not found")
    return finding_dict(f,db)

@app.patch("/api/findings/{finding_id}/review")
def review(finding_id:int,data:ReviewUpdate,db:Session=Depends(get_db)):
    f=db.get(Finding,finding_id)
    if not f: raise HTTPException(404,"Finding not found")
    f.review_status=data.status; db.commit(); return {"id":f.id,"review_status":f.review_status}

@app.get("/api/dashboard")
def dashboard(brand_id:int,db:Session=Depends(get_db)):
    get_brand(db,brand_id)
    scans=db.scalars(select(Scan).where(Scan.brand_id==brand_id).order_by(Scan.id.desc())).all()
    latest={}
    for s in scans:
        if s.kind not in latest: latest[s.kind]=s.id
    fs=db.scalars(select(Finding).join(Scan).where(Scan.brand_id==brand_id,Scan.id.in_(latest.values()))).all() if latest else []
    return {"brand_id":brand_id,"social_scanned":sum(1 for f in fs if db.get(Scan,f.scan_id).kind=="social"),"apps_scanned":sum(1 for f in fs if db.get(Scan,f.scan_id).kind=="app"),"high":sum(f.severity=="high" for f in fs),"medium":sum(f.severity=="medium" for f in fs),"low":sum(f.severity=="low" for f in fs),"recent_findings":[finding_dict(f,db) for f in fs[-10:]]}

@app.get("/api/sources")
def sources(): return {"social":{"status":"synthetic_only","source":"BrandShield deterministic demo adapter","limitations":"No live social provider configured."},"apps":{"status":"available_on_request","source":"Apple iTunes Search API","limitations":"Live API is queried only when app scan is requested with live=true; unavailable source falls back to synthetic records."}}

@app.get("/api/brands/{brand_id}/not-flagged")
def not_flagged(brand_id:int,db:Session=Depends(get_db)):
    get_brand(db,brand_id)
    q=select(Finding).join(Scan).where(Scan.brand_id==brand_id,Finding.flagged==False)  # noqa: E712
    return [finding_dict(f,db) for f in db.scalars(q.order_by(Finding.id.desc())).all()]

if UPLOAD_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
