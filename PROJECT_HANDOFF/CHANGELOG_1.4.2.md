# AI Cleaner 1.4.2 — Boot Readiness / Browser Smoke Fix

Date: 2026-08-15
Baseline: delivered `AI_Cleaner_1_4_1_FULL_PROJECT_HANDOFF.zip`

## Root cause

GitHub Actions browser-smoke for 1.4.1 ran after `DOMContentLoaded`, but the app bootloader was still loading core scripts and `app.js`. The page became `boot-ready` before `window.AICleanerApp` and the input handlers existed. This caused the foundation module assertion to see every module as false and allowed the long-input test to fill `#input` before live-analysis wiring existed, leaving `#output` empty.

## What changed

- Added an explicit runtime readiness contract: `window.__AI_CLEANER_APP_READY__`, `html.app-ready`, `window.AICleanerApp.ready`, and the one-shot `ai-cleaner:ready` event.
- `app-ready` is set only after every core script and `app.js` have loaded and `window.AICleanerApp` exists.
- While the page is visible but still wiring scripts, `body.inert=true` and `aria-busy=true` prevent a real user from entering text or clicking controls before handlers exist. The lock is removed only at app-ready.
- Boot failure no longer pretends the app is ready; the body remains inert and `html.app-boot-failed` is set.
- Playwright navigation now uses a shared `gotoReady()` helper and waits for the actual app-ready flag before every interaction.
- Added a dedicated browser readiness test that checks the flag, CSS class, `aria-busy`, `inert`, and `AICleanerApp.ready`.
- Long Worker live-analysis E2E now begins only after the input listener and Worker adapter are fully wired.

## Compatibility

- Worker threshold, timeout, cooldown, fallback, Typewriter visible-text policy, Unicode hygiene policy, mobile compact panels, and UI layout are unchanged.
- No external synthetic typing or detector-evasion logic added.
- `OPTION/**` remains protected and excluded.

## Validation

- Modular unit checks: PASS
- Static/architecture checks: 124 passed / 0 failed
- JavaScript syntax: PASS
- GitHub Actions YAML: PASS
- Local Chromium E2E: not claimed. The single local dependency/Chromium setup attempt hit the 120-second execution limit; it was not retried and partial `node_modules`, `package-lock.json`, and test output were removed.
- Final browser verification target: GitHub Actions `browser-smoke` after pushing 1.4.2.
