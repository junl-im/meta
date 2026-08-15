# AI Cleaner 1.4.1 — Worker Stability Audit

Date: 2026-08-15
Baseline: delivered `AI_Cleaner_1_4_0_FULL_PROJECT_HANDOFF.zip`

## What changed

- Added a 20s Worker job timeout. A hung live-analysis Worker is terminated and the same job is recovered through the existing main-thread text engine.
- Added a 15s infrastructure-failure cooldown. Repeated Worker boot/error failures no longer recreate a broken Worker on every long live-scan attempt.
- Normal supersede/cancel events do **not** enter cooldown; rapid typing can restart Worker analysis normally after the latest debounce.
- Worker event handlers are instance-scoped and detached before termination. Late events from an old Worker cannot terminate or mutate a replacement Worker.
- Added `messageerror` recovery in addition to regular Worker `error` recovery.
- Fallback execution is always Promise-wrapped so a synchronous fallback exception becomes a rejected analysis Promise instead of escaping the adapter call.
- Worker `postMessage` infrastructure failures now terminate the failed Worker and use the same cooldown/fallback recovery path.
- Analysis Coordinator now clears stale idle handles even if `cancelIdleCallback` is unavailable and falls back to immediate execution if idle scheduling itself throws.
- Browser smoke now asserts that a successful long Worker analysis leaves no pending job and does not hit the timeout path.

## Validation

- Modular unit checks: PASS
- Static/architecture checks: 120 passed / 0 failed
- JavaScript syntax: PASS
- GitHub Actions YAML parse: PASS
- Local Chromium E2E: not claimed until Playwright dependencies install successfully in this environment; verify `browser-smoke` after push.

## Safety / compatibility

- No UI redesign.
- Visible-text Typewriter policy unchanged.
- Old-v6 Layer A safe hygiene policy unchanged.
- Meaning-sensitive Unicode remains preserved.
- No external synthetic typing or detector-bypass logic added.
- `OPTION/**` remains protected and excluded from delivered ZIPs.
- Local Playwright dependency install timed out at 120 seconds; it was not retried and partial install artifacts were removed. Browser E2E remains a GitHub Actions verification item.
