# Rakshak Architecture

Rakshak is a React/Vite frontend with a FastAPI API, SQLAlchemy persistence, and a heuristic candidate-scoring service. Findings are for analyst review, not proof of infringement.

## Runtime flow

1. An authenticated account registers a brand and its claimed official assets. Brand, scan, asset, and finding routes are scoped to that account.
2. The user starts a live-source or synthetic demo scan.
3. Live app-store scans call Apple's public iTunes Search API for software results in one configured storefront. Demo scans use synthetic fixtures. No live social-platform provider is configured.
4. Social candidates can be submitted manually or imported as CSV. These routes use the same official-asset exclusion and scoring functions.
5. Candidate URLs and platform identifiers are checked against the brand's exact registered official URLs and identifiers before scoring. Publisher names do not automatically whitelist other applications.
6. The scoring service records available signals, missing evidence, confidence, reasons, and a heuristic score. Findings and source status are persisted; investigators can add notes and change status.
7. Repeated scan, manual, and CSV candidates are deduplicated by normalized identifier or URL within the same brand, platform, and candidate type.

~~~mermaid
flowchart LR
  UI[React UI] --> API[FastAPI]
  API --> AUTH[PBKDF2 password hashes and signed bearer tokens]
  API --> APPLE[Apple iTunes Search API]
  API --> MANUAL[Manual profile and CSV intake]
  API --> DEMO[Explicit synthetic demo fixtures]
  APPLE --> EXCLUDE[Exact official URL and identifier exclusion]
  MANUAL --> EXCLUDE
  DEMO --> EXCLUDE
  EXCLUDE --> SCORE[Explainable heuristic score]
  SCORE --> DB[(SQLite and SQLAlchemy)]
  DB --> UI
~~~

## Data sources

- **Apple App Store:** https://itunes.apple.com/search with entity=software, a brand-name search term, configured country, result limit, and request timeout. Search results include app names, bundle IDs, seller names, links, artwork URLs, and descriptions when supplied. Apple responses are candidates; Rakshak does not validate ownership or malicious intent. Google Play and other stores are not connected.
- **Social platforms:** No live integrations. Manual submissions and CSV imports evaluate known profiles. Demo mode uses synthetic records and marks their provenance.
- **Demo fixtures:** Never returned by live mode and never stored as live source evidence.

## Scoring and exclusion

The scoring engine retains the configured name, logo, description, publisher, and suspicious-indicator weights. It rebalances available signal weights and reduces confidence when telemetry is missing. It does not synthesize an official logo hash. Publisher mismatch is evaluated only when an official app publisher is explicitly registered for that same platform; a brand display name is not treated as a publisher reference. Such mismatches are heuristic signals, not proof.

Exact matching official app IDs, profile identifiers, and canonical URLs are excluded before scoring. A registered asset is an organisation-provided claim; the API does not independently verify ownership and does not allow clients to set an asset's verified flag to true.

## Authentication and data boundaries

Passwords are stored as salted PBKDF2-HMAC-SHA256 hashes. The API signs bearer tokens with the configured HMAC secret. Brand-owned records are queried through their owning account; a second account cannot read another account's brand or associated findings. Accounts represent one organisation each. Shared organisation membership, roles, email verification, password reset, and administrative ownership transfer are not implemented.

Legacy records without an owner remain inaccessible through authenticated organisation routes. Review and assign them deliberately; do not make them public to ease migration.

## Storage, uploads, and deployment

- Local development uses SQLite at the backend working directory and uploads under backend/uploads.
- The Docker Compose deployment runs one non-root API worker and Nginx frontend. SQLite and uploads persist in the rakshak_data volume.
- The Compose API port is internal. Nginx serves the SPA and proxies API, upload, and health paths on the same origin. Terminate public traffic with HTTPS at an ingress or reverse proxy.
- CORS allows only configured origins, with local Vite origins as the development default and no wildcard. Compose uses an empty origin list for same-origin operation.
- Logo upload validates supported image bytes, caps files at 5 MB and dimensions at 25 megapixels, and stores generated filenames in the configured upload directory. Uploaded logos are served from public URLs; only upload public artwork. CSV import caps files at 5 MB and 5,000 rows.
- /health and /api/health check database connectivity and writable upload storage.

SQLite is a single-instance setup. Do not increase API workers or run multiple replicas against the same SQLite file. Use a managed relational database and shared object storage before scaling. The startup migration helper supports the existing additive ownership migration; back up before schema changes.

## Verification

The current command results are recorded in test-results.md. Integration tests use fake Apple HTTP responses for deterministic coverage; a separate live smoke request confirmed that Apple's public endpoint returned results during this run. That does not guarantee future provider availability.
