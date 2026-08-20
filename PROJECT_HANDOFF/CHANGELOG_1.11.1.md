# AI Cleaner 1.11.1

## CI / PWA foundation repair

- Restored the 1.10 production core-bundle boot path on top of the 1.11.0 UI release.
- Restored service-worker registration from `boot.js`.
- Restored `app-core.bundle.js` generation in `.github/scripts/build-runtime-vendor.mjs`.
- Restored `sw.js` staging in `.github/scripts/build-pages-artifact.mjs`.
- Restored explicit PWA manifest metadata (`id`, `lang`, description, categories, orientation).
- Restored `sw.js` syntax checks in both GitHub Actions workflows.
- Made the static service-worker cache assertion follow `version.json` instead of a hard-coded release string.
- No `OPTION/**` file is modified or included in the delivery artifacts.

## Root cause

The GitHub `main` branch had a mixed release state: 1.11.0 UI/test files were present, while several files introduced or changed in 1.10.0 remained at their older versions. The existing static checks correctly detected the mismatch. This patch is cumulative so those foundation files are explicitly re-delivered.
