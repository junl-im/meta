// Local integrity preflight only. This module never loads or executes model weights.
export const MODEL_PACKAGE_SCHEMA = "actor-swap-model-package/v1";
export const MAX_MANIFEST_BYTES = 64 * 1024;
export const MAX_MODEL_BYTES_DESKTOP = 256 * 1024 * 1024;
export const MAX_MODEL_BYTES_MOBILE = 64 * 1024 * 1024;

export function modelByteLimit(deviceMemoryGB) {
  return Number.isFinite(deviceMemoryGB) && deviceMemoryGB > 0 && deviceMemoryGB <= 4
    ? MAX_MODEL_BYTES_MOBILE : MAX_MODEL_BYTES_DESKTOP;
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateModelManifest(manifest, filename) {
  if (!record(manifest) || manifest.schema !== MODEL_PACKAGE_SCHEMA) {
    throw new Error("지원하는 모델 설명서 형식이 아니야 (actor-swap-model-package/v1).");
  }
  if (!["onnx", "ort"].includes(manifest.format) || !filename.endsWith("." + manifest.format)) {
    throw new Error("모델 파일 확장자와 설명서의 ONNX/ORT 형식이 맞지 않아.");
  }
  if (manifest.filename !== filename || filename.includes("/") || filename.includes("\\")) {
    throw new Error("설명서의 filename이 선택한 로컬 모델 파일 이름과 달라.");
  }
  if (typeof manifest.name !== "string" || !manifest.name.trim() || manifest.name.length > 100) {
    throw new Error("모델 설명서에 유효한 name이 필요해.");
  }
  if (typeof manifest.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(manifest.sha256)) {
    throw new Error("모델 설명서에 64자리 SHA-256 값이 필요해.");
  }
  const license = manifest.weightsLicense;
  if (!record(license) || typeof license.id !== "string" ||
      !license.id.trim() || license.id.length > 100 ||
      license.commercialUseConfirmed !== true ||
      typeof license.evidenceUrl !== "string") {
    throw new Error("코드 라이선스와 별개인 가중치 사용권·상업적 사용 허용 근거가 필요해.");
  }
  try {
    const url = new URL(license.evidenceUrl);
    if (url.protocol !== "https:" || !url.hostname.includes(".")) throw new Error();
  } catch {
    throw new Error("가중치 라이선스 근거로 확인 가능한 HTTPS 문서 주소가 필요해.");
  }
  return {
    schema: MODEL_PACKAGE_SCHEMA,
    name: manifest.name.trim(),
    format: manifest.format,
    filename,
    sha256: manifest.sha256.toLowerCase(),
    weightsLicense: {
      id: license.id.trim(),
      evidenceUrl: license.evidenceUrl,
      commercialUseConfirmed: true
    }
  };
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyLocalModelPackage({
  modelFile, manifestFile, digest = globalThis.crypto?.subtle?.digest?.bind(globalThis.crypto.subtle),
  deviceMemoryGB = null
}) {
  if (!modelFile || !manifestFile) throw new Error("모델 파일과 JSON 설명서를 모두 선택해 줘.");
  if (!modelFile.size || modelFile.size > modelByteLimit(deviceMemoryGB)) {
    throw new Error("이 기기의 1회 검사 메모리 한도를 초과했어. 큰 모델은 아직 지원하지 않아.");
  }
  if (!manifestFile.size || manifestFile.size > MAX_MANIFEST_BYTES ||
      !manifestFile.name?.toLowerCase().endsWith(".json")) {
    throw new Error("설명서는 64 KiB 이하의 JSON 파일이어야 해.");
  }
  if (typeof digest !== "function") throw new Error("이 브라우저는 보안 SHA-256 검사를 지원하지 않아.");
  let parsed;
  try { parsed = JSON.parse(await manifestFile.text()); }
  catch { throw new Error("설명서가 올바른 JSON 형식이 아니야."); }
  const manifest = validateModelManifest(parsed, modelFile.name);
  // WebCrypto requires a complete ArrayBuffer; limit is intentionally conservative.
  const sha256 = hex(await digest("SHA-256", await modelFile.arrayBuffer()));
  if (sha256 !== manifest.sha256) {
    throw new Error("모델 SHA-256이 설명서와 달라. 파일 무결성 검사에 실패했어.");
  }
  return {
    manifest, sha256, bytes: modelFile.size,
    integrityVerified: true, inferenceCompleted: false,
    identitySwapCompleted: false, mediaUploaded: false,
    licenseStatus: "self-declared / independently unverified",
    runtimeStatus: "not loaded or executed"
  };
}
