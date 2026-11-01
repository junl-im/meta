# Local ONNX / ORT model preflight — v0.7.7

## What it does

This is a **local SHA-256 and user-declared model-weight rights check**, not an ONNX Runtime session, legal approval, face extraction, or identity swap. It never reads or uploads a user video, portrait, identity embedding or model over a network. Opening an external license evidence URL is **not** part of the check. The user must separately evaluate authenticity and legal scope.

1. Obtain your **own** ONNX/ORT model with explicit rights to the **weights**, not just to its GitHub code. Verify that its detector/recognition/embedding dependencies are separately permitted.
2. Compute SHA-256 of the exact file using a local trusted command:
   - Windows PowerShell: `Get-FileHash -Algorithm SHA256 .\licensed-model.onnx`
   - Linux: `sha256sum licensed-model.onnx`
   - macOS: `shasum -a 256 licensed-model.onnx`
3. Create a UTF-8 JSON file with this **illustrative** format. Replace the filename, hash, license name, URL and rights evidence with **your verified information**. The zero digest shown will not match a real model.
4. Use the browser panel to choose both files, check the rights declaration, and run the local hash comparison. The app reports only matching bytes / self-declared license evidence.

```json
{
  "schema": "actor-swap-model-package/v1",
  "name": "My explicitly licensed model",
  "format": "onnx",
  "filename": "licensed-model.onnx",
  "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
  "weightsLicense": {
    "id": "REPLACE-WITH-ACTUAL-WEIGHTS-LICENSE",
    "evidenceUrl": "https://example.org/replace-with-real-license-document",
    "commercialUseConfirmed": true
  }
}
```

The `commercialUseConfirmed` field is a statement made by the user, **not an assertion by the project**. Do not set it to true without an applicable license. A license ID and HTTPS URL do not prove the document covers the exact checkpoint.

## Current limits and safety

- Allowed filenames end in `.onnx` or `.ort`; filename and format must match the JSON. Manifest at most 64 KiB.
- v0.7.7 hashes SHA-256 incrementally from **1 MiB file slices** in a same-origin module Web Worker (with a sliced fallback when Worker is unavailable). The pure-JavaScript SHA-256 implementation is tested against standard known vectors and independent Node crypto values at padding boundaries and across multi-MiB files. Unlike v0.7.6 WebCrypto digest(), it never needs the entire file in RAM. The current **2 GiB limit controls processing time and scope, not exact device memory**, and doesn't guarantee a browser can complete very large jobs.
- The UI shows progress and offers Cancel. Changing a model file, rights checkbox or pressing the global Reset aborts/terminates active work. Worker unsupported/failing browsers should report errors or use the documented chunked fallback; real handset performance still needs measurement.
- Comparing the entire file establishes only **byte equality with the supplied hash**. If the JSON is self-authored or malicious, it does not prove provenance; the pipeline cannot independently verify the license, authenticity, safety, operator compatibility, or performance.
- Neither ONNX Runtime nor a pretrained identity swap checkpoint has been included. This tool does **not** parse a model graph or execute arbitrary ONNX operators.
- Model and description inputs clear on overall Reset. A running Worker is terminated on Reset/cancel and its result cannot reappear. In a Worker-less fallback, a pending slice read can finish before the next abort check, but no stale result is displayed. No license evidence URL is fetched.
- Do not commit any proprietary weights, personal actor images, voice, embeddings or source video into the public GitHub repository.

## Gate to real AI rendering

1. Verify an end-to-end model chain under the desired distribution and commercial-use rights. Review GHOST + external ArcFace/detector rights and InsightFace commercial contact options.
2. Obtain a reproducibly pinned ONNX or ORT bundle and test operators against ONNX Runtime Web (WebGPU and WASM fallbacks) on real Windows, Android and iOS devices.
3. Run synthetic face-free test inference first, then consented short video inference with explicit `AI-generated` provenance and protected text/hands/logo areas.
4. Add cancelable background hashing/inference, memory budgeting, long-form decoding and muxing, source-audio preservation, A/V synchronization, and privacy assurance.
5. Keep GitHub draft PR unmerged and Firebase production unaffected until actual manual acceptance.

## SHA-256 implementation notes (v0.7.7)

[MDN's SubtleCrypto.digest documentation](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest) states that native digest() requires a complete buffer and has no streaming interface. The incremental implementation in `src/sha256_stream.mjs` performs SHA-256 rounds over chunked reads, and `src/sha256_worker.mjs` keeps CPU-intensive processing off the UI thread. [Workers and termination](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) are standard browser facilities. Tests compare many input boundaries, NIST empty/abc vectors, and multi-MiB payloads against Node crypto. This is byte-integrity plumbing only, not an audit of the upstream checkpoint or a model license.
