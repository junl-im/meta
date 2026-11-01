import {createSyntheticAddModel,SYNTHETIC_FEEDS} from "./synthetic_onnx.mjs";

export const ORT_WEB_VERSION="1.31.1";
export const ORT_CDN_DIST="https://cdn.jsdelivr.net/npm/onnxruntime-web@"+ORT_WEB_VERSION+"/dist/";

function runtimeAssets(browser=globalThis) {
  // The QA-only asset route exists only on the private Playwright test server.
  const isQa=browser.location?.hostname==="127.0.0.1" && browser.__faceswapQaRuntime===true;
  const base=isQa?new URL("/__qa_ort/",browser.location.href).href:ORT_CDN_DIST;
  return {script:base+"ort.wasm.min.js",wasmPath:base};
}

export function loadWasmRuntime({
  browser=globalThis,doc=browser.document,timeoutMs=30000
}={}) {
  if(browser.ort?.InferenceSession && browser.ort?.Tensor) {
    return Promise.resolve(browser.ort);
  }
  return new Promise((resolve,reject)=>{
    const assets=runtimeAssets(browser);
    const script=doc.createElement("script");
    let finished=false;
    const timer=browser.setTimeout(()=>done(new Error("ONNX 실행 파일 다운로드 시간이 초과됐어.")),timeoutMs);
    const done=(error,runtime)=>{
      if(finished)return;
      finished=true;
      browser.clearTimeout(timer);
      script.onload=script.onerror=null;
      if(error){script.remove();reject(error);}
      else resolve(runtime);
    };
    script.async=true;
    script.src=assets.script;
    script.onload=()=>{
      const ort=browser.ort;
      if(!ort?.InferenceSession || !ort?.Tensor || !ort?.env?.wasm){
        done(new Error("다운로드한 ONNX Runtime 형식이 예상과 달라."));
        return;
      }
      ort.env.wasm.wasmPaths=assets.wasmPath;
      // CPU-only WASM bundle avoids WebGPU/JSEP and COOP/COEP thread prerequisites.
      ort.env.wasm.numThreads=1;
      ort.env.wasm.proxy=false;
      done(null,ort);
    };
    script.onerror=()=>done(new Error("ONNX Runtime 파일을 내려받지 못했어. 연결을 확인해 줘."));
    doc.head.append(script);
  });
}

export async function runSyntheticWasmInference(ort,{now=()=>performance.now()}={}) {
  if(!ort?.InferenceSession?.create || !ort?.Tensor){
    throw new Error("ONNX Runtime WASM 실행 파일이 준비되지 않았어.");
  }
  const started=now();
  let session;
  try {
    session=await ort.InferenceSession.create(createSyntheticAddModel(),{
      executionProviders:["wasm"]
    });
    const feed={
      a:new ort.Tensor("float32",Float32Array.of(SYNTHETIC_FEEDS.a),[1]),
      b:new ort.Tensor("float32",Float32Array.of(SYNTHETIC_FEEDS.b),[1])
    };
    const result=await session.run(feed);
    const output=result?.sum?.data;
    if(!output || output.length!==1 || output[0]!==SYNTHETIC_FEEDS.expected){
      throw new Error("ONNX 실제 출력값이 예상 결과 5와 달라.");
    }
    return {
      backend:"wasm",operator:"Add",input:[2,3],output:Number(output[0]),
      elapsedMs:Math.max(0,Math.round(now()-started)),
      actualInferenceCompleted:true,identitySwapCompleted:false,
      mediaUploaded:false,modelSource:"synthetic / generated locally"
    };
  } finally {
    await session?.release?.();
  }
}
