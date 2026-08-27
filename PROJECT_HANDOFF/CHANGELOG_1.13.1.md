# AI Cleaner 1.13.1 — Browser Smoke Recovery

- Fixed typewriter cancellation rollback so ESC/close restores the exact result state captured immediately before incremental writing begins.
- Exact-source auto-write remains unchanged: source text is still written incrementally and must compare exactly before success.
- Technical audit now distinguishes intentionally preserved source characters in a verified exact-source result from accidental residue.
- Rewrite generation now behaves transactionally: cancelling an in-flight generation restores the previous completed draft (or empty state on the first generation) and releases the work lock.
- Browser smoke expectations updated for the exact-source preservation contract.
