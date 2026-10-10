# Rakshak Verification Report

**Run date:** 2026-10-10  
**Backend result:** 46 passed, 0 failed, 1 dependency deprecation warning  
**Frontend build:** Passed, with a large-chunk advisory  
**Frontend lint:** Exit code 0, with existing lint warnings

## Commands and observed results

### Backend

~~~powershell
Set-Location backend
.\venv\Scripts\python.exe -m pytest -q
~~~

Result: **46 passed in 6.62 seconds**. One warning comes from the installed Starlette TestClient integration, which warns that using httpx with starlette.testclient is deprecated and recommends httpx2.

| Test module | Count | Coverage |
| --- | ---: | --- |
| test_api.py | 4 | Health aliases, brand routes, duplicate prevention, and exact-origin CORS |
| test_auth_isolation.py | 1 | Registration/login, stored password hash, and tenant isolation for brands, assets, alerts, and scans |
| test_brands_crud.py | 2 | Brand/asset lifecycle, official asset claim behavior, image validation, static logo retrieval, oversized upload rejection |
| test_collectors_resilience.py | 9 | Synthetic demo labels, no-provider social behavior, Apple result mapping, 503 and timeout handling, source outages and rate limits |
| test_exclusion.py | 3 | URL/identifier exclusion and protection against excluding a different app from a shared publisher |
| test_hackathon_eval.py | 7 | Brand setup, social demo flow, look-alike and unrelated names, app findings, Apple scan integration, deduplication, investigation persistence, source failure |
| test_normalization.py | 4 | Unicode normalization, homoglyphs, zero-width characters, and tokenization |
| test_scoring.py | 6 | Signal scoring, missing evidence, name-only critical guardrail, publisher reference requirements, and configured weights |
| test_similarity.py | 5 | Similarity, typosquatting, and combosquatting cases |
| test_social_monitoring.py | 1 | Manual profile submission, official exclusion, duplicate rejection, CSV import and duplicate handling |
| test_threat_engine.py | 4 | Finding workflow, filters, status updates, and persistence |
| **Total** | **46** | |

The Apple HTTP response is mocked in deterministic integration tests. A separate live smoke request queried the public Apple endpoint for “OpenAI”; it returned status completed and 21 App Store candidates for the configured US storefront. This verifies reachability during this run only. Apple's [Search API examples](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/SearchExamples.html) document the public search endpoint.

### Frontend

~~~powershell
Set-Location frontend
npm run build
npm run lint
~~~

- Vite production build passed in 4.34 seconds: 2,548 modules transformed; generated JavaScript bundle was 828.41 kB before gzip. Vite emitted its advisory that a chunk exceeds 500 kB.
- Oxlint exited with code 0. It reports existing unused-import/variable and React-hook warnings across the legacy views.
- There is no standalone TypeScript type-check script in package.json; the Vite build transpilation is not a replacement for a full type check.

### Local service checks

- GET http://127.0.0.1:8000/health returned 200 with status healthy.
- GET http://127.0.0.1:5173 returned 200.
- A request with Origin https://untrusted.example returned 200 without Access-Control-Allow-Origin.
- docker-compose.yml parsed as YAML. Docker is not installed in this environment, so Docker image builds, Compose interpolation, and container health checks were not executed.

## Verified workflow and edge cases

- Authenticated brand registration and official asset management persist through SQLAlchemy; private data is not visible to another account.
- Social demo and Apple app results run through official-asset exclusion before scoring. The Apple integration test excludes the registered bundle ID/URL, creates one live-provenance candidate finding, and verifies it is not marked demo.
- Repeated scan/manual/CSV candidates are deduplicated by normalized platform identity. Finding status and investigation notes persist after a new database query.
- Missing brand logo data remains unavailable in the evidence breakdown. A listed app seller is not compared against the brand display name unless an official publisher is registered for that app platform.
- Look-alikes and unrelated candidates exercise the existing scoring engine; source failure, HTTP 503, timeout, and rate-limit cases produce no fabricated candidates.
- Uploaded image content and size limits are covered; CSV import has size and row limits.

## Not verified in this run

- A Docker build or production container startup, because Docker is unavailable here.
- Live social-platform discovery; no social API integration or credentials are configured.
- Live availability beyond the single Apple smoke request.
