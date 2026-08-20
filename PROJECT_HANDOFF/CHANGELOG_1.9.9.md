# AI Cleaner 1.9.9 — CSP / loader timeout hardening

- Removed executable JavaScript from the root redirect page and added a no-script CSP there.
- Externalized the app boot controller to `ai-cleaner/js/boot.js` so runtime JavaScript can run under a self-only Content Security Policy.
- Added CSP boundaries: same-origin scripts/connections/workers, C2PA WASM allowance, no object embedding, no base rewriting, no form submissions.
- Added bounded waits for version discovery (3.5s), core scripts (10s), lazy tools (10s), background update polling (8s), image vendor loading (10s), and C2PA WASM initialization (12s).
- Update polling now aborts timed-out requests and always releases its busy state; module coverage guards the timeout recovery path.
- Static checks now understand the external boot module and enforce the CSP/timeout boundaries.
- Corrected stale handoff metadata that still described 1.9.1 and the removed OPTION CI blocker.
- `OPTION/**` remains owner-managed and is not modified or included in delivery ZIPs. The existing optional Pages bridge for `OPTION/SS_OPTION.txt` is unchanged.
