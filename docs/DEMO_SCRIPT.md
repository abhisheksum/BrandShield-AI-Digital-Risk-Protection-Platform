# Demo script (about 75 seconds)

1. Open the BrandShield dashboard and use **Load Demo Brand**. It safely creates the Kampus.VC sample profile if absent, preserves other brands, and runs one deterministic synthetic social scan and one app scan.
2. Open Social Monitoring and App Monitoring. Point out the synthetic source labels and declared official asset exclusion in each scan summary.
3. Select a finding and inspect its name comparison, signal scores, calculation, unavailable evidence, provenance, and review actions.
4. Open **Not Flagged** and show an unrelated decoy alongside the reason it was not prioritized.
5. Register an arbitrary brand, add its declared account or app, and run both scan types to demonstrate that generation and detection use the submitted profile.
6. In the API docs, optionally run an app scan with `live=true`; describe the iTunes source status accurately if it is unavailable.

Synthetic records are demonstration candidates, not real detections. The live iTunes API is optional and may be unavailable.
