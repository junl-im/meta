# 1.1.0 — Modular Core Phase 1

- Preserved the 1.0.0 UI/layout contract.
- Extracted Event Bus, History Store, Work Lock and shared grapheme text utilities.
- Extracted panel open/close/drag/clamp/mobile-sheet state into `ui/panel-manager.js`.
- Extracted internal Typewriter rAF scheduler/pause/resume/progress state into `features/typewriter-engine.js`.
- Core modules now boot before `app.js` with the same `assetVersion` cache key.
- Kept rewrite and image engines lazy-loaded.
- Added `tests/module-check.mjs` and CI execution for modular core unit checks.
- Kept DOM CustomEvent compatibility for rewrite-studio while adding the internal Event Bus.
- No OPTION/** changes.
