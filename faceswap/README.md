# Actor Swap Studio WEB — v0.7.3 audio QA

Independent web-first workspace inside the `junl-im/meta` repository.

## Status (2026-11-01)

**Browser lab, not AI face swap.** The UI now includes a 3-second labeled picture-over-video recording test, optional MediaPipe face **location** detection, and a downloadable file (MP4 or WebM, chosen by browser capability). The photo overlay is not an identity replacement or realistic face-swap inference. The browser now uses a reusable local Web Audio capture bridge when available, with native captureStream as a fallback. Chromium E2E checks the recorded synthetic 440 Hz tone is actually non-silent; absence of an audio track is explicitly labeled silent, but source-audio fidelity and lip synchronization are not yet proven. No user footage or portrait is uploaded by our application.

## Goals

- Open on desktop and mobile browsers without a native installer.
- Run supported inference locally using WebGPU / ONNX Runtime Web and a WASM fallback after model rights and compatibility are verified.
- Preserve product, logo, text, hands, original audio, scene timing and existing project data.
- Keep local files local by default. A future optional remote renderer requires separate user choice.
- Support user-owned or expressly authorized likenesses; provide clear output disclosure and provenance.
- Use original PNG/WebP art and CSS for visuals; no SVG in the app.

## Start

Open `faceswap/index.html` through a local web server, or publish the folder as a static site with HTTPS. Core UI and recording need no install or bundling. Optional automatic face detection downloads MediaPipe Tasks Vision 1.2.0 WASM/runtime from jsDelivr and BlazeFace model from Google's public model host **only after the user explicitly opts in and clicks the detection button**. This optional third-party SDK notes that usage/performance metrics may be sent to Google; see its [package privacy notice](https://www.npmjs.com/package/@mediapipe/tasks-vision). Media files are used locally by canvas and the model. Actual identity swapping, long-form export and full audio-preserving MP4 muxing are not implemented.

## Files

- `index.html` — responsive intake and diagnostic UI.
- `styles.css` — self-contained desktop/mobile layout.
- `src/capabilities.mjs` — WebGPU/WebCodecs/WASM capability probing.
- `src/app.mjs` — local-only input preview, checks, manifest export and navigation.
- `src/face_detector.mjs` — opt-in MediaPipe CPU face location and bounds normalization.
- `src/compositor.mjs` — canvas overlay, output sizing and supported recorder format.
- `src/video_lab.mjs` — optional tracking, 3-second local recording, cancellation, preview/download.
- `src/audio_capture.mjs` — reusable Web Audio source and per-render local audio tracks, with disposal.
- `tests/smoke.mjs` — Node smoke/architecture checks.
- `docs/WEB_MIGRATION.md` — migration and acceptance gates.
- `docs/OPEN_SOURCE_RESEARCH.md` — source candidates and licensing gates.

## Baseline and provenance

The previous tested project is **Actor Swap Studio v0.6.6**, archived as `actor_swap_studio_mvp_v0.6.6.zip` in the established Google Drive folder. Archive contains backend (FastAPI/Python), web UI, QA, batch jobs, Electron packaging and tests. Its SHA-256 is documented in the Notion MASTER development log. On 2026-10-27 a separate local FaceFusion CPU pilot and private Site connection were documented; the pilot source is **not** confirmed to be in this ZIP.

This new `faceswap/` tree is not a wholesale import of the historical Python/Electron application. Existing assets, models, credentials, user data and installers are not copied to the public repository.

## Deployment protection

The repository's active Firebase publishing path is `.pages-site`. This folder is not included in that output by default. Do not edit root deployment configuration or publish to production until reviewed and tested.

## Verify

Run `node --test faceswap/tests/smoke.mjs` from the repository root. Node checks cover geometry, format selection, browser gating and privacy-facing UI text. The GitHub Actions workflow runs syntax checks and tests. **Automated Chromium QA now passes**: [run 41297129563](https://github.com/junl-im/meta/actions/runs/41297129563) verifies six real browser flows: desktop and Pixel 7 mobile **emulation** × local synthetic video/audio record/download, consent/reset handling, and repeated recording. The synthetic input includes a 440 Hz sine track. FFprobe verifies recorded audio/video streams and packet extent; FFmpeg decodes the output and checks non-silent volume. This does **not** prove physical Android/iOS playback, model detection success, accurate A/V synchronization or original source-audio fidelity. A MediaRecorder WebM file may lack a container `Duration` field even when video packets contain valid timestamps, so dependable seeking/export requires a proper media muxer in a later milestone.

Run `npm install`, `npx playwright install chromium`, prepare synthetic fixtures as in `.github/workflows/faceswap-ci.yml`, then `npm run test:browser` to reproduce. A static local server is started automatically. Future manual QA must cover Chrome/Edge desktop, Chrome Android and Safari iOS, including MediaPipe CDN failures and silent-output fallbacks.

## Try the browser lab

1. Serve `faceswap/` from a static HTTPS host or local dev server.
2. Choose a consented short video and reference portrait. Confirm usage rights.
3. Click **3초 샘플 생성** to record a labeled picture overlay without any model download.
4. Optionally acknowledge the SDK/model-network notice and click **얼굴 위치 자동 검출** to use automatic placement. This requires network for first load.
5. Preview/download the output. A recording result is a **visual-composition test**, not an AI swap. Playback/encoding/audio support differs by browser.
