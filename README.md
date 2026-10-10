# BrandShield AI — Digital Risk Protection Platform

BrandShield AI is an enterprise-grade Digital Risk Protection (DRP) platform designed to detect social-media impersonations, typosquats, brand combosquatting, and suspicious mobile applications.

The platform enables security operations center (SOC) teams to register legitimate brand assets, discover suspicious candidates across external threat vectors, compute explainable risk scores, and coordinate alert investigations.

---

## Architecture Overview

```
                                  +------------------------------+
                                  |   BrandShield Web Console    |
                                  |   (React + Vite + Tailwind)  |
                                  +--------------+---------------+
                                                 |
                                         REST / OpenAPI
                                                 v
                                  +------------------------------+
                                  |    FastAPI Backend Server    |
                                  +--------------+---------------+
                                                 |
        +----------------------------------------+----------------------------------------+
        |                                        |                                        |
        v                                        v                                        v
+-----------------------+              +-----------------------+              +-----------------------+
|  Detection & Scoring  |              |  Exclusion Registry   |              |   Source Collectors   |
|  - RapidFuzz (String) |              |  - Canonical URLs     |              |  - Social Platforms   |
|  - Unicode / NFKC     |              |  - Package IDs        |              |  - Mobile App Stores  |
|  - Homoglyph Map      |              |  - Publisher Entities |              |  - Synthetic Fixtures |
|  - Image Perceptual H.|              +-----------------------+              +-----------------------+
+-----------------------+
        |
        v
+-----------------------+
|  SQLite / SQLAlchemy  |
|  - Brands & Assets    |
|  - Scan Audits        |
|  - Triage Alerts      |
+-----------------------+
```

---

## Key Features

1. **Brand & Official Asset Registry**
   - Register brands with keywords, descriptions, and logos.
   - Maintain a **Trusted-Asset Exclusion Registry** (handles, canonical URLs, and app package identifiers). Verified assets are exempted automatically before alert generation.
2. **Detection & Look-Alike Analysis**
   - **Unicode NFKC & Homoglyphs:** Detects Cyrillic and confusable character substitutions (e.g., Cyrillic 'а', 'е', leetspeak).
   - **Combosquatting & Typosquatting:** Evaluates token combinations, edit distances, and prefix/suffix insertions.
   - **Logo Similarity:** Perceptual image hashing (dHash/aHash) for visual mimicry.
3. **Explainable Risk Scoring Engine**
   - Configurable 0 to 100 risk score breakdown:
     - Name similarity: 30%
     - Logo similarity: 25%
     - Description & branding similarity: 20%
     - Publisher or account mismatch: 15%
     - Suspicious behavior indicators: 10%
   - **Explicit Missing Signal Handling:** When a signal is unavailable, weights are rebalanced dynamically rather than penalized.
4. **Data Collectors with Status Transparency**
   - Pluggable collector interfaces for social platforms and app stores.
   - Explicit scan status reporting (`completed`, `partial`, `unavailable`, `failed`).
   - Clear distinction between live telemetry and synthetic demonstration fixtures (`is_demo`).
5. **Security Operations Center (SOC) Dashboard**
   - Overview KPIs, severity distributions, and scan audits.
   - Real-time search, filters, and structured evidence drawers.
   - Incident triage workflow (`new` -> `under_investigation` -> `confirmed_impersonation` -> `takedown_requested` -> `resolved` -> `false_positive`).

---

## Quickstart & Launch Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Launch Backend API
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start backend server on port 8000
python3 -m uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger / OpenAPI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Launch Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
- Open browser at `http://localhost:5173`

---

## Automated Test Suite

Execute the comprehensive automated test suite (16 tests covering normalization, homoglyphs, exclusion, scoring weights, missing signal handling, and API integration):

```bash
cd backend
PYTHONPATH=. venv/bin/pytest -v
```

---

## Ethical & Detection Notice
- Heuristic risk scores indicate similarity patterns and behavioral anomalies, and do not constitute legal establishment of malicious intent.
- Live collectors adhere strictly to platform rate-limits and robots/API terms of service.
