# RedShield Unified Threat Engine & Scoring Architecture

## 1. Executive Summary & Epistemological Stance

RedShield provides an integrated Digital Risk Protection (DRP) threat engine that unifies social media impersonation and rogue mobile application detections into an explainable scoring pipeline.

> [!IMPORTANT]
> **Heuristic Disclaimer**: A heuristic threat score is **NEVER** represented as a statistical or verified probability. It is an explainable composite risk prioritization metric computed deterministically from observed signals and contextual evidence.

---

## 2. Mathematical Scoring Model & Formula

### Configurable Base Signal Weights
The composite risk score $S \in [0, 100]$ evaluates five primary threat dimensions:

| Signal ($i$) | Weight ($W_i$) | Telemetry Analyzed |
| :--- | :---: | :--- |
| **Name & Handle Similarity** | $0.30$ | Token-set ratio, Damerau-Levenshtein, Cyrillic homoglyph mappings, combosquatting |
| **Logo Visual Mimicry** | $0.25$ | Perceptual 64-bit difference hash (`dHash`), Hamming distance computation |
| **Description Overlap** | $0.20$ | Bio text normalization, token overlap, marketing slogan mimicry |
| **Identity / Publisher Conflict** | $0.15$ | Unverified entity check, mismatch against official developer / publisher |
| **Behavioral Scam Flags** | $0.10$ | Off-platform redirects (`bit.ly`, `t.me`), crypto phishing keywords |

$$\sum_{i=1}^{5} W_i = 1.00$$

### Dynamic Weight Rebalancing
When candidate telemetry is incomplete (e.g., logo hash omitted, description missing), the engine dynamically rebalances weights across the subset of available signals $A$:

$$W_{\text{norm}}(i) = \frac{W_i}{\sum_{k \in A} W_k} \quad \forall i \in A$$

The composite score is then computed as:

$$S_{\text{raw}} = \sum_{i \in A} \left( s_i \times W_{\text{norm}}(i) \right)$$

---

## 3. Strict Security Guardrails

### Name Similarity Cap Guardrail
> **"Name similarity alone cannot produce a critical verdict."**

If a candidate presents 100% exact lexical name resemblance but lacks corroborating secondary evidence (such as perceptual logo mimicry, identity/publisher mismatch, or active scam keywords), the final score is strictly capped at **74.0 (High)**:

$$S = \begin{cases} \min(S_{\text{raw}}, 74.0) & \text{if } \text{has\_corroborating\_evidence} = \text{False} \\ S_{\text{raw}} & \text{otherwise} \end{cases}$$

This prevents severe false alarms for legitimate fan pages, community discussions, or homonymous brands.

---

## 4. Confidence Level Matrix

Missing evidence explicitly degrades analyst confidence rather than penalizing candidate scores:

| Confidence Level | Evidence Coverage Ratio ($\frac{\sum_{k \in A} W_k}{W_{\text{nominal}}}$) | Interpretation |
| :--- | :---: | :--- |
| **High** | $\ge 0.85$ | Multi-channel corroboration (Logo, Name, Publisher verified) |
| **Medium** | $0.50 - 0.84$ | Core lexical signals present; secondary visual or bio data omitted |
| **Low** | $< 0.50$ | Sparse candidate metadata; high manual investigation priority |

---

## 5. Severity Classifications & Recommended Actions

| Score Range | Severity | Default Recommended Response |
| :---: | :---: | :--- |
| **$80 - 100$** | **Critical** | Immediate takedown request & brand protection advisory |
| **$65 - 79$** | **High** | Tier-2 SOC escalation for infringement review & cease-and-desist |
| **$45 - 64$** | **Medium** | Queue for automated periodic re-scan and observe redirects |
| **$0 - 44$** | **Low** | Passive logging in threat observation index |

---

## 6. Exclusion Registry Guarantee
Registered official brand assets (canonical URLs, official handles, mobile package/bundle IDs) are filtered through the deterministic Exclusion Engine (`is_official_asset`) before risk evaluation. Exact registered assets are **NEVER** flagged as threats.

---

## 7. SOC Analyst Workflow & SQLite Persistence

- **Investigation Notes**: Detailed reverse-engineering observations saved to `investigation_notes`.
- **Analyst Identity**: SOC responder logged under `analyst_name`.
- **Status Progression**: `new` $\rightarrow$ `under_investigation` $\rightarrow$ `confirmed_impersonation` $\rightarrow$ `takedown_requested` $\rightarrow$ `resolved`.
- **False-Positive Dismissal**: Whitelist justifications recorded with `dismissed_at` timestamps for compliance audit trails.
