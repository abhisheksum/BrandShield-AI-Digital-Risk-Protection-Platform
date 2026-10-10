# Rakshak: Digital Risk Protection Platform
## Hackathon Pitch & Technical Presentation Outline

---

## Slide 1: The Problem — The Modern Impersonation Crisis
### Header: Digital Identity Under Siege
- **Proliferation of Rogue Footprints**: Cybercriminals register typosquat social media handles, deploy phishing support accounts, and publish trojanized mobile applications within hours of a brand going viral.
- **The False-Positive Trap**: Legacy brand protection tools trigger constant alarms on legitimate fan communities, regional distributors, and benign homonyms because they rely naively on raw string distance.
- **Critical Failure Mode**: High alert fatigue paralyzes security operations centers (SOCs), allowing actual credential drainers and malicious APKs to remain online for weeks.
- **The Core Challenge**: How can analysts prioritize possible brand impersonation with explainable evidence and strict security guardrails?

---

## Slide 2: The Solution — Rakshak Brand Protection
### Header: Candidate Evaluation & Investigation
- **Exact Trusted-Asset Exclusion**: Exact registered URLs, handles, and package IDs are excluded before scoring. Similar display names are not treated as official-asset matches.
- **Explainable Multi-Vector Scoring**: Evaluates candidates across 5 observable threat dimensions (Name, Visual Logo, Description Overlap, Publisher Identity, and Scam Urgency) generating an explainable $0-100$ heuristic score.
- **Name-Only Guardrail**: Name resemblance alone **cannot** produce a Critical score ($<80.0$). Publisher comparison is used only when an official app publisher is registered for that platform.
- **Separate Confidence Scoring**: Missing evidence coverage explicitly lowers analyst confidence rather than blindly penalizing candidate scores.
- **Interactive SOC Threat Center**: Triage queue featuring multi-dimensional filtering, structured evidence inspection, and persistent investigation audit trails in SQLite.

---

## Slide 3: System Architecture & Execution Flow
### Header: End-to-End Resilience & Decoupled Design

```
[ Presentation Tier: React + TypeScript + Tailwind CSS ]
           │
           ▼ (REST API / Axios)
[ Controller Tier: FastAPI + Pydantic v2 Strict Schemas ]
           │
           ├──► [ Apple App Store Search; Manual/CSV Social Intake ]
           │           │ (Synthetic Demo Fixtures Are Explicitly Labelled)
           │           ▼
           ├──► [ Exclusion Engine: Canonical URL & Package Whitelisting ]
           │           │ (Exempt Official Assets)
           │           ▼
           ├──► [ Normalization: Unicode NFKC + Cyrillic Homoglyph Map ]
           │           │
           │           ▼
           ├──► [ Scoring Engine: RapidFuzz + dHash + Dynamic Weights ]
           │           │ (Enforce Name Similarity Cap Guardrail)
           │           ▼
[ Persistence Tier: SQLite + SQLAlchemy 2.0 (Cascading Relational Schema) ]
```

- **Secret Configuration**: Deployment uses a required stable secret key and Pydantic settings.
- **Secure Ingestion**: Logo uploads validate image bytes, a 5 MB file limit, and a 25-megapixel pixel limit.

---

## Slide 4: Detection & Scoring Methodology
### Header: Explainable Heuristics, Not Black-Box Probabilities

1. **Configurable Five-Signal Weighting**:
   $$\text{Composite Score} = 0.30 \cdot S_{\text{name}} + 0.25 \cdot S_{\text{logo}} + 0.20 \cdot S_{\text{desc}} + 0.15 \cdot S_{\text{publisher}} + 0.10 \cdot S_{\text{behavior}}$$

2. **Linguistic & Homoglyph Normalization**:
   - Strips invisible zero-width spaces.
   - Maps look-alike Cyrillic characters (e.g., Cyrillic 'а', 'е', 'о', 'р') to Latin ASCII equivalents.
   - Evaluates Damerau-Levenshtein distances and combosquatting token insertions (`apexpay-support`, `apexpay-claim`).

3. **Perceptual Visual Fingerprinting**:
   - Uploaded official logos generate perceptual hashes. The current Apple provider does not download candidate artwork for hashing, so visual evidence is missing for its results unless a hash is supplied separately.

4. **Dynamic Rebalancing & Confidence Grading**:
   - If bio or logo telemetry is unavailable, weights proportionally rebalance across active signals.
   - Evidence coverage ratio ($Coverage = \frac{\sum W_{\text{available}}}{W_{\text{nominal}}}$) maps to **High** ($\ge 85\%$), **Medium** ($50-84\%$), or **Low** ($<50\%$) confidence.

---

## Slide 5: Live Demonstration & Test Verification
### Header: Verified Capabilities & Current Test Results

- **Test Suite Results**:
  - Use the current command results in `docs/test-results.md`; do not reuse older test counts or timings.
  - The frontend build is performed by Vite. The project does not currently wire a separate TypeScript type-check command.
  - `npm run lint` exits successfully but reports existing warnings; see the current test report.

- **Live Evaluation Highlights**:
  1. **Brand Registration**: Fictional brand `ApexFintech` created with official handles and package IDs.
  2. **Social Demo**: A seeded synthetic look-alike candidate is scored while an exact registered identifier is excluded. These are not live social discoveries.
  3. **App Marketplace**: The optional live source queries Apple's iTunes Search API. Google Play examples appear only in clearly labelled synthetic demo mode.
  4. **Threat Center Remediation**: Analyst records investigation notes and marks a takedown request; values persist across SQLite refreshes. Rakshak does not submit an external takedown.
  5. **Fault-Tolerant Outage Handling**: Simulated upstream 503 and 429 errors gracefully update connector health cards with zero fabricated discoveries.

---

## Slide 6: Current Limitations & Future Roadmap
### Header: Engineering Transparency & Next Horizons

- **Current Limitations**:
  - Apple iTunes Search API is the only live app source. Social profiles require manual submission or CSV import; there is no broad social-platform crawler.
  - Candidate image URLs are not automatically fetched and hashed, so logo-comparison evidence is often missing for live results.
  - SQLite database is optimized for local SOC deployments; high-concurrency multi-tenant clusters will require PostgreSQL migration.

- **Near-Term Roadmap (Q3–Q4 2026)**:
  - **Automated DMCA & Takedown Webhooks**: Direct API dispatch to Twitter Trust & Safety, Google Play Developer Console, and Cloudflare abuse forms.
  - **Domain & Certificate Transparency Monitoring**: Ingest CT logs and WHOIS records to catch look-alike domains before DNS propagation.
  - **LLM-Assisted Phishing Intent Classification**: Fine-tuned localized SLM to evaluate natural language lure urgency and social engineering context in private Telegram channels.
