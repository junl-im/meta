# AI Cleaner 1.6.6 — UX Priority & Completion Flow Audit

- Keeps `자동작성 원본 새로쓰기` as the single visual next-step cue after source arrival; Rewrite Studio stays available without competing attention animation.
- Surfaces Rewrite Studio as an optional next action after verified internal Typewriter completion.
- Adds a compact result next-step status for pending, ready, writing, and completed states.
- Adds accessible result tab semantics (`tablist` / `tab` / `tabpanel`, synchronized `aria-selected`).
- Adds visible keyboard focus for File Open and a TXT-save feedback toast.
- Demotes history controls visually while preserving behavior.
- No changes to Worker thresholds/fallbacks, Unicode safety policy, Typewriter sanitation, Fact Lock, image provenance, or update lifecycle.

Validation baseline: 1.6.5 GitHub Actions run `31954107010` green. Local 1.6.6 static 184/0, module PASS, JS/MJS syntax PASS, workflow YAML PASS; 31 browser cases configured.
