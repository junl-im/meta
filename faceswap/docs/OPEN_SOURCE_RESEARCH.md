# Candidate sources and licensing review (2026-11-01)

This is a research ledger, **not** a list of bundled dependencies. Verify pinned versions and model weights separately before integration.

| Area | Candidate | Source | Initial decision |
| --- | --- | --- | --- |
| Browser inference | ONNX Runtime Web | https://github.com/microsoft/onnxruntime | Primary WebGPU/WASM adapter; check operator support |
| Face/hand landmarks | MediaPipe Tasks | https://github.com/google-ai-edge/mediapipe | v0.7.1 opt-in face-location detector; landmark/segmentation still candidates |
| Official web examples | MediaPipe Samples Web | https://github.com/google-ai-edge/mediapipe-samples-web | Reusable patterns after notice review (Apache-2.0) |
| Video read/write | Mediabunny | https://github.com/Vanilagy/mediabunny | Preferred browser media tool; MPL-2.0 notice obligations |
| Compositing | OpenCV.js | https://github.com/opencv/opencv | Candidate masks, alignment, blending (Apache-2.0) |
| UI worker isolation | Comlink | https://github.com/GoogleChromeLabs/comlink | Candidate worker messaging (Apache-2.0) |
| PWA offline | Workbox | https://github.com/GoogleChrome/workbox | Candidate cache (MIT) |
| OCR | Tesseract.js | https://github.com/naptha/tesseract.js | Optional text-lock helper |
| Caption STT | whisper.cpp WASM | https://github.com/ggml-org/whisper.cpp | Optional, benchmark mobile memory |
| Video segmentation | SAM 2 | https://github.com/facebookresearch/sam2 | High-end mode; Apache-2.0 checkpoint claims, too heavy to assume mobile |
| Object detection | GroundingDINO | https://github.com/IDEA-Research/GroundingDINO | High-end Product Lock research; model rights review |
| Motion | SEA-RAFT | https://github.com/princeton-vl/SEA-RAFT | Optional optical flow (BSD-3-Clause) |
| Upscaling | Real-ESRGAN | https://github.com/xinntao/Real-ESRGAN | Optional high-end renderer (BSD-3-Clause code) |
| Portrait animation | LivePortrait | https://github.com/KlingAIResearch/LivePortrait | Reference only until third-party weight rights verified |
| Generative replacement | Wan-Animate-2 | https://huggingface.co/Wan-AI/Wan2.2-Animate-2-14B | Optional advanced 14B model (official model card Apache-2.0); not mobile browser |
| Provenance | C2PA JS | https://github.com/contentauth/c2pa-js | Output metadata/signing research |
| UI timeline ideas | OpenCut | https://github.com/OpenCut-app/OpenCut | Design reference; upstream rewrite in progress |
| Native face processing | FaceFusion | https://github.com/facefusion/facefusion | Existing pilot reference; OpenRAIL-AS and separate model terms |
| Real-time face swap | Deep-Live-Cam | https://github.com/hacksider/Deep-Live-Cam | Structural reference; AGPL-3.0 |
| Browser swap proof | NewFace | https://github.com/alphastack1/new-face-live | Reference only; no verified distributable model permission |
| Pretrained identity models | InsightFace | https://github.com/deepinsight/insightface | Code MIT, bundled/pretrained models noncommercial unless separately licensed |

## Blocking license warning

InsightFace explicitly states its training data and pretrained models are for non-commercial research, and directs inswapper licensing requests to its rights holder. The presence of `inswapper_128.onnx` in an open repository does not authorize commercial redistribution. Keep all such weights out of this repository until a signed/clear license is available.

Do not copy third-party models, pretrained face embeddings, source actor photos or user footage into GitHub. Public repo files must be clean of personal media and credentials.

## 2026-11-01 v0.7.1 integration note

- MediaPipe Tasks Vision `@mediapipe/tasks-vision@1.2.0` (Apache-2.0 package) and Google's BlazeFace short-range detector are dynamically loaded only after a separate user opt-in. Model rights and model-card notices require final pre-release review. Detection is NOT face replacement.
- Browser-native Canvas `captureStream` + `MediaRecorder` are used for a 3-second visual overlay output test; saved container may be MP4 or WebM depending on browser codec support. Full audio preservation is **not** yet verified.
- The official MediaPipe npm privacy notice says the SDK processes media on device, but may send usage/performance metrics to Google. UI discloses this before optional model loading.
- No pretrained identity swap weights, face embeddings, actor footage or source images have been added to the repo.
- Mediabunny remains a research lead; ONNX Runtime Web is now an opt-in synthetic-only runtime dependency in v0.7.8 (no user checkpoint execution).

## Source status

Other entries are research leads, not integrations. The app can locate face positions and record a labeled video overlay, but **cannot yet perform AI face swapping**.

## 2026-11-01 v0.7.6 — AI swap checkpoint rights audit

This table distinguishes project source licenses, **pretrained weights**, and a complete usable pipeline. An ONNX file is not automatically freely licensed just because its execution code is.

