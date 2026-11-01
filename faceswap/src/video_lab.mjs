import {loadFaceDetector, findFaceBox} from "./face_detector.mjs";
import {prepareAudioCapture, closeAudioCapture} from "./audio_capture.mjs";
import {defaultBox, outputDimensions, chooseRecordingFormat, drawOverlayFrame} from "./compositor.mjs";

const get = (id) => document.getElementById(id);
const video = get("source-video");
const photo = get("reference-image");
const inputVideo = get("video-file");
const inputPhoto = get("face-file");
const consent = get("consent");
const modelOptIn = get("model-consent");
const detectButton = get("detect-button");
const renderButton = get("render-button");
const cancelButton = get("cancel-render");
const canvas = get("composite-canvas");
const resultVideo = get("result-video");
const download = get("download-demo");
const status = get("lab-status");
const scale = get("overlay-scale");
const opacity = get("overlay-opacity");
const context = canvas.getContext("2d", {alpha: false});

let detector = null;
let detectorLoading = false;
let currentBox = defaultBox;
let job = null;
let outputUrl = null;
let generation = 0;

const announce = (message) => { status.textContent = message; };
const inputReady = () => Boolean(
  context && consent.checked && inputVideo.files?.length && inputPhoto.files?.length &&
  video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth &&
  photo.complete && photo.naturalWidth
);
function updateButtons() {
  const ready = inputReady();
  detectButton.disabled = !ready || !modelOptIn.checked || detectorLoading || Boolean(job);
  renderButton.disabled = !ready || Boolean(job) || !chooseRecordingFormat(globalThis.MediaRecorder) ||
    typeof canvas.captureStream !== "function";
  cancelButton.disabled = !job;
}
function clearOutput() {
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  outputUrl = null;
  resultVideo.pause();
  resultVideo.removeAttribute("src");
  resultVideo.load();
  resultVideo.hidden = true;
  download.removeAttribute("href");
  download.hidden = true;
}
function showFrame() {
  if (!inputReady() || !context) return;
  const dimensions = outputDimensions(video.videoWidth, video.videoHeight);
  if (!dimensions) return;
  if (canvas.width !== dimensions.width || canvas.height !== dimensions.height) {
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
  }
  drawOverlayFrame(context, video, photo, currentBox, scale.value, opacity.value);
}
function cancelWork(message = "샘플 생성을 취소했어.") {
  if (!job) return;
  job.aborted = true;
  job.message = message;
  job.finish();
}
function invalidate() {
  generation++;
  cancelWork("입력이 변경돼 작업을 중단했어.");
  currentBox = defaultBox;
  clearOutput();
  updateButtons();
}
inputVideo.addEventListener("change", invalidate);
inputPhoto.addEventListener("change", invalidate);
consent.addEventListener("change", invalidate);
// Reset clears file inputs programmatically, so no input change event is fired.
get("reset-button").addEventListener("click", () => {
  invalidate();
  announce("초기화했어. 새 영상과 참고 사진을 선택하면 다시 실험할 수 있어.");
});
video.addEventListener("loadeddata", () => { updateButtons(); showFrame(); });
video.addEventListener("loadedmetadata", updateButtons);
photo.addEventListener("load", () => { updateButtons(); showFrame(); });
video.addEventListener("error", updateButtons);
photo.addEventListener("error", updateButtons);
modelOptIn.addEventListener("change", () => {
  if (!modelOptIn.checked) {
    detector?.close?.();
    detector = null;
    announce("얼굴 검출 모델 사용을 해제했어. 수동 중앙 위치로 샘플을 만들 수 있어.");
  }
  updateButtons();
});
scale.addEventListener("input", showFrame);
opacity.addEventListener("input", showFrame);

