# v0.7.8 — synthetic ONNX WASM browser execution

Date: 2026-11-01  
Scope: non-personal numeric engine validation only; **NOT AI face swap**.

## Execution boundary

The local browser UI contains two deliberately separate model panels:

1. **Local checkpoint preflight**: user-selected .onnx/.ort + JSON rights statement/hash verification, entirely local, **never executes the user checkpoint**. Self-declared rights are not independent license verification.
2. **Synthetic ONNX runtime lab**: after a separate opt-in checkbox and user click, loads pinned ONNX Runtime Web `1.31.1` CPU-only WASM assets from jsDelivr. This invokes `ort.InferenceSession.create(..., {executionProviders:["wasm"]})`, runs an original tiny `Add` model on float32 shape `[1]` inputs `2` and `3`, validates `sum[0] === 5` and disposes the session.

The in-memory ONNX graph uses ModelProto IR version 8, opset 13, inputs `a` and `b`, output `sum`. No pretrained model, face detector, portraits, uploaded footage, reference identity embedding or facial swap inference is involved.

## Network / privacy contract

- No runtime fetch until the user checks the runtime network notice and clicks the execution button. The main application does not send selected media to the CDN.
- The runtime CDN may learn connection metadata (e.g. IP address and request information). The full third-party runtime's own telemetry behavior is not independently audited. For a fully offline distribution, a later build needs a pinned/vetted local runtime asset package and notices.
- Browser compatibility QA injects `__faceswapQaRuntime = true` on loopback `127.0.0.1` and serves an allowlist of installed npm runtime assets under `/__qa_ort/` from the static QA server. Normal deployment does not route there. Browser QA asserts no external request and no runtime asset request before consent.
- This is an opt-in *engine capability test*, never a demonstration of facial replacement. Recording results remain `DEMO / NOT AI SWAP`.

## Code and verification

- `src/synthetic_onnx.mjs`: minimal deterministic protobuf ModelProto builder and input fixture.
- `src/onnx_probe.mjs`: pinned CDN URL, CPU-specific script loader, WasmPaths, single-thread WASM, tensor session, output validation, disposal.
- `src/onnx_lab.mjs`: opt-in UI binding, status/failure separation and reset.
- `tests/smoke.mjs`: deterministic ONNX model fixture; fake-ORT session result, cleanup and corrupted-result rejection; UI text and privacy conditions.
- `tests/e2e/browser-compat.spec.mjs`: Firefox and Linux WebKit automation attempts **actual** WASM inference on the synthetic model from locally served QA assets. It is not proof of iOS Safari on physical hardware.
- `.github/workflows/faceswap-ci.yml`: Node and browser checks. Treat any assertion as verified only after a successful CI run.

## Model rights and performance gates

[ONNX Runtime Web's official documentation](https://onnxruntime.ai/docs/tutorials/web/) differentiates WASM and WebGPU backends. Its [browser support matrix](https://onnxruntime.ai/docs/get-started/with-javascript/web.html) does not imply arbitrary swap model operator compatibility. [Upstream WebKit memory discussion #33516](https://github.com/microsoft/onnxruntime/issues/33516) concerns high memory for a general/JSEP bundle; we selected `ort.wasm.min.js` to avoid requesting that broader bundle, but **have not measured** the memory demand on low-end hardware.

A real commercial identity-swap deployment still requires a complete rights-cleared detection + facial identity encoding + swap generation chain with verified weight license, independent commercial permissions, ONNX operator/backend tests, mobile CPU/GPU memory constraints, film preservation rules (product/logo/text/hands), original-audio correctness and explicit user rights. Neither a passing `2+3` proof nor a successful SHA-256 check satisfies those requirements.
