# Actor Swap Studio WEB — migration plan

Date: 2026-11-01
Branch: `feat/faceswap-web-v0.7`
Target: `junl-im/meta/faceswap/` (one repository, independent subproject)

## Verified historical baseline

- v0.6.6 archived source ZIP and test documentation exist in Google Drive.
- Archive file inventory: 105 items under `actor_swap_studio_mvp/`, including Python FastAPI backend, scene masks, Product/Hand/Text Lock, batch/partial retry, QA, static app assets, Electron packaging and regression scripts.
- Oct 27 pilot: private Site -> local `127.0.0.1:7869` FastAPI/FaceFusion CPU runner. This is **not** a portable no-install browser engine. New PC/mobile execution remains unverified.
- Historical passing tests are not equivalent to current web-only model execution or output verification.

## Architecture

1. Static responsive UI; local `File` objects and object URLs; no upload.
2. Capability probe: WebGPU adapter, WebCodecs encode/decode, WebAssembly, storage quota, cross-origin isolation.
3. Future model registry: record source, version, SHA-256, code license, **weights license**, commercial permissions, tested operators, memory and device range.
4. Web inference adapter with explicit `not-ready` state; WebGPU first and WASM fallback only for models successfully tested in that backend.
5. Media decode/encode abstraction (Mediabunny/WebCodecs first, optional FFmpeg WASM with separate binary-license review).
6. Frame pipeline: detection -> landmarks -> identity swap -> mask -> occlusion -> original protected pixels -> temporal QA -> mux.
7. Local export plus optional provenance metadata and consent workflow.
8. Optional advanced renderer is a separate opt-in mode with explicit privacy/cost prompts, never silently uploads.

## Existing features to preserve before release

- Original product/logo/text/hand region fidelity, original audio and scene timing.
- Project revisions, recovery/cancel, per-actor batch metadata and retry ranges.
- Multiple aspect ratios and output presets.
- Safe filename handling on Korean Windows and mobile browsers.
- Clear separation between preview, actual AI swap, encoded output and export.

## Milestones

### M0 — repository isolation (this branch)

- [x] Dedicated `faceswap/` static app and documentation.
- [x] Local video/reference intake and capability diagnostics.
- [x] Local input check / JSON manifest export.
- [ ] Independent browser playthrough and device QA.
- [ ] Confirm all historical source license notices.

### M0.5 — local video lab and automated browser QA (v0.7.3, NOT AI swap)

- [x] Optional MediaPipe CPU face **location** detection with explicit third-party download notice.
- [x] Real 3-second in-browser canvas/photo overlay recording, preview and downloaded MP4/WebM candidate.
- [x] Explicitly label all outputs `DEMO / NOT AI SWAP`; no face-swap model weights included.
- [x] Static Node tests/CI for normalization, format decision, media-local architecture.
- [x] Chromium automated E2E: desktop + Pixel 7 mobile emulation × encode/download and consent/reset = 4 PASS (2026-11-01, [Actions 41286780071](https://github.com/junl-im/meta/actions/runs/41286780071)).
- [x] FFprobe confirms output video track and frame packet timestamps; reset state regression repaired.
- [x] v0.7.3: Web Audio local audio bridge plus fallback capture; [GitHub Actions 41297129563](https://github.com/junl-im/meta/actions/runs/41297129563) confirms 6/6 Chromium tests: desktop + Pixel 7 emulation × local output, consent/reset, and repeated render. FFprobe checks encoded audio packets; FFmpeg volumedetect proves a non-silent 440 Hz synthetic tone in downloaded output.
- [ ] Physical Chrome/Android/Safari playback and audio preservation tests.
- [ ] A complete container Duration value / seekable WebM/MP4 mux.
- [ ] Full source-audio fidelity, A/V synchronization, frame timing and seekable output confirmed on physical devices (Web Audio tone QA is not full preservation proof).

### M1 — legally usable 3-second proof

- [ ] Choose and document a distributable ONNX swap model with a clear weights license.
- [ ] Validate ONNX operators for the browser backend and memory ceilings.
- [ ] Process a short consented sample entirely within the browser.
- [ ] Produce actual MP4 with source audio and frame-count/timebase checks.
- [ ] Ensure no media network requests; verify with network capture.

### M2 — robust video editing

- [ ] Landmark/mask/occlusion improvements; temporal and identity QA.
- [ ] Partial retry, project recovery and original-pixel protection.
- [ ] Quality presets with automatic device fallback.
- [ ] Test Chrome/Edge Windows, Chrome Android and iOS Safari.

### M3 — optional advanced mode

- [ ] High-quality model adapter (including evaluation of Wan Animate 2) without promising mobile/local feasibility.
- [ ] Explicit local/remote mode, price/privacy confirmation, output labeling and C2PA where applicable.
- [ ] Dedicated distribution and recovery plan.

## Release gates

Do not describe AI swapping as working until a real source video + authorized reference produces a verified playable MP4. A MediaRecorder photo overlay is an engineering test, not a face swap. Do not use a model whose weights/distribution license is unresolved. Keep the production `main` branch and Firebase deployment unchanged until reviews pass.

## UI conventions

No SVG tags/files/data URIs, emoji-as-icons or excessive glowing buttons. Keep single-screen phone layout with internal scrolling, custom scrollbars and deliberate browser back/exit behavior.
