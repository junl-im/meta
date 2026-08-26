# AI Cleaner 1.13.0 — Exact Source Incremental Write

Date: 2026-08-26

## Core contract
- `자동작성 원본 새로쓰기` now uses the exact original input string as its write source.
- No hidden-character removal, special-space normalization, wording change, sentence change, or content expansion is allowed in this path.
- The existing progressive writer keeps building the result from empty state with grapheme-by-grapheme `setRangeText()` insertion; it does not paste or bulk-assign the final source string.
- Completion is accepted only when the final result exactly equals the original source. A mismatch fails closed and restores the prior result.
- Unicode/text-hygiene analysis remains available on the right-side diagnostics, but analysis no longer mutates the center auto-write source.

## UX
- Updated guidance now states that the full original, including hidden/special characters and line breaks, is preserved during auto-write.
- The one-click center workflow, floating progress panel, pause/resume, navigation, history rollback, and verified-completion marker remain intact.

## Compatibility / safety
- No synthetic external keyboard events are introduced.
- `OPTION/**` remains protected and excluded.
- Rewrite Studio, image analysis, Blog Factory, mobile panels, and existing analysis widgets are unchanged.

## Validation
- Static/architecture checks: 292 passed / 0 failed.
- Module checks: PASS.
- JS/MJS syntax checks: PASS.
- Browser E2E spec updated for exact-source preservation; local Playwright dependency is not installed in this packaging environment, so GitHub `browser-smoke` remains the final browser gate after push.
