import test from "node:test";
import {createHash} from "node:crypto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chooseCandidateBackend, formatMiB, probeCapabilities } from "../src/capabilities.mjs";
import {normalizeFaceBox, findFaceBox, loadFaceDetector, modelAssets} from "../src/face_detector.mjs";
import {outputDimensions, chooseRecordingFormat, drawOverlayFrame, defaultBox} from "../src/compositor.mjs";
import {prepareAudioCapture, closeAudioCapture} from "../src/audio_capture.mjs";
import {repairWebmDuration} from "../src/webm_duration.mjs";
import {validateModelManifest, verifyLocalModelPackage, modelByteLimit, MODEL_PACKAGE_SCHEMA} from "../src/model_preflight.mjs";
import {Sha256Stream, sha256BlobInChunks, HASH_CHUNK_BYTES} from "../src/sha256_stream.mjs";
import {hashFileInWorker} from "../src/sha256_worker_client.mjs";
import {createSyntheticAddModel,SYNTHETIC_FEEDS} from "../src/synthetic_onnx.mjs";
import {runSyntheticWasmInference,ORT_WEB_VERSION,ORT_CDN_DIST} from "../src/onnx_probe.mjs";


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
  for (const name of ["index.html", "styles.css", "src/app.mjs", "src/video_lab.mjs", "src/compositor.mjs", "src/audio_capture.mjs", "src/webm_duration.mjs", "src/face_detector.mjs"]) {
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

test("local audio bridge reuses the element source and disposes each track", async () => {
  const events = [];
  let constructed = 0;
  class FakeContext {
    constructor() { constructed++; this.destination = {kind: "speakers"}; }
    createMediaElementSource() {
      return {
        connect: (target) => events.push(["connect", target.kind || "capture"]),
        disconnect: () => events.push(["disconnect"])
      };
    }
    createMediaStreamDestination() {
      const track = {readyState: "live", stop: () => {
        track.readyState = "ended";
        events.push(["stop"]);
      }};
      return {kind: "capture", stream: {getAudioTracks: () => [track]}};
    }
    resume() { return Promise.resolve(); }
    close() { events.push(["close"]); return Promise.resolve(); }
  }
  const element = {};
  const first = prepareAudioCapture(element, {AudioContext: FakeContext});
  await first.resume();
  assert.equal(first.track.readyState, "live");
  first.dispose();
  first.dispose();
  assert.equal(first.track.readyState, "ended");
  const second = prepareAudioCapture(element, {AudioContext: FakeContext});
  assert.equal(constructed, 1);
  assert.equal(second.track.readyState, "live");
  second.dispose();
  await closeAudioCapture(element);
  assert.equal(events.filter(([type]) => type === "disconnect").length, 2);
  assert.equal(events.filter(([type]) => type === "stop").length, 2);
  assert.equal(events.filter(([type]) => type === "close").length, 1);
  assert.equal(prepareAudioCapture({}, {}), null);
});

test("WebM metadata repair appends a finite Duration without re-encoding", async () => {
  // Minimal EBML Header / unknown-size Segment / Info / TimestampScale.
  const bytes = Uint8Array.from([
    0x1a, 0x45, 0xdf, 0xa3, 0x80,
    0x18, 0x53, 0x80, 0x67, 0xff,
    0x15, 0x49, 0xa9, 0x66, 0x88,
    0x2a, 0xd7, 0xb1, 0x84, 0x00, 0x0f, 0x42, 0x40
  ]);
  const original = new Blob([bytes], {type: "video/webm"});
  const result = await repairWebmDuration(original, 2500);
  assert.equal(result.repaired, true);
  assert.equal(result.reason, "inserted");
  assert.equal(result.blob.size, original.size + 11);
  const fixed = new Uint8Array(await result.blob.arrayBuffer());
  assert.equal(fixed[14], 0x93); // Info payload grows 8 -> 19 bytes.
  assert.deepEqual(Array.from(fixed.slice(15, 23)), Array.from(bytes.slice(15)));
  assert.deepEqual(Array.from(fixed.slice(23, 26)), [0x44, 0x89, 0x88]);
  assert.equal(new DataView(fixed.buffer, 26, 8).getFloat64(0), 2500);
  const second = await repairWebmDuration(result.blob, 2500);
  assert.equal(second.repaired, false);
  assert.equal(second.reason, "already-present");
  assert.equal(second.blob.size, result.blob.size);
});

test("WebM repair leaves malformed, unsupported, and MP4 bytes untouched", async () => {
  const randomWebm = new Blob([Uint8Array.from([1, 2, 3])], {type: "video/webm"});
  const mp4 = new Blob([Uint8Array.from([1, 2, 3])], {type: "video/mp4"});
  for (const [blob, duration] of [
    [randomWebm, 3000], [mp4, 3000], [randomWebm, -2]
  ]) {
    const result = await repairWebmDuration(blob, duration);
    assert.equal(result.repaired, false);
    assert.strictEqual(result.blob, blob);
  }
});

const testModelBytes = Uint8Array.from([3, 7, 11, 19, 23]);
const testModelHash = createHash("sha256").update(testModelBytes).digest("hex");
const modelFile = () => Object.assign(new Blob([testModelBytes]), {name: "authorized.onnx"});
const manifestData = () => ({
  schema: MODEL_PACKAGE_SCHEMA,
  name: "Authorized prototype model",
  filename: "authorized.onnx",
  format: "onnx",
  sha256: testModelHash,
  weightsLicense: {
    id: "Separate-weight-license",
    evidenceUrl: "https://example.org/model-rights",
    commercialUseConfirmed: true
  }
});
const manifestFile = (data) => Object.assign(new Blob([JSON.stringify(data)]), {name: "model-manifest.json"});

test("model preflight accepts only a scoped, explicitly described weight license", () => {
  const valid = validateModelManifest(manifestData(), "authorized.onnx");
  assert.equal(valid.sha256, testModelHash);
  const variants = [
    {...manifestData(), weightsLicense: {...manifestData().weightsLicense, commercialUseConfirmed: false}},
    {...manifestData(), weightsLicense: {...manifestData().weightsLicense, evidenceUrl: "http://example.org/"}},
    {...manifestData(), weightsLicense: {...manifestData().weightsLicense, id: ""}},
    {...manifestData(), sha256: "abc"},
    {...manifestData(), filename: "another.onnx"},
    {...manifestData(), format: "pth"},
    {...manifestData(), schema: "invalid"}
  ];
  for (const variant of variants) {
    assert.throws(() => validateModelManifest(variant, "authorized.onnx"));
  }
  assert.equal(modelByteLimit(4), 2 * 1024 * 1024 * 1024);
  assert.equal(modelByteLimit(8), 2 * 1024 * 1024 * 1024);
});

test("local package integrity compares all weight bytes and never runs inference", async () => {
  const result = await verifyLocalModelPackage({
    modelFile: modelFile(), manifestFile: manifestFile(manifestData()),
    onProgress: () => {}
  });
  assert.equal(result.sha256, testModelHash);
  assert.equal(result.integrityVerified, true);
  assert.equal(result.inferenceCompleted, false);
  assert.equal(result.identitySwapCompleted, false);
  assert.equal(result.mediaUploaded, false);
  assert.match(result.licenseStatus, /unverified/);
});

test("tampered model, malformed manifest and over-budget files fail closed", async () => {
  const run = (model, manifest, options = {}) => verifyLocalModelPackage({
    modelFile: model, manifestFile: manifest,
    ...options
  });
  const tampered = Object.assign(new Blob([Uint8Array.from([9])]), {name: "authorized.onnx"});
  await assert.rejects(run(tampered, manifestFile(manifestData())), /SHA-256/);
  await assert.rejects(run(modelFile(), Object.assign(new Blob(["{"]), {name: "broken.json"})), /JSON/);
  const huge = {name: "authorized.onnx", size: 3 * 1024 * 1024 * 1024};
  await assert.rejects(run(huge, manifestFile(manifestData())), /최대 2 GiB/);
  await assert.rejects(run(modelFile(), manifestFile(manifestData()), {hashFile: null}), /SHA-256/);
});

test("model UI is local-only, with explicit rights and truth-in-labeling", () => {
  const html = read("index.html");
  const modelUI = read("src/model_lab.mjs");
  const preflight = read("src/model_preflight.mjs");
  assert.match(html, /id="local-model-file"/);
  assert.match(html, /id="local-model-manifest"/);
  assert.match(html, /id="local-model-rights"/);
  assert.match(html, /id="verify-local-model"/);
  assert.match(modelUI, /verifyLocalModelPackage/);
  assert.match(modelUI, /reset-button/);
  assert.doesNotMatch(modelUI + preflight, /\bfetch\s*\(|XMLHttpRequest\b|<svg\b|data:image\/svg/i);
  assert.match(html, /ONNX 실행·AI 얼굴 교체|실행 엔진은 아직 연결되지 않았어/);
});

test("streaming SHA-256 matches NIST vectors and independent Node crypto at boundaries", () => {
  assert.equal(new Sha256Stream().digestHex(),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(new Sha256Stream().update(new TextEncoder().encode("abc")).digestHex(),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  for (const size of [1,55,56,63,64,65,119,120,127,128,129,1023,1024,1025]) {
    const bytes = Uint8Array.from({length:size},(_,i)=>(i*37+11)%256);
    const expected = createHash("sha256").update(bytes).digest("hex");
    const sha = new Sha256Stream();
    for(let i=0;i<bytes.length;i+=7) sha.update(bytes.subarray(i,i+7));
    assert.equal(sha.digestHex(),expected,"length="+size);
    assert.throws(()=>sha.update(bytes),/이미 완료/);
  }
});

test("chunked file hashing stays within small reads, reports progress and hashes 2MiB correctly", async () => {
  const bytes=Uint8Array.from({length:2*1024*1024+147},(_,i)=>(i*17+3)%251);
  const blob=new Blob([bytes]);
  const progress=[];
  const sha=await sha256BlobInChunks(blob,{
    chunkBytes:65536,onProgress:(loaded,total)=>progress.push([loaded,total])
  });
  assert.equal(sha,createHash("sha256").update(bytes).digest("hex"));
  assert.ok(progress.length>30);
  assert.equal(progress.at(-1)[0],blob.size);
  assert.equal(HASH_CHUNK_BYTES,1048576);
});

test("chunked hashing checks abort before reading more chunks", async () => {
  const blob=new Blob([new Uint8Array(9000)]);
  let cancel=false;
  await assert.rejects(sha256BlobInChunks(blob,{
    chunkBytes:1024,shouldAbort:()=>cancel,
    onProgress:(loaded)=>{if(loaded>=2048)cancel=true;}
  }),/취소/);
  assert.equal(cancel,true);
});

test("worker bridge handles progress and cancellation with immediate termination", async () => {
  let terminated=0,received=false;
  class FakeWorker {
    constructor(){this.onmessage=null;}
    postMessage({file}) {
      received=Boolean(file);
      setTimeout(()=>this.onmessage?.({data:{type:"progress",loaded:3,total:3}}),0);
      setTimeout(()=>this.onmessage?.({data:{type:"done",sha256:testModelHash}}),1);
    }
    terminate(){terminated++;}
  }
  const progress=[];
  assert.equal(await hashFileInWorker(modelFile(),{
    WorkerCtor:FakeWorker,onProgress:(a,b)=>progress.push([a,b])
  }),testModelHash);
  assert.deepEqual(progress,[[3,3]]);
  assert.equal(terminated,1);
  assert.equal(received,true);
  const aborter=new AbortController();
  class HangingWorker{postMessage(){} terminate(){terminated++;}}
  const pending=hashFileInWorker(modelFile(),{
    WorkerCtor:HangingWorker,signal:aborter.signal
  });
  aborter.abort();
  await assert.rejects(pending,/취소/);
  assert.equal(terminated,2);
});

test("manifest preflight accepts large files without whole-buffer reads", async () => {
  let calls=0;
  const model={name:"authorized.onnx",size:300*1024*1024,
    arrayBuffer:()=>{throw new Error("whole-buffer read must never happen");}};
  const result=await verifyLocalModelPackage({
    modelFile:model,manifestFile:manifestFile(manifestData()),
    hashFile:async()=>{calls++;return testModelHash;}
  });
  assert.equal(result.integrityVerified,true);
  assert.equal(result.bytes,300*1024*1024);
  assert.equal(calls,1);
});

test("tiny original ONNX test graph is deterministic, local and contains Add(a,b)->sum", () => {
  const first=createSyntheticAddModel(),second=createSyntheticAddModel();
  assert.deepEqual(first,second);
  assert.ok(first.byteLength>50&&first.byteLength<512);
  const text=new TextDecoder("latin1").decode(first);
  for(const token of ["synthetic_float_add","Add","sum","actor-swap-studio"])assert.ok(text.includes(token));
  assert.deepEqual(SYNTHETIC_FEEDS,{a:2,b:3,expected:5});
  assert.equal(ORT_WEB_VERSION,"1.31.1");
  assert.match(ORT_CDN_DIST,/onnxruntime-web@1\.31\.1\/dist/);
});

test("ONNX inference adapter requires actual numeric output and closes the session", async () => {
  let released=0,modelBytes=0;
  class FakeTensor{constructor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}}
  const fakeOrt={
    Tensor:FakeTensor,
    InferenceSession:{
      create:async(bytes,opts)=>{
        modelBytes=bytes.length;
        assert.deepEqual(opts.executionProviders,["wasm"]);
        return {
          run:async feeds=>({sum:{data:Float32Array.of(feeds.a.data[0]+feeds.b.data[0])}}),
          release:async()=>{released++;}
        };
      }
    }
  };
  const result=await runSyntheticWasmInference(fakeOrt,{now:()=>100});
  assert.equal(result.output,5);
  assert.equal(result.actualInferenceCompleted,true);
  assert.equal(result.identitySwapCompleted,false);
  assert.equal(result.mediaUploaded,false);
  assert.ok(modelBytes>50);
  assert.equal(released,1);
  const wrong={...fakeOrt,InferenceSession:{
    create:async()=>({run:async()=>({sum:{data:Float32Array.of(999)}}),
      release:async()=>{released++;}})
  }};
  await assert.rejects(runSyntheticWasmInference(wrong),/예상 결과 5/);
  assert.equal(released,2);
});

test("browser ONNX runtime is explicit opt-in and separates computation from face swap", () => {
  const html=read("index.html");
  const app=read("src/onnx_lab.mjs");
  const runtime=read("src/onnx_probe.mjs");
  assert.match(html,/id="onnx-runtime-consent"/);
  assert.match(html,/id="onnx-probe-button"[^>]*disabled/);
  assert.match(html,/인물이 없는 초소형 ONNX Add 계산 모델/);
  assert.match(app,/consent\.checked/);
  assert.match(app,/loadWasmRuntime\(\)/);
  assert.match(runtime,/ort\.wasm\.min\.js/);
  assert.match(runtime,/executionProviders:\["wasm"\]/);
  assert.doesNotMatch(app+runtime, /<svg\b|data:image\/svg/i);
});