detectButton.addEventListener("click", async () => {
  if (!inputReady() || !modelOptIn.checked || detectorLoading || job) return;
  detectorLoading = true;
  const thisGeneration = generation;
  updateButtons();
  announce("MediaPipe 실행 파일·얼굴 위치 모델을 내려받고 있어. 사진·영상은 서버로 업로드하지 않아.");
  try {
    const instance = detector || await loadFaceDetector();
    if (thisGeneration !== generation || !modelOptIn.checked) {
      if (instance !== detector) instance.close?.();
      return;
    }
    detector = instance;
    const face = findFaceBox(detector, video, performance.now());
    if (face) {
      currentBox = face;
      showFrame();
      announce("현재 프레임에서 얼굴 위치를 찾았어. 이 기능은 얼굴 교체가 아닌 위치 검출이야.");
    } else {
      announce("이 프레임에서는 얼굴을 찾지 못했어. 샘플은 중앙 기본 위치로 만들 수 있어.");
    }
  } catch (error) {
    announce("얼굴 위치 모델을 열지 못했어: " + (error?.message || "브라우저/네트워크 제한") +
      ". 모델 없이 중앙 오버레이 샘플은 만들 수 있어.");
  } finally {
    detectorLoading = false;
    updateButtons();
  }
});

function seekStart() {
  return new Promise((resolve, reject) => {
    if (video.currentTime < 0.04 && !video.seeking) { resolve(); return; }
    const timeout = setTimeout(() => done(new Error("영상 처음 위치로 이동하지 못했어.")), 5000);
    function done(error) {
      clearTimeout(timeout);
      video.removeEventListener("seeked", onSeek);
      video.removeEventListener("error", onError);
      error ? reject(error) : resolve();
    }
    const onSeek = () => done();
    const onError = () => done(new Error("원본 영상에서 오류가 발생했어."));
    video.addEventListener("seeked", onSeek, {once: true});
    video.addEventListener("error", onError, {once: true});
    try { video.currentTime = 0; } catch (error) { done(error); }
  });
}

