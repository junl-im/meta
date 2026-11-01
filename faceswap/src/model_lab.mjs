import {verifyLocalModelPackage, modelByteLimit} from "./model_preflight.mjs";

const byId = (id) => document.getElementById(id);
const weightInput = byId("local-model-file");
const manifestInput = byId("local-model-manifest");
const rightsConsent = byId("local-model-rights");
const verifyButton = byId("verify-local-model");
const status = byId("local-model-status");
const limit = byId("local-model-limit");
let generation = 0;
let working = false;

function updateButton() {
  verifyButton.disabled = working || !weightInput.files?.length ||
    !manifestInput.files?.length || !rightsConsent.checked;
}
function invalidate() {
  generation++;
  status.textContent = "아직 검사하지 않았어. 가중치 파일은 읽기 전용으로 확인하며 서버로 보내지 않아.";
  updateButton();
}
for (const control of [weightInput, manifestInput, rightsConsent]) {
  control.addEventListener("change", invalidate);
}
byId("reset-button").addEventListener("click", () => {
  weightInput.value = "";
  manifestInput.value = "";
  rightsConsent.checked = false;
  invalidate();
});
const maxMiB = modelByteLimit(navigator.deviceMemory) / 1024 / 1024;
limit.textContent = "이 기기의 1회 SHA-256 검사 한도: " + maxMiB +
  " MiB. 모델을 실행하거나 라이선스를 독립 인증하지는 않아.";

verifyButton.addEventListener("click", async () => {
  if (verifyButton.disabled) return;
  const thisGeneration = ++generation;
  working = true;
  updateButton();
  status.textContent = "로컬 파일 전체를 SHA-256으로 검사 중이야. 대용량은 시간이 걸릴 수 있어.";
  try {
    const result = await verifyLocalModelPackage({
      modelFile: weightInput.files[0],
      manifestFile: manifestInput.files[0],
      deviceMemoryGB: navigator.deviceMemory
    });
    if (generation !== thisGeneration) return;
    status.textContent = "SHA-256 일치 · " + result.sha256.slice(0, 16) +
      "… · " + result.manifest.name +
      ". 가중치 사용 권한은 사용자 선언이며 독립 검증 전이야. ONNX 실행·AI 얼굴 교체는 아직 하지 않았어.";
  } catch (error) {
    if (generation !== thisGeneration) return;
    status.textContent = "검사 실패: " + (error?.message || "파일을 확인할 수 없어.");
  } finally {
    working = false;
    updateButton();
  }
});
