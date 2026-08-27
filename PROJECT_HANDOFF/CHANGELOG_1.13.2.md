# AI Cleaner 1.13.2 — ESC Cancellation Hardening

- Fixed the remaining browser-smoke failure where an in-flight original typewriter could ignore Escape in some focus/event propagation paths.
- Escape handling for an open typewriter panel now runs in the document capture phase, prevents the default action, stops propagation, and rolls the typewriter transaction back to its exact pre-write snapshot.
- Exact-source progressive typing behavior is unchanged: no rewriting, no normalization, no added/removed content.
- Existing non-typewriter panel Escape behavior remains on the prior close-top path.
