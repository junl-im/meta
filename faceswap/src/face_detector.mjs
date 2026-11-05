/** Opt-in on-device face position detector; no identity replacement. */
export const modelAssets = Object.freeze({
  moduleUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/+esm",
  wasmUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.0/wasm",
  modelUrl: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
});
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export function normalizeFaceBox(box, width, height, expansion = 1.12) {
  if (!box || ![width, height, box.originX, box.originY, box.width, box.height, expansion].every(Number.isFinite) ||
      width <= 0 || height <= 0 || box.width <= 0 || box.height <= 0 || expansion <= 0) return null;
  const sw = box.width * expansion, sh = box.height * expansion;
  const left = clamp(box.originX + (box.width - sw) / 2, 0, width);
  const top = clamp(box.originY + (box.height - sh) / 2, 0, height);
  const right = clamp(box.originX + (box.width + sw) / 2, 0, width);
  const bottom = clamp(box.originY + (box.height + sh) / 2, 0, height);
  return right > left && bottom > top
    ? {x: left / width, y: top / height, width: (right - left) / width, height: (bottom - top) / height}
    : null;
}
/** Network model/runtime fetch begins only when the user explicitly clicks Detect. */
export async function loadFaceDetector(importer = (url) => import(url)) {
  const {FaceDetector, FilesetResolver} = await importer(modelAssets.moduleUrl);
  const files = await FilesetResolver.forVisionTasks(modelAssets.wasmUrl);
  return FaceDetector.createFromOptions(files, {
    baseOptions: {modelAssetPath: modelAssets.modelUrl, delegate: "CPU"},
    runningMode: "VIDEO",
    minDetectionConfidence: 0.5
  });
}
export function findFaceBox(detector, video, timestampMs) {
  if (!detector || !video || !video.videoWidth || !video.videoHeight) return null;
  const detection = detector.detectForVideo(video, timestampMs)?.detections?.[0];
  return normalizeFaceBox(detection?.boundingBox, video.videoWidth, video.videoHeight);
}
