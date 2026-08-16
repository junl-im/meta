# AI Cleaner 1.6.4 — UX Flow Simplification & Typewriter Next-Step Navigation

Date: 2026-08-16

## Baseline
- Patch baseline: the actually delivered `AI_Cleaner_1_6_3_FULL_PROJECT_HANDOFF.zip`.
- `OPTION/**` remains protected/excluded.
- Worker thresholds, Unicode safety policy, Rewrite Studio Fact Lock, and image-analysis lifecycle are unchanged.

## Source action simplification
- Removed the visible `지금 다듬기` button from the source card. Automatic live analysis already covers the default path, and freshness-sensitive operations still call the internal synchronous analysis boundary when needed.
- Added `AICleanerApp.analyzeNow()` as the explicit internal/testable on-demand analysis entrypoint; no hidden manual button remains in the DOM.
- With live analysis disabled, stale UI copy is now `원본 변경됨 · 다음 작업에서 자동 갱신`.

## Typewriter next-step guidance
- `자동작성 원본 새로쓰기` is disabled before a source exists.
- Source arrival activates a strong but finite recommendation cue and changes the bridge status to `다음 단계 · 눌러서 새로쓰기`. Programmatic source loads (Sample/file/update restore) use the same cue.
- Source mutation clears old Typewriter verification metadata immediately. After a verified run, the bridge returns to a quiet `다시 새로쓰기` state until the source changes again.

## Immediate result navigation
- Clicking `자동작성 원본 새로쓰기` opens its floating progress panel, locks the Typewriter transaction, then immediately aligns the viewport to the result card instead of waiting for completion.
- The progress panel stays open while the result textarea is progressively written. The result card shows a temporary `자동작성 중` visual state.
- Completion navigation, completion button, user-interaction cancellation, reduced-motion handling, and sticky-header landing offsets remain intact.

## Validation
- Static/architecture checks: 173 passed / 0 failed after the 1.6.4 metadata/version update.
- Module/integration checks: PASS.
- JS/MJS syntax: PASS.
- Workflow YAML: PASS.
- Browser E2E configuration: 27 cases after adding the next-step/immediate-navigation regression.
- GitHub Actions `browser-smoke` is the final Chromium gate after push.
