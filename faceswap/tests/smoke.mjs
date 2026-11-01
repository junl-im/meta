import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chooseCandidateBackend, formatMiB, probeCapabilities } from "../src/capabilities.mjs";

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
  for (const name of ["index.html", "styles.css", "src/app.mjs"]) {
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
