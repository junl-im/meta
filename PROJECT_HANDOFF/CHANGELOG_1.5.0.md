# AI Cleaner 1.5.0 — Large-document Performance Governor

Date: 2026-08-15
Baseline: delivered `AI_Cleaner_1_4_2_FULL_PROJECT_HANDOFF.zip` with green GitHub Actions browser-smoke

## What changed

- Added `js/services/analysis-performance-governor.js`. Live-analysis delay now adapts to document length, rapid typing bursts, and an EMA of recent analysis duration.
- Manual analysis remains immediate and synchronous; the governor affects only scheduled live analysis.
- `text-engine.analyze()` now returns lightweight `reviewMeta` so Worker analysis can publish review candidate counts without eagerly building review panel DOM.
- Hidden `교정 제안`, `문장 검토`, and `기술 정보` panel contents are rendered on demand when opened.
- Collapsed detailed before/after diagnostics no longer rescan the full result during every live-analysis commit; comparison refreshes when the details section is open.
- Existing Worker safety remains unchanged: 6,000-character threshold, latest-only cancellation, 20-second hang timeout, 15-second failure cooldown, automatic main-thread fallback.
- Existing text hygiene and internal Typewriter policies are unchanged. Meaning-sensitive Unicode remains preserved by default.

## Regression coverage

- Governor unit coverage: length tiers, typing burst backoff, slow-analysis backoff, telemetry, reset.
- Text engine unit coverage: Worker-safe review metadata summary.
- Browser coverage: review panel remains unbuilt while hidden and is populated on first open; long Worker test also checks governor completion telemetry.
- Static checks validate governor boot order, live-analysis wiring, review summary boundary, and lazy hidden diagnostics rendering.

## Validation target

- Module checks: PASS
- Static/architecture checks: 129 passed / 0 failed before final packaging validation
- JavaScript syntax: required for all modules and tests
- GitHub Actions YAML: required to parse
- Local Browser E2E: dependency installation hit the 120-second execution limit; it was not retried and partial install artifacts were removed. Final source of truth is GitHub Actions `browser-smoke` after push

`OPTION/**` remains protected and is not included in delivered ZIP artifacts.
