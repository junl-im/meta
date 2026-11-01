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
- Mediabunny and ONNX Runtime Web remain research leads, not installed runtime dependencies.

## Source status

Other entries are research leads, not integrations. The app can locate face positions and record a labeled video overlay, but **cannot yet perform AI face swapping**.
