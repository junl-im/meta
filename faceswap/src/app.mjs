import { probeCapabilities, chooseCandidateBackend, formatMiB } from "./capabilities.mjs";

const byId = (id) => document.getElementById(id);
const videoInput = byId("video-file");
const faceInput = byId("face-file");
const sourceVideo = byId("source-video");
const faceImage = byId("reference-image");
const consent = byId("consent");
const checkButton = byId("check-button");
const manifestButton = byId("manifest-button");
const helpDialog = byId("help-dialog");
const exitDialog = byId("exit-dialog");

const state = {
  video: null,
  face: null,
  videoUrl: null,
  faceUrl: null,
  duration: null,
  imageWidth: null,
  imageHeight: null,
  videoWidth: null,
  videoHeight: null,
  videoError: false,
  imageError: false,
  capabilities: null,
  checkedAt: null
};

function reportStatus(message) { byId("status").textContent = message; }

function revoke(url) { if (url) URL.revokeObjectURL(url); }

function invalidateCheck() {
  state.checkedAt = null;
  manifestButton.disabled = true;
}

function updateReady() {
  checkButton.disabled = !(state.video && state.face && consent.checked &&
    state.duration !== null && state.imageWidth !== null &&
    !state.videoError && !state.imageError);
}

function resetVideo() {
  revoke(state.videoUrl);
  state.videoUrl = null;
  state.video = null;
  state.duration = null;
  state.videoWidth = null;
  state.videoHeight = null;
  state.videoError = false;
  sourceVideo.pause();
  sourceVideo.removeAttribute("src");
  sourceVideo.load();
  byId("video-placeholder").hidden = false;
  byId("video-detail").textContent = "영상 정보 대기 중";
}

function resetFace() {
  revoke(state.faceUrl);
  state.faceUrl = null;
  state.face = null;
  state.imageWidth = null;
  state.imageHeight = null;
  state.imageError = false;
  faceImage.removeAttribute("src");
  byId("face-placeholder").hidden = false;
  byId("face-detail").textContent = "이미지 정보 대기 중";
}

videoInput.addEventListener("change", () => {
  resetVideo();
  invalidateCheck();
  const file = videoInput.files?.[0] || null;
  if (!file) {
    byId("video-name").textContent = "선택한 영상 없음";
    updateReady();
    return;
  }
  if (!file.type.startsWith("video/")) {
    byId("video-name").textContent = "영상 파일만 선택해 줘";
    reportStatus("선택한 파일을 영상으로 인식하지 못했어.");
    updateReady();
    return;
  }
  state.video = file;
  byId("video-name").textContent = file.name + " · " + formatMiB(file.size);
  state.videoUrl = URL.createObjectURL(file);
  sourceVideo.src = state.videoUrl;
  byId("video-placeholder").hidden = true;
  reportStatus("영상 정보를 읽는 중이야.");
  updateReady();
});

sourceVideo.addEventListener("loadedmetadata", () => {
  state.videoError = false;
  state.duration = Number.isFinite(sourceVideo.duration) && sourceVideo.duration > 0
    ? sourceVideo.duration : null;
  state.videoWidth = sourceVideo.videoWidth || null;
  state.videoHeight = sourceVideo.videoHeight || null;
  byId("video-detail").textContent = state.duration === null
    ? "영상 길이를 확인하지 못했어."
    : state.videoWidth + "×" + state.videoHeight + " · " + state.duration.toFixed(1) + "초";
  updateReady();
});

sourceVideo.addEventListener("error", () => {
  if (!state.video) return;
  state.videoError = true;
  state.duration = null;
  byId("video-detail").textContent = "이 브라우저에서 영상을 재생하지 못했어.";
  reportStatus("영상 코덱이나 파일 형식을 확인해 줘.");
  updateReady();
});

faceInput.addEventListener("change", () => {
  resetFace();
  invalidateCheck();
  const file = faceInput.files?.[0] || null;
  if (!file) {
    byId("face-name").textContent = "선택한 사진 없음";
    updateReady();
    return;
  }
  if (!file.type.startsWith("image/")) {
    byId("face-name").textContent = "이미지 파일만 선택해 줘";
    reportStatus("선택한 파일을 이미지로 인식하지 못했어.");
    updateReady();
    return;
  }
  state.face = file;
  byId("face-name").textContent = file.name + " · " + formatMiB(file.size);
  state.faceUrl = URL.createObjectURL(file);
  faceImage.src = state.faceUrl;
  byId("face-placeholder").hidden = true;
  reportStatus("참고 사진을 읽는 중이야.");
  updateReady();
});

