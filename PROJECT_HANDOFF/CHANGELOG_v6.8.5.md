# v6.8.5 Foundation Audit

- Fixed duplicate correction issue registration.
- Blank input now clears stale output, diagnostics, panels and history.
- Live text stats follow the current editor value.
- Internal typewriter cancels pending live analysis, locks conflicting controls, restores disabled states, and rolls back on verification failure.
- Typewriter synchronizes current original metadata before progressive writing.
- Original direct-write target is now immutable/original-only.
- Fact Lock validates repeated fact counts.
- RTF Unicode escapes and binary-ish text import handling improved.
- Image file/pixel resource limits and safe object-URL swapping added.
- Playwright E2E version/base URL drift fixed.
- Result actions, tiny-screen header/tabs, and keyboard focus layout polished.
