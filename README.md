# Rakshak — Digital Brand Protection

Rakshak registers an organisation's brand profile and official assets, evaluates app and social candidates, and stores explainable findings for investigation. Scores are heuristic review priorities; they are not probabilities or proof of infringement.

## Implemented capabilities

- Registration and login store salted PBKDF2-HMAC-SHA256 password hashes and issue signed bearer tokens. Private brands, scans, assets, and findings are scoped to the authenticated account. Email ownership verification, shared organisation memberships, and role-based access are not implemented.
- Brand profiles, official asset records, logo upload and perceptual hashes, scan history, findings, investigation notes, status updates, and persistence use the FastAPI/SQLAlchemy backend. Uploaded logo files are served from public static URLs; only upload artwork intended to be public.
- Official app/account URL and identifier matches are excluded before scoring. An asset entered by an organisation is a user claim; Rakshak does not independently verify ownership. Similar names or publishers alone do not prove malicious intent.
- Manual social-profile submission and CSV import are operational. CSV uploads are limited to 5 MB and 5,000 rows. Required CSV columns are candidate_name, platform, and candidate_identifier; candidate_url, description, and is_unverified_new_account are optional. There is no live social-platform integration and Rakshak does not search all of Instagram, X, or other networks.
- Demo records are synthetic, clearly labelled, and returned only when Synthetic demo data mode is selected. They must not be reported as live observations.

## Data sources and limits

