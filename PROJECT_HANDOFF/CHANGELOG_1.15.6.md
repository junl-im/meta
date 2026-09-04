# 1.15.6 — GomFox Reach 3.0 Functional Research Engine

## Why
1.15.5 restored the Reach surface, but the runtime was still effectively a single-source keyword helper. 1.15.6 turns Reach into a usable no-key research workflow.

## Added
- Research question planning and five expanded search queries.
- Google search launch helpers (search-result scraping is intentionally not claimed).
- Batch collection of up to six public source URLs through the Reader endpoint.
- Manual source ingestion for login/captcha/blocked pages.
- Near-duplicate source rejection.
- Publication-date extraction and source-quality heuristics.
- Claim extraction and cross-source support grouping.
- Numeric/date conflict signals.
- Evidence pack generation prioritizing independent support or high-quality original/official sources.
- Research UI and E2E/static gates for the full functional workflow.

## Preserved
- Text cleaner exact-source character-by-character rewrite contract.
- Image analyzer, Blog Factory, Rewrite Studio, PWA, and OPTION/** protections.
