import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chooseCandidateBackend, formatMiB, probeCapabilities } from "../src/capabilities.mjs";
import {normalizeFaceBox, findFaceBox, loadFaceDetector, modelAssets} from "../src/face_detector.mjs";
import {outputDimensions, chooseRecordingFormat, drawOverlayFrame, defaultBox} from "../src/compositor.mjs";


const base = new URL("../", import.meta.url);
const read = (name) => readFileSync(fileURLToPath(new URL(name, base)), "utf8");

test("backend candidates are explicit and do not imply inference success", () => {
  assert.equal(chooseCandidateBackend({webgpu: true, wasm: true}), "WebGPU 후보");
  assert.equal(chooseCandidateBackend({webgpu: false, wasm: true}), "WASM 후보");
  assert.equal(chooseCandidateBackend({webgpu: false, wasm: false}), "지원 미확인");
});

test("file size labels remain deterministic", () => {
  assert.equal(formatMiB(1048576), "1.0 MiB");
  assert.equal(formatMiB(-1), "확인 불가");
});

test("feature probe handles unsupported browser without throwing", async () => {
  const report = await probeCapabilities({
    navigator: {},
    WebAssembly: undefined,
    VideoEncoder: undefined,
    VideoDecoder: undefined
  });
  assert.equal(report.webgpu, false);
  assert.equal(report.wasm, false);
  assert.equal(report.webcodecsEncoder, false);
});

test("feature probe reports supported mock APIs", async () => {
  const report = await probeCapabilities({
    navigator: {
      gpu: { requestAdapter: async () => ({}) },
      storage: {
        estimate: async () => ({quota: 1024, usage: 128}),
        persisted: async () => false
      }
    },
    WebAssembly: {},
    VideoEncoder: function VideoEncoder() {},
    VideoDecoder: function VideoDecoder() {},
    crossOriginIsolated: true
  });
  assert.equal(report.webgpu, true);
  assert.equal(report.webcodecsDecoder, true);
  assert.equal(report.storageEstimate.usage, 128);
});

test("web UI contains no SVG and never loads a native localhost engine", () => {
  for (const name of ["index.html", "styles.css", "src/app.mjs", "src/video_lab.mjs", "src/compositor.mjs", "src/face_detector.mjs"]) {
    const source = read(name);
    assert.doesNotMatch(source, /<svg\b|\.svg\b|data:image\/svg/i, name);
    assert.doesNotMatch(source, /127\.0\.0\.1|localhost:7869/i, name);
  }
});

test("UI discloses the prototype limitation and uses local-only inputs", () => {
  const html = read("index.html");
  const js = read("src/app.mjs");
  assert.match(html, /얼굴 교체 기능은 아직 연결되지 않았어/);
  assert.match(html, /type="file" accept="video\/\*"/);
  assert.match(html, /type="file" accept="image\/\*"/);
  assert.match(js, /URL\.createObjectURL\(file\)/);
  assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest\b/);
  assert.match(js, /consentAttestedByUser/);
});


test("pixel face region becomes safe fractional bounds", () => {
  assert.deepEqual(normalizeFaceBox({originX: 25, originY: 30, width: 20, height: 30}, 100, 100, 1),
    {x: 0.25, y: 0.3, width: 0.2, height: 0.3});
  const clipped = normalizeFaceBox({originX: -10, originY: -5, width: 50, height: 50}, 100, 100, 1);
  assert.equal(clipped.x, 0);
  assert.equal(clipped.y, 0);
  assert.equal(clipped.width, 0.4);
  assert.equal(normalizeFaceBox(null, 100, 100), null);
  assert.equal(normalizeFaceBox({originX: 0, originY: 0, width: 1, height: 1}, 0, 0), null);
});

test("face detector initialization stays explicit and injection-testable", async () => {
  let modulePath;
  let modelOptions;
  const result = await loadFaceDetector(async (path) => {
    modulePath = path;
    return {
      FilesetResolver: {forVisionTasks: async () => "fake-runtime"},
      FaceDetector: {createFromOptions: async (_files, options) => {
        modelOptions = options;
        return {detectForVideo: () => ({detections: [{boundingBox: {
          originX: 10, originY: 20, width: 20, height: 40
        }}]})};
      }}
    };
  });
  assert.equal(modulePath, modelAssets.moduleUrl);
  assert.equal(modelOptions.runningMode, "VIDEO");
  assert.equal(modelOptions.baseOptions.delegate, "CPU");
  const normalized = findFaceBox(result, {videoWidth: 100, videoHeight: 100}, 250);
  for (const [key, expected] of Object.entries({x: 0.088, y: 0.176, width: 0.224, height: 0.448})) {
    assert.ok(Math.abs(normalized[key] - expected) < 1e-10, key);
  }
});

test("output video size remains within cap and even on mobile", () => {
  assert.deepEqual(outputDimensions(1920, 1080, 960), {width: 960, height: 540});
  assert.deepEqual(outputDimensions(721, 1281, 960), {width: 540, height: 960});
  assert.equal(outputDimensions(0, 1080), null);
});

test("video format selects supported recorder output, otherwise blocks", () => {
  assert.deepEqual(chooseRecordingFormat({isTypeSupported: (x) => x === "video/webm"}),
    {mimeType: "video/webm", extension: "webm"});
  assert.equal(chooseRecordingFormat({isTypeSupported: () => false}), null);
  assert.equal(chooseRecordingFormat(null), null);
});

test("canvas compositor draws original, face overlay and explicit demo label", () => {
  const calls = [];
  const ctx = {
    canvas: {width: 480, height: 270},
    clearRect: (...args) => calls.push(["clearRect", ...args]),
    drawImage: (...args) => calls.push(["drawImage", ...args]),
    save: () => {}, restore: () => {}, beginPath: () => {}, ellipse: () => {},
    clip: () => {}, fillRect: () => {}, fillText: (...args) => calls.push(["fillText", ...args])
  };
  const video = {kind: "video"};
  const portrait = {naturalWidth: 200, naturalHeight: 300};
  drawOverlayFrame(ctx, video, portrait, defaultBox);
  assert.equal(calls.filter((item) => item[0] === "drawImage").length, 2);
  assert.equal(calls[1][1], video);
  assert.match(calls.find((item) => item[0] === "fillText")[1], /NOT AI SWAP/);
});

test("experimental media path is local and network model is opt-in", () => {
  const html = read("index.html");
  const js = read("src/video_lab.mjs");
  const detector = read("src/face_detector.mjs");
  assert.match(html, /id="model-consent"/);
  assert.match(html, /id="download-demo"/);
  assert.match(html, /AI 신원 교체나 자연스러운 얼굴 합성은 아직 아니야/);
  assert.match(js, /modelOptIn.checked/);
  assert.match(js, /canvas.captureStream\(25\)/);
  assert.match(js, /new MediaRecorder\(stream/);
  assert.match(js, /inputReady\(\)/);
  assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest\b/);
  assert.match(detector, /mediapipe\/tasks-vision@1\.2\.0/);
  assert.doesNotMatch(detector, /inswapper_128|insightface/);
});
