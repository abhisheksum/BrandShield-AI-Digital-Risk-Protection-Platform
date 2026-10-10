# How BrandShield works

The API accepts a brand profile, optional validated logo, and organization-declared social and app assets. Brand and asset declarations are stored in SQLite and provide stable identifiers for exclusion checks. On startup, the service seeds a demo brand only when the database has no existing brand. PNG, JPEG, and WebP logos are limited to 5 MB and stored under the local `uploads/` directory.

Social and app scans use deterministic synthetic adapters. The app scan can additionally query Apple's public iTunes Search API when `live=true`; requests have a timeout, response shape is checked, and errors are returned as source status while synthetic records remain available. No live social source is configured.

Every collected record is normalized into the same candidate shape and evaluated by the shared deterministic detection engine. Exact registered account URLs/handles and app URLs/identifiers are excluded before prioritization. Remaining candidates receive measured name, description, and publisher signals when those fields exist. Evidence and normalized scores are persisted with each scan. Findings can be reviewed and the status is stored in SQLite.

Scores indicate investigation priority, not fraud probability. Missing comparisons do not earn positive points. Declared assets are not independently verified.
