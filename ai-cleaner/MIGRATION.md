# AI Cleaner migration

## Protected area

`OPTION/**` is a protected path for an unrelated service.

During this migration:

- Do not edit files under `OPTION/`.
- Do not move or rename `OPTION/`.
- Do not include `OPTION/` in build output rewrites or cleanup steps.
- Keep the current GitHub Pages source (`main` branch, repository root) until a later deployment migration is explicitly reviewed.

## Migration phases

1. Create an isolated `ai-cleaner/` application area and verify GitHub Pages path compatibility.
2. Move v6.2 UI, CSS and JavaScript out of the single-file build into modules without changing behavior.
3. Add regression checks for Unicode preservation, DOM references and text-cleaning behavior.
4. Replace heuristic image metadata string scanning with structured metadata parsing where useful.
5. Integrate official C2PA reading/validation as a separate provenance-inspection layer.
6. Revisit build/deployment only after the static Branch deployment remains stable.

## Target public path

`https://junl-im.github.io/meta/ai-cleaner/`

The migration should not change existing paths under `https://junl-im.github.io/meta/OPTION/`.