- **Apple App Store:** Non-demo app scans query Apple's public iTunes Search API at https://itunes.apple.com/search with the brand name, entity=software, and the configured country. The result cap and timeout are configurable. Search results are candidates for review, not validated threats. This does not search Google Play or every app store. The endpoint does not require credentials; it is subject to Apple's availability and rate limits. See [Apple's Search API examples](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/SearchExamples.html).
- **Social platforms:** No live provider is configured. Submit a known profile manually or import a CSV export. Use demo mode only to inspect the synthetic demonstration records.
- **Scoring:** Missing evidence lowers confidence. Official logos are not inferred when no logo has been uploaded. Name similarity, a publisher mismatch, or a single score is not a legal determination.

## Local setup (Windows PowerShell)

Requirements: Python 3.10 or later, Node.js 22 or later, and npm.

From the repository root, start the backend in one terminal:

~~~powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:SECRET_KEY = (python -c "import secrets; print(secrets.token_urlsafe(48))")
$env:CORS_ORIGINS = '["http://localhost:5173","http://127.0.0.1:5173"]'
python -m uvicorn app.main:app --reload --port 8000
~~~

In another terminal:

~~~powershell
Set-Location frontend
npm ci
npm run dev
~~~

Open the Vite URL printed in the frontend terminal. The Vite proxy sends /api, /health, and /uploads to the local API. The default local SQLite database is backend/rakshak.db; uploaded images are stored under backend/uploads. Keep SECRET_KEY stable between backend restarts if login tokens must remain valid. To persist local backend settings, copy backend/.env.example to backend/.env and set SECRET_KEY there; an environment variable takes precedence. For custom API URLs, set VITE_API_URL in the frontend environment.

To select a scan mode, open **Scan History**. Configured live sources are the default. Selecting **Synthetic demo data** runs the seeded social and app examples. The standalone social/app scan buttons use configured live sources; a social scan reports that no live social provider is configured.

## Configuration

The root .env.example is for Docker Compose. Copy it to .env and set a private key before deployment. Backend settings can also be set as process environment variables.

| Variable | Purpose | Default |
| --- | --- | --- |
| SECRET_KEY | HMAC signing key for bearer tokens | Random per process; set a stable secret in deployments |
| DATABASE_URL | SQLAlchemy connection URL | sqlite:///./rakshak.db |
| UPLOAD_DIR | Persistent uploaded logo directory | backend/uploads |
| CORS_ORIGINS | JSON array of exact allowed origins | Local Vite origins only; no wildcard |
| APPLE_STORE_COUNTRY | Apple storefront country code | us |
| APPLE_STORE_RESULT_LIMIT | Search result limit (1–200) | 25 |
| APPLE_STORE_TIMEOUT_SECONDS | Apple request timeout (0–30 seconds) | 6 |
| ACCESS_TOKEN_EXPIRE_MINUTES | Bearer token lifetime | 1440 |
| WEB_PORT | Published web port in Compose | 8080 |
| PROJECT_NAME / VERSION / API_V1_STR | API identity, version, and route prefix | Rakshak / 1.0.0 / /api |
| WEIGHT_NAME_SIMILARITY, WEIGHT_LOGO_SIMILARITY, WEIGHT_DESCRIPTION_SIMILARITY, WEIGHT_PUBLISHER_MISMATCH, WEIGHT_SUSPICIOUS_BEHAVIOR | Configurable score weights | 0.30 / 0.25 / 0.20 / 0.15 / 0.10 |
| ALERT_RISK_THRESHOLD, MEDIUM_RISK_THRESHOLD, HIGH_RISK_THRESHOLD, CRITICAL_RISK_THRESHOLD | Alert and severity thresholds | 40 / 45 / 65 / 80 |

For a cross-origin frontend, set CORS_ORIGINS to a JSON array of exact HTTPS origins. The API does not enable cookie credentials or wildcard origins.

## Render production database setup

Keep `DATABASE_URL` unset for local development; Rakshak then uses the checked-in
`backend/rakshak.db` SQLite file. The backend accepts both Render's
`postgres://...` URL and the newer `postgresql://...` form and selects the
bundled `psycopg` driver automatically. Startup creates missing tables and
applies only additive migrations; it does not replace or delete the local SQLite
database.

To run the backend on Render with persistent PostgreSQL storage:

1. In the Render dashboard, create a **PostgreSQL** database in the same region
   as the web service. Choose the plan and retention/backups appropriate for
   production.
2. Create a **Web Service** for this repository. If using the Docker runtime,
   set the Dockerfile path to `backend/Dockerfile` and use the repository root
   as the build context. Do not configure a release command that deletes or
   recreates a database.
3. In the web service's **Environment** settings, add `DATABASE_URL` by linking
   it to the PostgreSQL database's **Internal Database URL**. Do not paste the
   external URL when both services are on Render.
4. Add a strong, stable random `SECRET_KEY` (at least 32 characters). Set
   `CORS_ORIGINS` to a JSON array containing the exact deployed frontend HTTPS
   origin, for example `["https://your-frontend.example"]`.
5. Set the health check path to `/health`. The Dockerfile listens on Render's
   `PORT` value when supplied and defaults to port `8000` locally.
6. Deploy the web service manually from Render when you are ready. After it
   starts, verify `/health`, registration, login, and one authenticated brand
   request. The first startup creates the PostgreSQL schema; no SQLite migration
   or automatic data transfer is performed.

PostgreSQL persists relational application data, but Render's normal web-service
filesystem is ephemeral. Keep `UPLOAD_DIR` on a Render persistent disk or move
uploads to durable object storage before relying on uploaded logos in production.
Do not delete `backend/rakshak.db`; it remains the local-development default and
is not used when Render supplies `DATABASE_URL`.

## Docker deployment

The included Compose setup builds the React app into Nginx and runs one non-root FastAPI worker. Nginx serves the UI and proxies /api, /uploads, and /health to the API. SQLite and uploads share the named rakshak_data volume. This single-instance SQLite deployment is appropriate for a small deployment; do not horizontally scale API containers or run multiple workers against this database. Use PostgreSQL and managed object storage before scaling.

1. Install Docker Engine/Desktop with the Compose plugin.
2. Copy .env.example to .env; generate a key with python -c "import secrets; print(secrets.token_urlsafe(48))" and place it in SECRET_KEY.
3. Review CORS_ORIGINS, Apple storefront settings, and WEB_PORT.
4. Build and start: docker compose up --build -d.
5. Check service health: docker compose ps and open http://localhost:8080/health (or the configured port). The health endpoint checks database connectivity and writable upload storage.
6. Put the web service behind HTTPS termination before exposing it publicly. Restrict inbound access to the published web port; the API port is internal to the Compose network.
7. Back up the SQLite database and rakshak_data volume before upgrades. For a consistent database copy, run docker compose exec -T api python -c "import sqlite3; source=sqlite3.connect('/data/rakshak.db'); target=sqlite3.connect('/tmp/rakshak-backup.db'); source.backup(target); target.close(); source.close()", then copy it with docker compose cp api:/tmp/rakshak-backup.db ./rakshak-backup.db. Back up /data/uploads too. docker compose down preserves the volume; docker compose down -v deletes the database and uploaded logos.

Startup creates missing tables and applies the existing additive SQLite ownership migration. Back up before schema upgrades. Legacy brands without an owner remain hidden from authenticated accounts; assign ownership only through a deliberate administrative process.

## Verification commands

~~~powershell
# Backend, from backend/
.\.venv\Scripts\python.exe -m pytest -q

# Frontend, from frontend/
npm run build
npm run lint
~~~

The checked-in test report is maintained in docs/test-results.md and records only commands/results actually observed for the current code.
