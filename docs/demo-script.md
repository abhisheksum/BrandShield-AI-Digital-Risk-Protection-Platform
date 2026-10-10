# Rakshak Demonstration Guide

This guide demonstrates the current application without presenting synthetic records as live discoveries.

## Start locally

Follow the Windows PowerShell setup in the root README. Start FastAPI on port 8000 and the Vite frontend on port 5173, then register or log into an account.

## Demo flow

1. Register a fictional brand, add its claimed social and app assets, and upload a logo. User-entered assets are exclusion records; Rakshak does not independently verify ownership.
2. Open Scan History and select **Synthetic demo data**. Run a social-only scan. The output is seeded synthetic data. Confirm the exact registered official social identifier is excluded and investigate the remaining candidate alerts.
3. Keep demo mode selected and run an app-only scan. The included Google Play-like examples are synthetic fixture records, not store results. Inspect the source summary and demo provenance.
4. Open a candidate finding, record the analyst and investigation notes, change its status, refresh the page, and confirm the values were loaded from the database.
5. Import a small CSV with required columns candidate_name, platform, candidate_identifier. Optional columns are candidate_url, description, and is_unverified_new_account. Submit a profile manually and confirm re-submitting it is rejected as a duplicate.

## Live-source check

To query Apple's public App Store Search API, select **Configured live sources** and run an app-only scan. The result summary names Apple as the source and says which storefront country was queried. Returned apps are search candidates, not verified threats. The integration does not query Google Play. A live social scan reports that no social API is configured; submit a known profile manually or import CSV instead.

## What the demo does not claim

- Seeded candidates are not real accounts or store listings.
- Rakshak does not search all of Instagram, X, or other social networks.
- A risk score is a heuristic review priority, not a probability or legal determination.
- An organisation's registration of an asset does not independently verify its ownership.
- Rakshak does not take down, warn, or contact an external account or app.

## Graceful failure

The automated suite mocks an Apple outage and timeout to verify the source returns no candidates and records unavailable/timeout status. These tests do not promise that Apple's service will remain reachable. Source health for each real scan is shown in its persisted source summary.
