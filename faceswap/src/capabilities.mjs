/**
 * Browser feature availability only. A positive result does not certify
 * that a particular AI model will run, that video codecs match, or that
 * GPU memory is sufficient.
 */
export function chooseCandidateBackend(capabilities) {
  if (capabilities.webgpu) return "WebGPU 후보";
  if (capabilities.wasm) return "WASM 후보";
  return "지원 미확인";
}

export function formatMiB(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "확인 불가";
  return (bytes / 1048576).toFixed(1) + " MiB";
}

export async function probeCapabilities(context = globalThis) {
  const nav = context.navigator || {};
  const report = {
    webgpu: false,
    wasm: typeof context.WebAssembly !== "undefined",
    webcodecsDecoder: typeof context.VideoDecoder !== "undefined",
    webcodecsEncoder: typeof context.VideoEncoder !== "undefined",
    offscreenCanvas: typeof context.OffscreenCanvas !== "undefined",
    crossOriginIsolated: Boolean(context.crossOriginIsolated),
    storageEstimate: null,
    persistedStorage: false
  };
  if (nav.gpu && typeof nav.gpu.requestAdapter === "function") {
    try {
      const adapter = await nav.gpu.requestAdapter();
      report.webgpu = Boolean(adapter);
    } catch {
      report.webgpu = false;
    }
  }
  if (nav.storage && typeof nav.storage.estimate === "function") {
    try {
      const estimate = await nav.storage.estimate();
      report.storageEstimate = {
        quota: typeof estimate.quota === "number" ? estimate.quota : null,
        usage: typeof estimate.usage === "number" ? estimate.usage : null
      };
    } catch {
      // Storage estimates can be unavailable in restricted contexts.
    }
  }
  if (nav.storage && typeof nav.storage.persisted === "function") {
    try { report.persistedStorage = await nav.storage.persisted(); } catch { /* optional */ }
  }
  return report;
}
