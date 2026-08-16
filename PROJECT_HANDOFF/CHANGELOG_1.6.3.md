# AI Cleaner 1.6.3 — Functional Wiring & Source Pipeline Audit

Date: 2026-08-16

## Baseline
- Patch baseline: the actually delivered `AI_Cleaner_1_6_2_FULL_PROJECT_HANDOFF.zip`.
- `OPTION/**` remains protected and excluded.
- Patch scope is functional wiring, lifecycle/data-safety, and regression coverage. Text-hygiene/Worker/Typewriter safety policy is unchanged.

## Source controls / sample regression
- The Sample button handler still existed in 1.6.2, but Sample, text-file import, update restore, and real user input followed partially duplicated source-state paths. As input freshness, result-navigation cancellation, Governor state, rewrite invalidation, and statistics evolved, this divergence became a regression risk.
- Added one shared source-mutation boundary used by user input plus programmatic source replacement. Sample/file/update-restore now consistently update dirty/freshness state, cancel stale navigation/analysis where appropriate, refresh stats/widgets, emit the original-text change event, and run immediate analysis when requested.
- Sample now gives explicit success feedback after it has loaded and analyzed. Text-file import uses the same path.
- Added an exception boundary around synchronous/manual analysis. A thrown analyzer/render error keeps the current source, marks the result stale/recoverable, sets the performance state to `오류`, logs the exception, and shows a user-visible recovery message instead of failing silently.

## Control wiring hardening
- Every static `<button>` now explicitly uses `type="button"`; dynamic issue Apply/Undo/Locate buttons do the same. This removes dependence on implicit submit semantics if layout/container markup changes later.
- Browser coverage now directly clicks Sample with live analysis disabled and verifies source text, cleaned output, freshness state, and success feedback. Text-file import receives equivalent coverage.
- Added a forced synchronous-analysis failure E2E to verify the app remains recoverable.

## Image-analysis lifecycle
- App-level image loading now `await`s the async image analyzer and participates in the shared Work Lock using per-run lock keys. Automatic update therefore waits for an active image analysis.
- Switching away from the image tool or suspending the page can cancel the current image analysis so stale results cannot render later.
- Unsupported image types and files above 50MB now leave a clear status/performance state and toast instead of leaving `이미지 검사 엔진 준비 중…` on screen.
- Image decode is bounded to 15 seconds; ExifReader and C2PA dependency paths have 10s/12s soft timeouts so unavailable CDN/provenance tooling cannot hold the UI/update lock forever. Binary/visual analysis can still proceed when metadata provenance helpers time out.

## Direct typing verifier continuity
- Direct-write progress is now retained while switching between Rewrite Studio tabs or closing/reopening the panel within the same page, as long as the original source has not changed.
- Changing the original resets the direct-write progress, preventing old keystrokes from being compared against a new target.
- Automatic update is blocked while direct-write text remains, because that verifier progress is intentionally not serialized/restored as trusted physical typing.

## Coverage / validation
- Browser E2E configuration grows from 21 to 26 cases: Sample, file import, manual-analysis error recovery, rejected-image lifecycle/work-lock release, and direct-write tab/panel continuity.
- Static/architecture checks: 170 passed / 0 failed before packaging.
- Module/integration checks: PASS.
- JS/MJS syntax: PASS.
- GitHub Actions workflow YAML: PASS.
- Local Playwright is not used in this environment. A system Chromium exists, but the environment policy blocks local/private HTTP origins, so the local app cannot be exercised through that browser. GitHub Actions `browser-smoke` remains the final real-browser gate.
