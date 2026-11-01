# Actor Swap Studio WEB — v0.7 foundation

Independent web-first workspace inside the \`junl-im/meta\` repository.

## Status (2026-11-01)

**Foundation only.** This version includes a responsive local-media intake UI, browser capability diagnostics and an exportable input-check manifest. It does **not** yet swap faces, run an AI model, render MP4, or upload user media. The UI deliberately states that limitation.

## Goals

- Open on desktop and mobile browsers without a native installer.
- Run supported inference locally using WebGPU / ONNX Runtime Web and a WASM fallback after model rights and compatibility are verified.
- Preserve product, logo, text, hands, original audio, scene timing and existing project data.
- Keep local files local by default. A future optional remote renderer requires separate user choice.
- Support user-owned or expressly authorized likenesses; provide clear output disclosure and provenance.
- Use original PNG/WebP art and CSS for visuals; no SVG in the app.

## Start

Open \`faceswap/index.html\` through a local web server, or publish the folder as a static site with HTTPS. The UI has no runtime package dependencies. On-device inference and video export are not implemented in this foundation.

## Files

- \`index.html\` — responsive intake and diagnostic UI.
- \`styles.css\` — self-contained desktop/mobile layout.
- \`src/capabilities.mjs\` — WebGPU/WebCodecs/WASM capability probing.
- \`src/app.mjs\` — local-only input preview, checks, manifest export and navigation.
- \`tests/smoke.mjs\` — Node smoke/architecture checks.
- \`docs/WEB_MIGRATION.md\` — migration and acceptance gates.
- \`docs/OPEN_SOURCE_RESEARCH.md\` — source candidates and licensing gates.

## Baseline and provenance

The previous tested project is **Actor Swap Studio v0.6.6**, archived as \`actor_swap_studio_mvp_v0.6.6.zip\` in the established Google Drive folder. Archive contains backend (FastAPI/Python), web UI, QA, batch jobs, Electron packaging and tests. Its SHA-256 is documented in the Notion MASTER development log. On 2026-10-27 a separate local FaceFusion CPU pilot and private Site connection were documented; the pilot source is **not** confirmed to be in this ZIP.

This new \`faceswap/\` tree is not a wholesale import of the historical Python/Electron application. Existing assets, models, credentials, user data and installers are not copied to the public repository.

## Deployment protection

The repository's active Firebase publishing path is \`.pages-site\`. This folder is not included in that output by default. Do not edit root deployment configuration or publish to production until reviewed and tested.

## Verify

Run \`node --test faceswap/tests/smoke.mjs\` from the repository root. Future browser tests must cover Chrome/Edge desktop, Chrome Android and Safari iOS.
