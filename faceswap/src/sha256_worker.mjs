import {sha256BlobInChunks} from "./sha256_stream.mjs";

// This dedicated module worker handles one file per instance. Main UI cancels by
// terminating the worker; no model payload or source media leaves this process.
self.addEventListener("message", async ({data}) => {
  if (data?.type !== "hash" || !data.file) return;
  try {
    const sha256 = await sha256BlobInChunks(data.file, {
      onProgress: (loaded, total) => self.postMessage({type:"progress",loaded,total})
    });
    self.postMessage({type:"done",sha256});
  } catch (error) {
    self.postMessage({type:"error",message:error?.message || "해시 검사 실패"});
  }
});
