# Architecture

```mermaid
flowchart LR
  User[Evaluator / organization] --> UI[React + TypeScript + Vite]
  UI --> API[FastAPI REST API]
  API --> Profile[Brand profile and declared official assets]
  API --> Social[Synthetic social adapter]
  API --> Apps[Synthetic app adapter]
  Apps -->|optional live=true| Apple[Apple iTunes Search API]
  Social --> Normalize[Candidate normalization]
  Apps --> Normalize
  Apple --> Normalize
  Normalize --> Exclude[Official asset identifier exclusion]
  Exclude --> Detect[RapidFuzz and deterministic evidence scoring]
  Detect --> Store[(SQLite: brands, assets, scans, candidates, findings)]
  API --> Store
  Store --> API
  API --> Uploads[Validated local brand logo uploads]
  API --> UI
```

FastAPI exposes `/api/health` and OpenAPI at `/docs`. In development Vite proxies `/api` to FastAPI. After `npm run build`, FastAPI serves the production React build from `frontend/dist`. SQLite stores application records; uploaded image files are stored locally under the ignored `uploads/` directory.