| Candidate | Code | Weights / complete dependency chain | Decision for public web release |
| --- | --- | --- | --- |
| InsightFace / InSwapper | MIT source | InsightFace README explicitly says released pretrained models / training data are noncommercial by default; its 2025-11-24 notice directs commercial InSwapper licensing to contact@insightface.ai. [Official README](https://github.com/deepinsight/insightface/blob/master/README.md) | **BLOCK** any redistribution / commercial inference before a separate license. |
| SimSwap | CC BY-NC 4.0 declared for whole project | README states academic and non-commercial use only. [Official README](https://github.com/neuralchen/SimSwap) | **BLOCK** commercial pipeline. |
| FaceFusion | OpenRAIL-AS source | Official face-swapper module lists some downloadable swap weights including InSwapper as **Non-Commercial**; project license alone cannot relicense weights. [Official swapper module](https://github.com/facefusion/facefusion/blob/master/facefusion/processors/modules/face_swapper/core.py) | **REFERENCE ONLY**, inspect individual model entry and full encoder stack. |
| Deep-Live-Cam | AGPL-3.0 source | Official README credits InsightFace and warns the used model is only for non-commercial research. [Official README](https://github.com/hacksider/Deep-Live-Cam) | **REFERENCE ONLY**, no bundled weights. |
| GHOST / SberSwap | Apache-2.0 repository | A project collaborator said GHOST model weights are Apache-2.0 commercially usable, but its issue thread raised unresolved CC BY-NC-SA code and ArcFace weight questions. The published pipeline loads an ArcFace model. [Maintainer issue #88](https://github.com/ai-forever/ghost/issues/88), [official repository](https://github.com/ai-forever/ghost), [training source](https://github.com/ai-forever/ghost/blob/main/train.py) | **PROMISING GENERATOR, NOT APPROVED FULL PIPELINE**; independently audit detector, ArcFace, generator checkpoint and ONNX conversion. |

**Runtime assessment:** [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) supports local WASM and optional WebGPU execution, but WebGPU only supports a subset of operators and support differs by browser. [Official browser matrix](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) lists WASM broadly and no WebGPU support for iOS Safari/Firefox in its matrix; do not imply real mobile performance until benchmarked. WebGPU acceleration is a separate decision from checkpoint rights. No ONNX swap model, model embeddings, or third-party checkpoints are bundled.

**v0.7.6 actual integration:** Added `src/model_preflight.mjs` and `src/model_lab.mjs` as a zero-network local ONNX/ORT **file integrity and user-declared rights preflight**. A small JSON description carries model filename, SHA-256, weights-license ID, HTTPS evidence URL, and an explicit commercial-use claim; WebCrypto calculates SHA-256 of the full local model. It rejects invalid schema, non-HTTPS evidence, omitted license claim, hash mismatch and memory-overbudget files. Neither manifest URL nor model bytes are sent by application code; the evidence URL is a declaration, **not an independent legal verification**. Browser does **not** load the model, perform a tensor inference, or swap a face. Current WebCrypto single-buffer limit: 64 MiB when deviceMemory is known <= 4 GB, otherwise 256 MiB; streamed hashing/worker and model execution remain future work. Details: [LOCAL_MODEL_PACKAGE.md](./LOCAL_MODEL_PACKAGE.md).

## 2026-11-01 v0.7.8 — real *synthetic* ONNX WASM inference

- Pinned [ONNX Runtime Web `1.31.1`](https://www.npmjs.com/package/onnxruntime-web) (MIT code, npm devDependency for same-origin browser QA) provides the WebAssembly CPU inference engine. Its CDN assets are fetched only on explicit checkbox + click in the production static app. The package license is distinct from any third-party face-swap **checkpoint** rights.
- `src/synthetic_onnx.mjs` builds an original IR-v8 / opset-13 `Add` graph from in-memory protobuf bytes. Two scalar-like float32 `[1]` tensors containing `2` and `3` produce exactly `5` when the engine operates correctly. No third-party model weights or personal media appear in the graph.
- `src/onnx_probe.mjs` loads the CPU-specific `ort.wasm.min.js`, chooses the `wasm` provider with one thread and no proxy, executes the graph, validates its output and releases the session. The QA route `__qa_ort` serves only a restricted allowlist of matching pinned runtime assets; browser tests assert no external requests. This proves one numeric operator, **not** the real swap model operator set, low-memory viability or video inference throughput.
- Browser support must be measured separately. [Official ONNX Runtime Web support matrix](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) shows WASM reaches more browsers than WebGPU, while ONNX model/operator coverage, secure-context requirements and device memory limits vary. [Upstream ONNX Runtime issue #33516](https://github.com/microsoft/onnxruntime/issues/33516) reports WebKit peak memory regression with a general/JSEP runtime bundle; the prototype deliberately requests CPU-only WASM instead of the broader `ort.min.js`. The exact issue may change upstream and does not constitute a measured memory ceiling for this app.
- Loading a third-party CDN runtime can disclose the browser IP/network metadata to that CDN. The user must opt in; selecting a private photo/video does not cause a runtime request and the synthetic test never reads those files. This is *not* an independently audited zero-telemetry guarantee for upstream code.
- **Commercial-grade face swap remains blocked** pending complete per-weight and per-dependency provenance, commercial/distribution permission, live operator compatibility and physical-device QA. Neither GHOST nor InsightFace checkpoints are distributed.