faceImage.addEventListener("load", () => {
  state.imageError = false;
  state.imageWidth = faceImage.naturalWidth || null;
  state.imageHeight = faceImage.naturalHeight || null;
  byId("face-detail").textContent = state.imageWidth && state.imageHeight
    ? state.imageWidth + "×" + state.imageHeight + " 이미지"
    : "이미지 크기를 확인하지 못했어.";
  updateReady();
});
faceImage.addEventListener("error", () => {
  if (!state.face) return;
  state.imageError = true;
  state.imageWidth = null;
  byId("face-detail").textContent = "이미지를 읽지 못했어.";
  reportStatus("참고 사진의 형식을 확인해 줘.");
  updateReady();
});

consent.addEventListener("change", () => {
  invalidateCheck();
  updateReady();
});

checkButton.addEventListener("click", () => {
  updateReady();
  if (checkButton.disabled) return;
  state.checkedAt = new Date().toISOString();
  manifestButton.disabled = false;
  reportStatus("입력 점검 완료. 파일은 서버에 업로드되지 않았어. 실제 AI 얼굴 교체와 영상 렌더링은 아직 미구현 상태야.");
});

manifestButton.addEventListener("click", () => {
  if (!state.checkedAt || !state.video || !state.face) return;
  const manifest = {
    schema: "actor-swap-web-input-check/0.7",
    checkedAt: state.checkedAt,
    aiInferenceCompleted: false,
    videoRendered: false,
    mediaUploaded: false,
    consentAttestedByUser: consent.checked,
    video: {name: state.video.name, type: state.video.type, bytes: state.video.size,
      durationSeconds: state.duration, width: state.videoWidth, height: state.videoHeight},
    reference: {name: state.face.name, type: state.face.type, bytes: state.face.size,
      width: state.imageWidth, height: state.imageHeight},
    browser: state.capabilities,
    candidateBackend: chooseCandidateBackend(state.capabilities || {})
  };
  const blob = new Blob([JSON.stringify(manifest, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "actor-swap-input-check.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => revoke(url), 1000);
});

byId("reset-button").addEventListener("click", () => {
  resetVideo();
  resetFace();
  videoInput.value = "";
  faceInput.value = "";
  consent.checked = false;
  byId("video-name").textContent = "선택한 영상 없음";
  byId("face-name").textContent = "선택한 사진 없음";
  invalidateCheck();
  updateReady();
  reportStatus("입력을 초기화했어. 기존 PC 파일은 변경되거나 삭제되지 않았어.");
});

byId("help-button").addEventListener("click", () => helpDialog.showModal());
byId("exit-button").addEventListener("click", () => exitDialog.showModal());
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => byId(button.dataset.close).close());
});

const getExitTarget = () => {
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && referrer.origin === location.origin && !referrer.pathname.includes("/faceswap/")) {
      return referrer.href;
    }
  } catch { /* use the AI playground fallback */ }
  return new URL("../ai-cleaner/", location.href).href;
};
byId("confirm-exit").addEventListener("click", () => location.assign(getExitTarget()));

// Guard the first browser Back operation. A confirmed exit navigates to the
// referring same-origin app, or to the AI playground when opened directly.
try {
  history.replaceState({actorSwap: "entry"}, "", location.href);
  history.pushState({actorSwap: "guard"}, "", location.href);
  window.addEventListener("popstate", () => {
    if (helpDialog.open) helpDialog.close();
    else if (!exitDialog.open) exitDialog.showModal();
    history.pushState({actorSwap: "guard"}, "", location.href);
  });
} catch { /* file:// and restricted contexts may not support history states */ }

document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("dragstart", (event) => event.preventDefault());

(async () => {
  try {
    state.capabilities = await probeCapabilities();
    const data = state.capabilities;
    const label = (yes) => yes ? "사용 가능" : "미지원 / 미확인";
    byId("webgpu").textContent = label(data.webgpu);
    byId("wasm").textContent = label(data.wasm);
    byId("decoder").textContent = label(data.webcodecsDecoder);
    byId("encoder").textContent = label(data.webcodecsEncoder);
    byId("runtime").textContent = chooseCandidateBackend(data);
    const storage = data.storageEstimate?.quota != null
      ? " · 저장공간 한도 추정 " + formatMiB(data.storageEstimate.quota) : "";
    byId("device-note").textContent =
      "진단은 API 사용 가능성만 표시해. 실제 AI 모델 호환성과 영상 코덱은 별도 검증해야 해." + storage;
  } catch {
    byId("runtime").textContent = "진단 실패";
    byId("device-note").textContent = "브라우저 보안 설정 또는 기능 제한으로 진단하지 못했어.";
  }
})();