renderButton.addEventListener("click", async () => {
  if (!inputReady() || job) return;
  const selected = chooseRecordingFormat(globalThis.MediaRecorder);
  if (!selected || typeof canvas.captureStream !== "function") {
    announce("이 브라우저는 샘플 영상 녹화를 지원하지 않아.");
    return;
  }
  const thisGeneration = generation;
  let stream = null;
  let sourceStream = null;
  let audioCapture = null;
  let audioStartup = null;
  let recorder = null;
  let timeout = null;
  let raf = null;
  const chunks = [];
  const work = {aborted: false, message: "", finish: () => {}};
  job = work;
  clearOutput();
  updateButtons();
  announce("원본 첫 3초를 기기 안에서 처리할 준비를 하고 있어.");
  try {
    // AudioContext must start from a direct click, before the first await.
    try {
      audioCapture = prepareAudioCapture(video);
      audioStartup = audioCapture?.resume().catch(() => {
        audioCapture?.dispose();
        audioCapture = null;
      });
    } catch {
      audioCapture?.dispose();
      audioCapture = null;
    }
    video.pause();
    await seekStart();
    if (thisGeneration !== generation || work.aborted) {
      audioCapture?.dispose();
      if (job === work) job = null;
      video.controls = true;
      updateButtons();
      return;
    }
    showFrame();
    stream = canvas.captureStream(25);
    await audioStartup;
    if (thisGeneration !== generation || work.aborted) {
      audioCapture?.dispose();
      for (const track of stream.getTracks()) track.stop();
      if (job === work) job = null;
      video.controls = true;
      updateButtons();
      return;
    }
    if (audioCapture?.track.readyState === "live") {
      stream.addTrack(audioCapture.track);
    } else {
      // Fallback on browsers without Web Audio. It may expose no audio track.
      try {
        const capture = video.captureStream || video.mozCaptureStream;
        sourceStream = typeof capture === "function" ? capture.call(video) : null;
        for (const track of sourceStream?.getAudioTracks() || []) stream.addTrack(track);
      } catch { /* silent-output fallback is stated below */ }
    }
    const audioIncluded = stream.getAudioTracks().length > 0;
    recorder = new MediaRecorder(stream, {
      mimeType: selected.mimeType,
      videoBitsPerSecond: 2500000
    });
    work.finish = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (timeout !== null) clearTimeout(timeout);
      video.pause();
      if (recorder?.state !== "inactive") recorder?.stop();
    };
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data?.size) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => {
      work.aborted = true;
      work.message = "브라우저 영상 인코딩 중 오류가 발생했어.";
      work.finish();
    });
    recorder.addEventListener("stop", () => {
      for (const track of stream?.getVideoTracks() || []) track.stop();
      audioCapture?.dispose();
      for (const track of sourceStream?.getTracks() || []) track.stop();
      // Do not modify the user's original file.
      sourceStream = null;
      if (job === work) job = null;
      video.controls = true;
      updateButtons();
      if (work.aborted || !chunks.length) {
        announce(work.message || "샘플을 완성하지 못했어. 기기 성능과 코덱을 확인해 줘.");
        return;
      }
      const mime = recorder.mimeType || selected.mimeType;
      const extension = mime.includes("mp4") ? "mp4" : selected.extension;
      const blob = new Blob(chunks, {type: mime});
      outputUrl = URL.createObjectURL(blob);
      resultVideo.src = outputUrl;
      resultVideo.hidden = false;
      download.href = outputUrl;
      download.download = "actor-swap-overlay-demo-3s." + extension;
      download.hidden = false;
      announce("실제 로컬 샘플 생성 완료 · " + extension.toUpperCase() +
        (audioIncluded ? " · 오디오 경로 연결(실제 음성·싱크는 별도 검증)" : " · 오디오 트랙을 가져오지 못해 무음") +
        " · AI 얼굴 교체가 아닌 사진 오버레이야.");
    }, {once: true});
    recorder.start(250);
    timeout = setTimeout(() => {
      if (job !== work) return;
      work.message = "처리 시간이 초과돼 녹화를 중단했어.";
      work.aborted = true;
      work.finish();
    }, 9000);
    video.controls = false;
    await video.play();
    if (work.aborted || thisGeneration !== generation) return;
    const endTime = Math.min(3, video.duration);
    let lastDetection = -Infinity;
    const renderFrame = () => {
      if (work.aborted || job !== work) return;
      try {
        if (detector && modelOptIn.checked && performance.now() - lastDetection >= 180) {
          lastDetection = performance.now();
          const face = findFaceBox(detector, video, lastDetection);
          if (face) currentBox = face;
        }
        showFrame();
      } catch (error) {
        work.aborted = true;
        work.message = "샘플 프레임 처리 실패: " + (error?.message || "오류");
        work.finish();
        return;
      }
      if (video.ended || video.currentTime >= endTime - 0.03) work.finish();
      else raf = requestAnimationFrame(renderFrame);
    };
    renderFrame();
    announce("샘플 생성 중 · " + Math.min(3, video.duration).toFixed(1) +
      "초 · 다른 탭으로 이동하지 말아 줘.");
  } catch (error) {
    work.aborted = true;
    work.message = "샘플 생성 실패: " + (error?.message || "브라우저 제한");
    if (recorder && recorder.state !== "inactive") work.finish();
    else {
      for (const track of stream?.getTracks() || []) track.stop();
      audioCapture?.dispose();
      for (const track of sourceStream?.getTracks() || []) track.stop();
      if (timeout !== null) clearTimeout(timeout);
      video.pause();
      video.controls = true;
      if (job === work) job = null;
      updateButtons();
      announce(work.message);
    }
  }
});
cancelButton.addEventListener("click", () => cancelWork());
document.addEventListener("visibilitychange", () => {
  if (document.hidden && job) cancelWork("백그라운드 탭에서 영상 처리가 멈춰 작업을 취소했어.");
});
window.addEventListener("pagehide", () => {
  cancelWork("페이지를 떠나 작업을 중단했어.");
  if (outputUrl) URL.revokeObjectURL(outputUrl);
  detector?.close?.();
  closeAudioCapture(video)?.catch?.(() => {});
});
updateButtons();
