# Actor Swap Studio WEB — v0.7.6 local model preflight + cross-browser QA

Independent web-first workspace inside the `junl-im/meta` repository.

## Status (2026-11-01)

**Browser lab, not AI face swap.** The UI now includes a 3-second labeled picture-over-video recording test, optional MediaPipe face **location** detection, and a downloadable file (MP4 or WebM, chosen by browser capability). The photo overlay is not an identity replacement or realistic face-swap inference. The browser uses a reusable local Web Audio capture bridge when available, with native captureStream as a fallback. An audio-start timeout prevents Firefox from hanging indefinitely on a suspended AudioContext. A bounded EBML metadata pass adds missing WebM Duration on supported MediaRecorder output without transcoding or network access. Unsupported recorder APIs are explained in a separate UI status line. Chromium E2E checks the recorded synthetic 440 Hz tone is actually non-silent; absence of an audio track is explicitly labeled silent, but source-audio fidelity and lip synchronization are not yet proven. No user footage or portrait is uploaded by our application.

## v0.7.6 local model gate

A separate panel accepts a user-owned `.onnx` or `.ort` checkpoint and a small JSON manifest specifying a weight-license statement plus exact SHA-256. The browser validates format, filename, user-declared commercial weight rights + HTTPS evidence URL and whole-file SHA-256 **without a network request**. This is a **byte-integrity / user declaration check only**, not license authentication, model execution or actual AI swap. It intentionally rejects large files: 64 MiB on known <=4 GiB devices or 256 MiB otherwise; streaming background hashing is a later milestone. See [local package guide](docs/LOCAL_MODEL_PACKAGE.md) and [model rights audit](docs/OPEN_SOURCE_RESEARCH.md).

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
- `src/webm_duration.mjs` — local EBML Duration repair on eligible MediaRecorder WebM files; unsupported structures pass through unchanged.
- `src/model_preflight.mjs` and `src/model_lab.mjs` — inert ONNX/ORT SHA-256, model-weights license self-declaration and local-only browser controls.
- `docs/LOCAL_MODEL_PACKAGE.md` — model manifest format, current memory caps, and future inference gates.
- `tests/smoke.mjs` — Node smoke/architecture checks.
- `docs/WEB_MIGRATION.md` — migration and acceptance gates.
- `docs/OPEN_SOURCE_RESEARCH.md` — source candidates and licensing gates.

## Baseline and provenance

The previous tested project is **Actor Swap Studio v0.6.6**, archived as `actor_swap_studio_mvp_v0.6.6.zip` in the established Google Drive folder. Archive contains backend (FastAPI/Python), web UI, QA, batch jobs, Electron packaging and tests. Its SHA-256 is documented in the Notion MASTER development log. On 2026-10-27 a separate local FaceFusion CPU pilot and private Site connection were documented; the pilot source is **not** confirmed to be in this ZIP.

This new `faceswap/` tree is not a wholesale import of the historical Python/Electron application. Existing assets, models, credentials, user data and installers are not copied to the public repository.

## Deployment protection

The repository's active Firebase publishing path is `.pages-site`. This folder is not included in that output by default. Do not edit root deployment configuration or publish to production until reviewed and tested.

## Verify

Run `node --test faceswap/tests/smoke.mjs` from the repository root. Node checks cover geometry, format selection, browser gating and privacy-facing UI text. The GitHub Actions workflow runs syntax checks and tests. **Automated Chromium QA now passes**: [run 41306889969](https://github.com/junl-im/meta/actions/runs/41306889969) verifies six Chromium render/browser flows: desktop and Pixel 7 mobile **emulation** × local synthetic video/audio record/download, consent/reset handling, and repeated recording. The synthetic input includes a 440 Hz sine track. FFprobe verifies recorded audio/video streams, packet extent, finite container Duration and bounded A/V end-time difference. FFmpeg decodes the output and checks non-silent volume. Playwright also seeks the generated result to 1.2 seconds. This does **not** prove physical Android/iOS playback, model detection success, accurate A/V synchronization or original source-audio fidelity. An eligible MediaRecorder WebM file that lacks a container `Duration` field is now repaired locally. Long-form seeking/cues, true A/V synchronization and cross-device MP4/WebM remux still require a proper media muxer in a later milestone (Mediabunny is a research candidate).

Run `npm install`, `npx playwright install chromium firefox webkit`, prepare synthetic fixtures as in `.github/workflows/faceswap-ci.yml`, then `npm run test:browser` to reproduce. A static local server is started automatically. A separate Playwright compatibility job adds six Firefox/Linux WebKit flows: UI/privacy and media gating for each engine, plus conditional actual recording. In CI, Firefox successfully produced a downloaded 3-second video track after the audio-start hang fix; Linux WebKit mobile emulation gracefully disabled recording because no MP4/WebM recording MIME type was available. These results do not prove physical iOS Safari/Android playback or Firefox audio fidelity. Future manual QA must cover Chrome/Edge desktop, Chrome Android and Safari iOS, including MediaPipe CDN failures and silent-output fallbacks.

## Try the browser lab

1. Serve `faceswap/` from a static HTTPS host or local dev server.
2. Choose a consented short video and reference portrait. Confirm usage rights.
3. Click **3초 샘플 생성** to record a labeled picture overlay without any model download.
4. Optionally acknowledge the SDK/model-network notice and click **얼굴 위치 자동 검출** to use automatic placement. This requires network for first load.
5. Preview/download the output. A recording result is a **visual-composition test**, not an AI swap. Playback/encoding/audio support differs by browser.

## Next milestone after v0.7.6

The model registry and SHA-256 do not validate ONNX operators or execute tensor inference. Next work is a rights-cleared **full** model/encoder/detector chain, then a pinned ONNX Runtime Web WASM/WebGPU smoke session with a synthetic non-personal fixture and device/memory benchmarking. The research log marks GHOST as a promising generator but not a rights-cleared full stack because its ArcFace dependency and third-party license concerns still require resolution. No public release is approved by this prototype.
