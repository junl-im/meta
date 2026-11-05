import {sha256BlobInChunks} from "./sha256_stream.mjs";

const abortError = () => new Error("검사를 취소했어.");

// Worker is same-origin, created only after an explicit check button click.
// If Workers are unavailable, the same chunked algorithm runs without full-buffer reads.
export function hashFileInWorker(file,{
  onProgress=()=>{},signal=null,WorkerCtor=globalThis.Worker
}={}) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (typeof WorkerCtor !== "function") {
    return sha256BlobInChunks(file,{
      onProgress,shouldAbort:()=>Boolean(signal?.aborted)
    });
  }
  return new Promise((resolve,reject)=>{
    let settled=false;
    let worker;
    const cleanup=()=>{
      signal?.removeEventListener("abort",onAbort);
      worker?.terminate();
    };
    const settle=(error,digest)=>{
      if(settled) return;
      settled=true;
      cleanup();
      error?reject(error):resolve(digest);
    };
    const onAbort=()=>settle(abortError());
    try {
      worker=new WorkerCtor(new URL("./sha256_worker.mjs",import.meta.url),{type:"module"});
      signal?.addEventListener("abort",onAbort,{once:true});
      if(signal?.aborted){onAbort();return;}
      worker.onmessage=({data})=>{
        if(data?.type==="progress"){
          if(!settled)onProgress(data.loaded,data.total);
        } else if(data?.type==="done"){
          settle(null,data.sha256);
        } else if(data?.type==="error"){
          settle(new Error(data.message||"해시 검사 실패"));
        }
      };
      worker.onerror=(event)=>{
        event?.preventDefault?.();
        settle(new Error("백그라운드 모델 검사를 시작하지 못했어."));
      };
      worker.postMessage({type:"hash",file});
    } catch(error) {settle(error);}
  });
}
