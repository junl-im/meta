# AI Cleaner 1.13.1 — Browser Smoke Recovery

- Fixed typewriter cancellation rollback so ESC/close restores the exact result state captured immediately before incremental writing begins.
- Exact-source auto-write remains unchanged: source text is still written incrementally and must compare exactly before success.
- Technical audit now distinguishes intentionally preserved source characters in a verified exact-source result from accidental residue.
- Rewrite generation now behaves transactionally: cancelling an in-flight generation restores the previous completed draft (or empty state on the first generation) and releases the work lock.
- Browser smoke expectations updated for the exact-source preservation contract.

## Browser-smoke timing hotfix (2026-08-27)
- Fixed a CI-only race in `typewriter started from dirty input restores the current input result when cancelled`.
- The previous smoke test used a very short source, so on a fast runner the exact-source typewriter could finish before the queued Escape key was processed. In that case the app correctly kept the completed exact-source result, but the test incorrectly expected an in-flight cancellation rollback.
- The regression now uses the slowest real UI speed plus a sufficiently long dirty source and asserts `aria-busy=true` before pressing Escape. This deterministically verifies the intended in-flight cancellation contract without changing production behavior.
- Production typewriter behavior is unchanged: completed exact-source writes remain committed; only genuinely in-flight writes roll back to the synchronized current analysis result when cancelled.
