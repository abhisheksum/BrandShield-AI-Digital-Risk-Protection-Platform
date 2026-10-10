import re
import unicodedata
from rapidfuzz.fuzz import ratio, token_set_ratio

CONFUSABLES = str.maketrans({"0":"o", "1":"l", "3":"e", "5":"s"})
ADDED = {"support", "help", "login", "rewards", "offers", "verification", "official", "customer", "care"}

def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "").casefold()
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = value.translate(CONFUSABLES)
    value = value.replace("rn", "m").replace("vv", "w")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()

def variation_tags(reference: str, candidate: str):
    a=re.sub(r"[^a-z0-9]", "", (reference or "").casefold())
    b=re.sub(r"[^a-z0-9]", "", (candidate or "").casefold())
    tags=[]
    if not a or not b: return tags
    if len(a)==len(b):
        mismatches=[i for i,(x,y) in enumerate(zip(a,b)) if x!=y]
        if len(mismatches)==2:
            i,j=mismatches
            if j==i+1 and a[i]==b[j] and a[j]==b[i]: tags.append("CHARACTER_TRANSPOSITION")
            else: tags.append("CHARACTER_SUBSTITUTION")
        elif len(mismatches)==1: tags.append("CHARACTER_SUBSTITUTION")
    elif len(b)==len(a)+1:
        if any(a==b[:i]+b[i+1:] for i in range(len(b))): tags.append("CHARACTER_INSERTION")
    elif len(a)==len(b)+1:
        if any(b==a[:i]+a[i+1:] for i in range(len(a))): tags.append("CHARACTER_DELETION")
    if normalize(reference)!=normalize(candidate) and normalize(reference).replace(" ","")==normalize(candidate).replace(" ",""):
        tags.append("SPACING_VARIATION")
    return tags

def official_match(kind, candidate, assets):
    c_url = (candidate.get("url") or "").rstrip("/").casefold()
    c_id = (candidate.get("identifier") or "").casefold()
    c_handle = (candidate.get("handle") or "").lstrip("@").casefold()
    for a in assets:
        if a.kind != kind: continue
        a_url = (a.url or "").rstrip("/").casefold()
        a_id = (a.identifier or "").casefold()
        a_handle = (a.handle or "").lstrip("@").casefold()
        if kind == "app" and ((a_id and c_id == a_id) or (a_url and c_url == a_url)): return a.id, "registered app identifier or URL matched"
        if kind == "social" and ((a_handle and c_handle == a_handle) or (a_url and c_url == a_url)): return a.id, "registered account handle or URL matched"
    return None, None

def evaluate(brand, candidate, assets):
    matched_id, match_reason = official_match(candidate["kind"], candidate, assets)
    if matched_id:
        return {"official_match": True, "flagged": False, "score": 0, "severity": "official", "reasons":["OFFICIAL_ASSET_MATCH"], "evidence":{"official_asset_id":matched_id,"exclusion_reason":match_reason,"signals":[],"unavailable":["risk scoring skipped after official match"]}}
    refs = [brand.name, *(brand.aliases or [])]
    cand_name = candidate.get("name") or candidate.get("handle") or ""
    nname = normalize(cand_name)
    sims = [(ref, ratio(normalize(ref), nname)) for ref in refs if normalize(ref) and nname]
    best_ref, name_sim = max(sims, key=lambda x:x[1]) if sims else (None, None)
    reasons=[]; signals=[]; evaluated_max=0; points=0
    if name_sim is not None:
        evaluated_max += 30
        name_points = 30 * name_sim / 100
        points += name_points
        min_name_similarity = 75 if len(normalize(best_ref or "").replace(" ","")) < 4 else 55
        if name_sim >= min_name_similarity: reasons.append("SIMILAR_BRAND_NAME")
        reasons.extend(variation_tags(best_ref or "",cand_name))
        raw_compact = re.sub(r"[^a-z0-9]", "", (cand_name or "").casefold())
        ref_compact = re.sub(r"[^a-z0-9]", "", (best_ref or "").casefold())
        if raw_compact != ref_compact and normalize(raw_compact) == normalize(ref_compact): reasons.append("CONFUSABLE_CHARACTER")
        if normalize(best_ref or "") in normalize(cand_name) and normalize(best_ref or "") != normalize(cand_name): reasons.append("BRAND_NAME_EMBEDDED")
        if any(w in normalize(cand_name).split() for w in ADDED): reasons.append("ADDED_BRAND_TERM")
        signals.append({"name":"name_similarity","value":round(name_sim,1),"points":round(name_points,1),"max_points":30,"reference":best_ref})
    desc = candidate.get("description") or ""
    if desc:
        evaluated_max += 15
        ds = max((token_set_ratio(normalize(ref), normalize(desc)) for ref in refs), default=0)
        dp = 15 * ds / 100 if ds >= 30 else 0
        points += dp
        if ds >= 40: reasons.append("DESCRIPTION_SIMILARITY")
        signals.append({"name":"description_similarity","value":round(ds,1),"points":round(dp,1),"max_points":15})
    if candidate.get("publisher"):
        registered = [a.publisher.casefold() for a in assets if a.kind == "app" and a.publisher]
        same = any(candidate["publisher"].casefold() == p for p in registered)
        evaluated_max += 20
        pp = 0 if same else 5
        points += pp
        if pp: reasons.append("PUBLISHER_MISMATCH")
        signals.append({"name":"publisher_match","value":same,"points":pp,"max_points":20,"strength":"weak"})
    added = any(w in normalize(cand_name).split() for w in ADDED)
    if added:
        evaluated_max += 10; points += 7; reasons.append("ADDED_BRAND_TERM")
        signals.append({"name":"added_term","value":True,"points":7,"max_points":10})
    if evaluated_max == 0 or name_sim is None:
        return {"official_match":False,"flagged":False,"score":None,"severity":"insufficient_evidence","reasons":[],"evidence":{"signals":signals,"unavailable":["name similarity unavailable","logo similarity not evaluated"],"calculation":"Insufficient evidence: no meaningful name or logo comparison."}}
    score = round(100 * points / evaluated_max, 1)
    min_name_similarity = 75 if len(normalize(best_ref or "").replace(" ","")) < 4 else 55
    has_anchor = (name_sim is not None and name_sim >= min_name_similarity)
    independent = len({s["name"] for s in signals if s.get("points",0)>0})
    severity = "high" if score >= 70 and has_anchor and independent >= 2 else "medium" if score >= 40 and has_anchor else "low"
    if score >= 70 and severity != "high": severity="medium"
    flagged = severity in {"high","medium"}
    return {"official_match":False,"flagged":flagged,"score":score,"severity":severity,"reasons":list(dict.fromkeys(reasons)),"evidence":{"reference_name":best_ref,"candidate_name":cand_name,"name_similarity":round(name_sim,1),"signals":signals,"unavailable":["logo similarity not evaluated"],"calculation":f"100 × {round(points,1)} observed points / {evaluated_max} evaluated maximum points = {score}; heuristic investigation priority, not probability."}}
