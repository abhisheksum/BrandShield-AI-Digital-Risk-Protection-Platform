# RedShield: Digital Risk Protection Platform
## Hackathon Pitch & Technical Presentation Outline

---

## Slide 1: The Problem — The Modern Impersonation Crisis
### Header: Digital Identity Under Siege
- **Proliferation of Rogue Footprints**: Cybercriminals register typosquat social media handles, deploy phishing support accounts, and publish trojanized mobile applications within hours of a brand going viral.
- **The False-Positive Trap**: Legacy brand protection tools trigger constant alarms on legitimate fan communities, regional distributors, and benign homonyms because they rely naively on raw string distance.
- **Critical Failure Mode**: High alert fatigue paralyzes security operations centers (SOCs), allowing actual credential drainers and malicious APKs to remain online for weeks.
- **The Core Challenge**: How do we automatically detect sophisticated brand impersonations across heterogeneous social and app ecosystems with explainable evidence, zero official account false positives, and strict security guardrails?

---

## Slide 2: The Solution — RedShield Unified DRP Platform
### Header: Real-Time Impersonation Detection & Triage
- **Deterministic Trusted-Asset Exclusion**: A cryptographically deterministic exclusion registry guarantees that registered official URLs, handles, and package IDs are **never** flagged as threats.
- **Explainable Multi-Vector Scoring**: Evaluates candidates across 5 observable threat dimensions (Name, Visual Logo, Description Overlap, Publisher Identity, and Scam Urgency) generating an explainable $0-100$ heuristic score.
- **Strict Anti-False-Positive Guardrail**: Pure name resemblance alone **cannot** produce a Critical verdict ($<80.0$). Severe alarms strictly require corroborated secondary evidence (e.g., perceptual visual mimicry, rogue publisher mismatch, or off-platform redirect links).
- **Separate Confidence Scoring**: Missing evidence coverage explicitly lowers analyst confidence rather than blindly penalizing candidate scores.
- **Interactive SOC Threat Center**: Triage queue featuring multi-dimensional filtering, live evidence inspection, and persistent investigation audit trails in SQLite.

---

## Slide 3: System Architecture & Execution Flow
### Header: End-to-End Resilience & Decoupled Design

```
[ Presentation Tier: React 19 + TypeScript + Tailwind CSS ]
           │
           ▼ (REST API / Axios)
[ Controller Tier: FastAPI + Pydantic v2 Strict Schemas ]
           │
           ├──► [ Modular Collectors: Social & App Store Connectors ]
           │           │ (Timeout, Rate-Limit & Outage Resilient)
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

- **Zero Secret Exposure**: Fully configured via `.env.example` and Pydantic BaseSettings.
- **Secure Ingestion**: Magic byte header verification on logo uploads with $\le 5\text{MB}$ boundaries.

---

## Slide 4: Detection & Scoring Methodology
### Header: Explainable Heuristics, Not Black-Box Probabilities

1. **Configurable Five-Signal Weighting**:
   $$\text{Composite Score} = 0.30 \cdot S_{\text{name}} + 0.25 \cdot S_{\text{logo}} + 0.20 \cdot S_{\text{desc}} + 0.15 \cdot S_{\text{publisher}} + 0.10 \cdot S_{\text{behavior}}$$

2. **Linguistic & Homoglyph Normalization**:
   - Strips invisible zero-width spaces and control characters.
   - Maps look-alike Cyrillic characters (e.g., Cyrillic 'а', 'е', 'о', 'р') to Latin ASCII equivalents.
   - Evaluates Damerau-Levenshtein distances and combosquatting token insertions (`apexpay-support`, `apexpay-claim`).

3. **Perceptual Visual Fingerprinting**:
   - Generates 64-bit difference hashes (`dHash`) of candidate avatars/icons and computes Hamming bit distances against official brand marks.

4. **Dynamic Rebalancing & Confidence Grading**:
   - If bio or logo telemetry is unavailable, weights proportionally rebalance across active signals.
   - Evidence coverage ratio ($Coverage = \frac{\sum W_{\text{available}}}{W_{\text{nominal}}}$) maps to **High** ($\ge 85\%$), **Medium** ($50-84\%$), or **Low** ($<50\%$) confidence.

---

## Slide 5: Live Demonstration & Test Verification
### Header: Proven Capabilities & 100% Automated Test Pass Rate

- **Test Suite Results**:
  - **36/36 Backend Unit & Integration Tests Passed** in $0.55\text{s}$ (`pytest`).
  - **Zero TypeScript Errors** (`npx tsc --noEmit`).
  - **Production Bundle Optimized** (`vite build` in $404\text{ms}$).

- **Live Evaluation Highlights**:
  1. **Brand Registration**: Fictional brand `ApexFintech` created with official handles and package IDs.
  2. **Social Detection**: Look-alike `@apexfintech_support_desk` flagged ($78.3$ score) while `@apexfintech` is cleanly whitelisted.
  3. **App Marketplace Detection**: Rogue APK `com.quickloans.apexfintech.wallet` flagged with Publisher Mismatch ($90/100$) while official app is exempt.
  4. **Threat Center Remediation**: Analyst records investigation notes and escalates to takedown; verified persistence across SQLite database refreshes.
  5. **Fault-Tolerant Outage Handling**: Simulated upstream 503 and 429 errors gracefully update connector health cards with zero fabricated discoveries.

---

## Slide 6: Current Limitations & Future Roadmap
### Header: Engineering Transparency & Next Horizons

- **Current Limitations**:
  - Requires public metadata or sanctioned platform API credentials for high-throughput live crawling.
  - Image hashing compares static avatars/icons; dynamic canvas elements or multi-frame video thumbnails are currently unparsed.
  - SQLite database is optimized for local SOC deployments; high-concurrency multi-tenant clusters will require PostgreSQL migration.

- **Near-Term Roadmap (Q3–Q4 2026)**:
  - **Automated DMCA & Takedown Webhooks**: Direct API dispatch to Twitter Trust & Safety, Google Play Developer Console, and Cloudflare abuse forms.
  - **Domain & Certificate Transparency Monitoring**: Ingest CT logs and WHOIS records to catch look-alike domains before DNS propagation.
  - **LLM-Assisted Phishing Intent Classification**: Fine-tuned localized SLM to evaluate natural language lure urgency and social engineering context in private Telegram channels.
