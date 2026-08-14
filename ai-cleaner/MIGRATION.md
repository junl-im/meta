# AI Cleaner migration

## Protected area

`OPTION/**` is a protected path for an unrelated service.

During this migration:

- Do not edit files under `OPTION/`.
- Do not move or rename `OPTION/`.
- Do not include `OPTION/` in build output rewrites or cleanup steps.
- Keep the current GitHub Pages source (`main` branch, repository root) until a later deployment migration is explicitly reviewed.

## Migration phases

1. ✅ Create an isolated `ai-cleaner/` application area and verify GitHub Pages path compatibility.
2. ✅ Move the v6.2 UI and core browser logic into the repository while preserving the safe Unicode policy.
3. ✅ Restore text regression-oriented UI: X-ray, Unicode preservation, sentence review and before/after comparison.
4. ✅ Add structured image metadata parsing with ExifReader 4.42.0.
5. ✅ Add official C2PA manifest reading/validation with `@contentauth/c2pa-web` 0.13.4.
6. ✅ Restore alpha, residual-noise, periodicity and local-region image heuristics as a separate image module.
7. ⏳ Add browser regression tests using representative text and C2PA/non-C2PA image fixtures.
8. ⏳ Test the branch build in a deployable preview before merging to `main`.
9. ⏳ Revisit GitHub Actions/Vite deployment only after the current Branch deployment remains stable.

## Image provenance policy

- C2PA manifest existence alone is not treated as proof of AI generation.
- `digitalSourceType` is surfaced separately, including `trainedAlgorithmicMedia` and `digitalCapture` when present.
- Structured metadata and explicit generator/prompt metadata are shown separately from visual heuristics.
- Visual noise/periodicity/local-region scores are heuristic signals, not provenance proof or probabilities.
- GPS metadata is reported only as present/absent; coordinates are not displayed.
- Provider-specific invisible watermarks such as SynthID are not claimed to be verified without the provider's official detector.

## External browser dependencies

Pinned versions for reproducibility:

- `exifreader@4.42.0`
- `@contentauth/c2pa-web@0.13.4`

Both are loaded by the browser. C2PA uses the pinned browser SDK plus its WebAssembly resource.

## Target public path

`https://junl-im.github.io/meta/ai-cleaner/`

The migration must not change existing paths under `https://junl-im.github.io/meta/OPTION/`.
