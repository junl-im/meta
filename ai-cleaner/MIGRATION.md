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
7. ✅ Add browser regression tests and dependency-free static checks.
8. ✅ Add a GitHub Actions static-check workflow without changing GitHub Pages deployment.
9. ⏳ Execute the browser suite in a real GitHub Pages/static preview, including the official C2PA fixture.
10. ⏳ Merge only after the preview checks are green.
11. ⏳ Revisit Vite/Actions-based Pages deployment only after the current Branch deployment remains stable.

## Regression suite

Browser test page after deployment:

`/meta/ai-cleaner/tests/`

The browser suite checks:

- standard/safe/inspect Unicode cleaning profiles
- preservation of ZWJ/ZWNJ/variation-selector-sensitive content
- NFKC opt-in behavior
- X-ray code-point rendering
- sentence-review card creation
- synthetic PNG local image analysis
- ExifReader loading
- C2PA SDK execution path
- optional network test using an official public C2PA fixture

Dependency-free static checker:

```sh
node ai-cleaner/tests/static-check.mjs
```

It checks duplicate HTML IDs, JavaScript DOM references, pinned dependency versions, script load order, protected Unicode guards, C2PA source-type tokens, required UI styles and accidental base64 image bloat.

The workflow `.github/workflows/ai-cleaner-ci.yml` runs syntax/static checks only. It does not deploy Pages and is scoped to AI Cleaner changes.

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
