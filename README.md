# BrandShield

Evidence-first digital risk protection MVP for investigating potential social profile and mobile app impersonation. Findings are investigation priorities, not determinations of malicious intent.

## Local application

The local application includes a React/TypeScript/Vite frontend and FastAPI/SQLAlchemy backend. FastAPI serves `frontend/dist` after a frontend production build. During development, run the API on port 8000 and Vite proxies `/api` requests to it.

## Run locally

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The first startup creates `brandshield.db` and seeds a Kampus.VC demo brand only if the database has no brands. OpenAPI is at `/docs`; health is at `/api/health`. Set `DATABASE_URL` to change the SQLite location. See `.env.example`.

For the single-process production-style local check:

```powershell
cd frontend
npm run build
cd ..
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`. The same FastAPI service serves the built UI and API. Deployment is intentionally deferred.

## API workflows

- `GET /api/brands`, `POST /api/brands`, `GET/PUT /api/brands/{id}` manage brand profile.
- `POST /api/brands/{id}/assets`, `PUT/DELETE /api/assets/{id}` manage declared official assets.
- `POST /api/brands/{id}/logo` validates and stores an organization logo.
- `POST /api/brands/{id}/scans/social` and `/scans/apps` run synthetic scans for any brand.
- Add `?live=true` to app scans to query Apple's iTunes Search API; source errors are returned with synthetic results retained.
- `POST /api/demo/load` safely creates the sample brand when missing and runs both reproducible demo workflows; existing brands are preserved. `POST /api/brands/{id}/demo` runs only for the seeded demo brand.
- `GET /api/findings`, `/api/findings/{id}`, `PATCH /api/findings/{id}/review`, `/api/dashboard?brand_id={id}`, and `/api/brands/{id}/not-flagged` expose persisted outcomes.

All synthetic records are identified as synthetic. No live social integration is configured. The iTunes adapter is an opt-in public API request. Official assets are organization-declared and are not independently authenticated. Brand logos can be uploaded as PNG, JPEG, or WebP up to 5 MB; local files go in the ignored `uploads/` directory.

## Tests

Run `python -m pytest -q` from the repository root. Tests use an isolated temporary SQLite database and cover deterministic scoring, official asset exclusion, demo and arbitrary brand scan generation, rescan storage, dashboard counts, validation, health, asset updates, and review updates. SQLite persistence is used by the running application.

## Current limitations

Logo similarity, a live social provider, Google Play integration, and deployment remain out of scope. The initial scoring rules are heuristics; evidence details are returned by the API. Synthetic records make no claims about real accounts or apps. SQLite persistence was manually verified across an API process restart; that restart check is not part of the automated test suite.
