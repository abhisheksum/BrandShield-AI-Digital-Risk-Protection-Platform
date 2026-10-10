import re
import os
from datetime import datetime, timezone
import httpx

def slug(s): return re.sub(r"[^a-z0-9]+", "", (s or "").casefold()) or "brand"

def synthetic_candidates(brand, kind):
    root=slug(brand.name); aliases=brand.aliases or []
    compact=brand.name.replace(" ","")
    transposed=(root[:1]+root[2:3]+root[1:2]+root[3:]) if len(root)>2 else root+"x"
    candidates=[
        {"name":root[:-1]+("x" if root[-1:]!="x" else "q"),"description":f"Official {brand.name} account for customer information","handle":"@"+root+"_help"},
        {"name":transposed,"description":f"Information and updates about {brand.name}","handle":"@"+transposed},
        {"name":compact+"x","description":f"Services for {brand.name}","handle":"@"+compact+"x"},
        {"name":(brand.name[:-1] if len(brand.name)>1 else brand.name)+"","description":f"{brand.name} account information","handle":"@"+root[:-1]},
        {"name":brand.name+" Support","description":f"Get help with {brand.name} login and account verification","handle":"@"+root+"support"},
        {"name":brand.name.replace(" ", "-"),"description":"Independent community and product discussion","handle":"@"+root+"community"},
        {"name":brand.name+" Cafe","description":"Local cafe and catering business","handle":"@"+root+"cafe"},
        {"name":brand.name+" Updates","description":"","handle":"@"+root+"updates"},
        {"name":(aliases[0] if aliases else brand.name)+" Rewards","description":f"Rewards and offers from {brand.name}","handle":"@"+root+"rewards"},
        {"name":brand.name+" Directory Listing","description":"","handle":"@"+root+"directory"},
    ]
    if kind == "social":
        for i,c in enumerate(candidates): c.update(kind=kind,platform="Synthetic Social",url=f"https://synthetic.invalid/{c['handle'].lstrip('@')}",source_type="synthetic",source_name="BrandShield deterministic demo adapter",stable_id=f"social:{root}:{i}",publisher="")
    else:
        for i,c in enumerate(candidates): c.update(kind=kind,platform="Synthetic App Catalog",url=f"https://synthetic.invalid/apps/{root}-{i}",identifier=f"demo.{root}.candidate{i}",publisher="Independent Demo Publisher" if i%2 else "Example Studio",source_type="synthetic",source_name="BrandShield deterministic demo adapter",stable_id=f"app:{root}:{i}")
    return candidates

async def itunes_search(term, timeout=None):
    timeout=timeout or float(os.getenv("ITUNES_TIMEOUT_SECONDS","5"))
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            r=await client.get("https://itunes.apple.com/search",params={"term":term,"entity":"software","limit":25})
            r.raise_for_status(); data=r.json()
        if not isinstance(data.get("results"),list): raise ValueError("Unexpected iTunes response shape")
        retrieved=datetime.now(timezone.utc)
        out=[]
        for x in data["results"]:
            if not isinstance(x,dict): continue
            appid=x.get("trackId")
            out.append({"kind":"app","name":x.get("trackName") or "","platform":"Apple App Store","url":x.get("trackViewUrl") or "","identifier":x.get("bundleId") or str(appid or ""),"publisher":x.get("sellerName") or "","description":x.get("description") or "","source_type":"live","source_name":"Apple iTunes Search API","stable_id":f"itunes:{appid or x.get('bundleId')}","retrieved_at":retrieved})
        return {"status":"available","records":out,"source":"Apple iTunes Search API","retrieved_at":retrieved.isoformat()}
    except Exception as e:
        return {"status":"unavailable","records":[],"source":"Apple iTunes Search API","error":str(e)}
