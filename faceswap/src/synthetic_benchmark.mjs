import {createSyntheticAddModel,SYNTHETIC_FEEDS} from "./synthetic_onnx.mjs";

export const BENCHMARK_DEFAULTS=Object.freeze({warmups:4,runs:24});

const rounded=(value)=>Math.round(value*1000)/1000;

export function summarizeInferenceTimings(samples) {
  if(!Array.isArray(samples)||samples.length===0||
     samples.some(ms=>typeof ms!=="number"||!Number.isFinite(ms)||ms<0)){
    throw new Error("시간 측정 자료가 올바르지 않아.");
  }
  const values=[...samples].sort((a,b)=>a-b);
  const percentile=(p)=>values[Math.ceil(p*values.length)-1];
  const total=samples.reduce((sum,ms)=>sum+ms,0);
  return {
    runs:values.length,p50Ms:rounded(percentile(.5)),
    p95Ms:rounded(percentile(.95)),
    minMs:rounded(values[0]),maxMs:rounded(values[values.length-1]),
    meanMs:rounded(total/values.length),totalInferenceMs:rounded(total)
  };
}

export function browserDeviceHints(nav=globalThis.navigator,isolated=globalThis.crossOriginIsolated) {
  // Navigator.deviceMemory is a privacy-rounded hint and is unavailable in some engines.
  const memory=nav?.deviceMemory;
  const concurrency=nav?.hardwareConcurrency;
  return {
    approximateDeviceMemoryGiB:Number.isFinite(memory)&&memory>=.25&&memory<=64?memory:null,
    reportedLogicalProcessors:Number.isInteger(concurrency)&&concurrency>0&&concurrency<=256?concurrency:null,
    crossOriginIsolated:isolated===true
  };
}

function throwIfAborted(signal) {
  if(signal?.aborted){
    const error=new Error("사용자가 ONNX 성능 측정을 중단했어.");
    error.name="AbortError";
    throw error;
  }
}

export async function benchmarkSyntheticWasmInference(ort,{
  runs=BENCHMARK_DEFAULTS.runs,warmups=BENCHMARK_DEFAULTS.warmups,
  now=()=>performance.now(),signal,onProgress=()=>{},
  yieldControl=()=>new Promise(resolve=>setTimeout(resolve,0))
}={}) {
  if(!ort?.InferenceSession?.create||!ort?.Tensor){
    throw new Error("ONNX Runtime 엔진을 먼저 준비해야 해.");
  }
  if(!Number.isInteger(runs)||runs<1||runs>100||
     !Number.isInteger(warmups)||warmups<0||warmups>20){
    throw new RangeError("성능 검사 반복 횟수 범위를 벗어났어.");
  }
  throwIfAborted(signal);
  const initStart=now();
  let session;
  try{
    session=await ort.InferenceSession.create(createSyntheticAddModel(),{
      executionProviders:["wasm"]
    });
    throwIfAborted(signal);
    const sessionInitMs=rounded(Math.max(0,now()-initStart));
    const feeds={
      a:new ort.Tensor("float32",Float32Array.of(SYNTHETIC_FEEDS.a),[1]),
      b:new ort.Tensor("float32",Float32Array.of(SYNTHETIC_FEEDS.b),[1])
    };
    const samples=[];
    const total=warmups+runs;
    for(let i=0;i<total;i++){
      throwIfAborted(signal);
      const start=now();
      const result=await session.run(feeds);
      const elapsed=Math.max(0,now()-start);
      throwIfAborted(signal);
      const output=result?.sum?.data;
      if(!output||output.length!==1||output[0]!==SYNTHETIC_FEEDS.expected){
        throw new Error("ONNX 성능 검사 중 계산 결과가 5와 달라.");
      }
      if(i>=warmups)samples.push(elapsed);
      onProgress({completed:i+1,total,measured:samples.length});
      // Let Reset/consent changes reach the main thread on low-end devices.
      if(i%6===5)await yieldControl();
    }
    throwIfAborted(signal);
    return {
      ...summarizeInferenceTimings(samples),
      sessionInitMs,backend:"wasm",operator:"Add",
      warmups,input:[SYNTHETIC_FEEDS.a,SYNTHETIC_FEEDS.b],expectedOutput:5,
      modelSource:"original synthetic bytes",actualInferenceCompleted:true,
      identitySwapCompleted:false,mediaUploaded:false,
      limitation:"tiny Add operator only; not face-swap FPS or memory benchmark"
    };
  }finally{
    await session?.release?.();
  }
}
