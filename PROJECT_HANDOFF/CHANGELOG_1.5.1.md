# AI Cleaner 1.5.1 — Cohesion & Integrity Stability Audit

Date: 2026-08-16
Baseline: delivered `AI_Cleaner_1_5_0_FULL_PROJECT_HANDOFF.zip`

## Fixed / refined
- Added a visible **지금 다듬기** action so manual analysis remains available when live analysis is disabled.
- Added a stale-result freshness boundary: dirty input marks the prior output stale and guards copy/download/edit/undo/diff/history actions until analysis catches up.
- Update draft capture/restore now tracks whether input and output belong to the same analysis revision and discards mismatched stale output. Pending analysis blocks version reload checks.
- Added BFCache-aware suspend/resume for Worker/coordinator/update polling and dirty live-analysis recovery.
- Isolated toast show/hide timers so an older toast cannot hide a newer message.
- Rewrite generation is transaction-scoped with generation tokens, option locks, stale timer isolation, reset/cancel handling, and source-dependency invalidation.
- Original edits immediately stale-lock a draft based on the current-result source; long-document text-change events avoid full-source hashing on each keystroke.
- Typewriter synchronizes dirty input before start. Escape now stops/restores an active Typewriter instead of only hiding its panel. Closing/switching away from Rewrite cancels in-flight draft generation.
- Desktop floating panels clamp against both the reserved top area and viewport bottom; trigger `aria-expanded` state follows actual visibility.
- Lazy review summary keeps total candidates separate from the rendered subset.

## Safety / behavior preserved
- Visible-text Typewriter remains internal to the result textarea and does not synthesize keyboard events.
- Safe hidden Unicode cleanup / special-space normalization remain unchanged; meaning-sensitive Unicode remains preserved by default.
- Worker threshold, timeout, cooldown, main-thread fallback, app-ready boot contract, mobile compact panels, Fact Lock, and direct physical typing verification remain intact.
- `OPTION/**` is not part of this patch and must remain untouched in the repository.

## Validation
- Static architecture checks: 140 passed / 0 failed.
- Module/integration unit checks: PASS.
- JavaScript syntax: PASS (all JS/MJS).
- Workflow YAML: PASS (PyYAML parse).
- Local browser E2E: NOT RUN because dependency installation hit the 120-second execution limit; partial install artifacts were removed. GitHub Actions `browser-smoke` after push is the final Chromium validation.
