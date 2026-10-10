from types import SimpleNamespace
from app.detection import evaluate, normalize

def brand(): return SimpleNamespace(id=1,name="Northstar",aliases=["North Star"])
def candidate(name="Northstarr", **kwargs): return {"kind":"social","name":name,"description":"Northstar support and account details","handle":"@other",**kwargs}

def test_substitution_and_explainable_score():
    r=evaluate(brand(),candidate("N0rthstar"),[])
    assert r["score"] is not None and "SIMILAR_BRAND_NAME" in r["reasons"]
    assert r["evidence"]["signals"]

def test_spacing_variation():
    r=evaluate(brand(),candidate("North Star"),[])
    assert r["score"] is not None

def test_transposition_and_insertion_are_explained():
    transposed=evaluate(brand(),candidate("Nrothstar"),[])
    inserted=evaluate(brand(),candidate("Northxstar"),[])
    deleted=evaluate(brand(),candidate("Northsta"),[])
    assert "CHARACTER_TRANSPOSITION" in transposed["reasons"]
    assert "CHARACTER_INSERTION" in inserted["reasons"]
    assert "CHARACTER_DELETION" in deleted["reasons"]

def test_added_word():
    r=evaluate(brand(),candidate("Northstar Support"),[])
    assert "ADDED_BRAND_TERM" in r["reasons"]

def test_declared_social_exclusion():
    asset=SimpleNamespace(id=9,kind="social",url="https://social.example/northstar",handle="northstar",identifier="",publisher="")
    r=evaluate(brand(),candidate("Northstar",url=asset.url,handle="@northstar"),[asset])
    assert r["official_match"] and not r["flagged"] and r["score"]==0

def test_declared_app_exclusion():
    asset=SimpleNamespace(id=10,kind="app",url="https://store.example/1",identifier="com.northstar.app",handle="",publisher="")
    c={"kind":"app","name":"Northstar","url":"https://other.example/2","identifier":"com.northstar.app","description":""}
    r=evaluate(brand(),c,[asset])
    assert r["official_match"]

def test_unrelated_candidate_is_not_flagged_high():
    r=evaluate(brand(),candidate("Northstar Cafe",description="A neighborhood espresso cafe"),[])
    assert r["severity"]!="high"

def test_short_brand_requires_stronger_name_match():
    short=SimpleNamespace(id=2,name="AI",aliases=[])
    r=evaluate(short,{"kind":"social","name":"A1 help","description":"","handle":""},[])
    assert not r["flagged"]

def test_missing_evidence_is_insufficient():
    r=evaluate(brand(),{"kind":"social","name":"","description":"","handle":""},[])
    assert r["severity"]=="insufficient_evidence" and r["score"] is None
    assert "logo similarity not evaluated" in r["evidence"]["unavailable"]

def test_high_priority_requires_two_independent_signals():
    r=evaluate(brand(),{"kind":"social","name":"Northstar","description":"","handle":""},[])
    assert r["score"]==100 and r["severity"]=="medium"

def test_unknown_publisher_is_weak_review_signal():
    c={"kind":"app","name":"Northstar","description":"","publisher":"Unknown Publisher","identifier":"other.bundle"}
    r=evaluate(brand(),c,[])
    publisher=next(s for s in r["evidence"]["signals"] if s["name"]=="publisher_match")
    assert publisher["strength"]=="weak"

def test_name_normalization():
    assert normalize("Nórth-Star") == "north star"
    assert normalize("N0rthstar") == normalize("Northstar")

def test_score_bounds():
    for name in ["Northstar Support","n0rthstar","North Star","unrelated"]:
        r=evaluate(brand(),candidate(name),[])
        if r["score"] is not None: assert 0 <= r["score"] <= 100
