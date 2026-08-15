# AI Cleaner 1.2.0 — Modular Core Phase 2

Date: 2026-08-15

## Goal
Preserve the 1.0.0/1.1.x UI contract while moving state, text analysis, file import and update lifecycle responsibilities out of `app.js`.

## Changes
- Added `js/core/state-store.js`.
  - Owns the stable text-state object.
  - `replace()` and `reset()` mutate the same object identity so UI/features do not hold stale state references.
  - Adds a monotonic revision boundary; `text:changed` events include the revision.
- Added `js/core/text-engine.js`.
  - Owns technical Unicode scanning, homoglyph detection, sentence splitting, correction issue rules, hygiene score, review suggestions and light issue counting.
  - Keeps meaning-sensitive Unicode preservation policy intact.
- Added `js/features/file-import.js`.
  - Owns TXT-like import parsing, RTF `\\uN` conversion, HTML/XML text extraction, binary-text rejection and the 20 MB size guard.
- Added `js/services/update-manager.js`.
  - Owns `version.json` polling, busy state, update draft storage/retrieval, reload target de-duplication and online/visibility/interval scheduling.
  - App supplies UI-specific snapshot/restore callbacks; Typewriter/work lock continues to defer reload while work is active.
- `app.js` reduced from about 717 lines to about 578 lines by removing duplicated service/pure-analysis responsibilities.
- Boot order now loads phase-2 core/services before `app.js`; rewrite and image engines remain lazy-loaded.
- GitHub Actions syntax checks include all new modules.
- `tests/module-check.mjs` expanded with state-store, text-engine, file-import and update-manager unit coverage.
- Static architecture checks expanded to ensure these responsibilities are actually extracted rather than duplicated in `app.js`.

## Compatibility
- No intended visual redesign.
- Mobile compact panels and widget labels remain unchanged.
- `자동작성 원본 새로쓰기` continues to use visible-text projection: safe hidden characters are removed, special spaces normalized, meaning-sensitive Unicode preserved.
- Existing DOM `ai-cleaner:text-changed` remains as a compatibility bridge for rewrite-studio while internal Event Bus carries the same change event with state revision.
- No external synthetic keyboard/keystroke automation is added.
- `OPTION/**` remains protected and is excluded from handoff ZIPs.

## Verification
- Modular Core Phase 2 unit checks: PASS.
- Static checks: 88 passed, 0 failed.
- JavaScript syntax checks: PASS.
- Workflow YAML parse: PASS.
- Browser E2E was not executed locally because dependencies are not bundled in the handoff environment; GitHub Actions browser-smoke remains the real-browser verification after push.
