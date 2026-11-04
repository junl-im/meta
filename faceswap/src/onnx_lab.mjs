import {loadWasmRuntime,runSyntheticWasmInference,ORT_WEB_VERSION} from "./onnx_probe.mjs";
import {benchmarkSyntheticWasmInference,browserDeviceHints} from "./synthetic_benchmark.mjs";

const byId=(id)=>document.getElementById(id);
const consent=byId("onnx-runtime-consent");
const probeButton=byId("onnx-probe-button");
const benchmarkButton=byId("onnx-benchmark-button");
const exportButton=byId("onnx-benchmark-export");
const status=byId("onnx-probe-status");
const benchmarkStatus=byId("onnx-benchmark-status");
let busy=false,generation=0,activeController=null,lastReport=null;

function updateButtons(){
  const ready=consent.checked&&!busy;
  probeButton.disabled=!ready;
  benchmarkButton.disabled=!ready;
  exportButton.disabled=!lastReport||!consent.checked||busy;
}

function interruptCurrent(){
  generation++;
  activeController?.abort();
  activeController=null;
  lastReport=null;
  updateButtons();
}

consent.addEventListener("change",()=>{
  interruptCurrent();
  if(!consent.checked){
    status.textContent="ONNX 다운로드 선택을 해제했어. 새 검증을 시작하지 않아.";
    benchmarkStatus.textContent="동의 해제 · 새 측정을 실행하지 않아. 진행 중인 반복 측정은 다음 반복에서 중단돼.";
  }
});

byId("reset-button").addEventListener("click",()=>{
  interruptCurrent();
  consent.checked=false;
  status.textContent="WASM 추론은 실행 전이야. 인물·모델 가중치를 사용하지 않는 계산 테스트야.";
  benchmarkStatus.textContent="성능 진단은 측정 전이야. 실제 얼굴 교체 FPS는 이 숫자 테스트로 알 수 없어.";
  updateButtons();
});

async function execute(mode){
  if(!consent.checked||busy)return;
  const id=++generation;
  const controller=new AbortController();
  activeController=controller;
  busy=true;
  lastReport=null;
  updateButtons();
  if(mode==="benchmark"){
    benchmarkStatus.textContent="CPU WASM 합성 모델을 준비하는 중이야. 4회 예열 + 24회 반복 측정 예정.";
  }else{
    status.textContent="ONNX Runtime WASM 전용 실행 파일을 내려받고, 로컬 2 + 3 계산 모델을 준비하는 중이야.";
  }
  try{
    const ort=await loadWasmRuntime();
    if(id!==generation||!consent.checked||controller.signal.aborted)return;
    if(mode==="benchmark"){
      const result=await benchmarkSyntheticWasmInference(ort,{
        signal:controller.signal,
        onProgress:({completed,total,measured})=>{
          if(id!==generation)return;
          if(measured===1||measured%6===0||completed===total){
            benchmarkStatus.textContent="합성 ONNX WASM 성능 측정: "+completed+"/"+total+
              "회 실행 · 본 측정 "+measured+"/24회. 입력 영상과 모델 파일은 사용하지 않아.";
          }
        }
      });
      if(id!==generation||!consent.checked)return;
      lastReport={
        schema:"actor-swap-synthetic-wasm-benchmark/v1",
        measuredAt:new Date().toISOString(),onnxRuntimeWebVersion:ORT_WEB_VERSION,
        deviceHints:browserDeviceHints(),...result
      };
      benchmarkStatus.textContent="합성 ONNX 24회 완료 · P50 "+result.p50Ms.toFixed(3)+
        "ms · P95 "+result.p95Ms.toFixed(3)+"ms · 세션 초기화 "+result.sessionInitMs.toFixed(3)+
        "ms. CPU 단일 Add 연산만 측정했어. 실제 얼굴 교체 FPS나 최대 메모리 성능이 아니야.";
    }else{
      const result=await runSyntheticWasmInference(ort);
      if(id!==generation||!consent.checked)return;
      status.textContent="실제 ONNX WASM 추론 성공 · 2 + 3 = "+result.output+
        " · "+result.elapsedMs+"ms · 합성 계산 모델 전용. AI 얼굴 교체는 아직 실행하지 않았어.";
    }
  }catch(error){
    if(id!==generation||error?.name==="AbortError")return;
    const message="ONNX "+(mode==="benchmark"?"성능 측정":"테스트")+" 실패: "+
      (error?.message||"이 브라우저에서 처리할 수 없어.");
    if(mode==="benchmark")benchmarkStatus.textContent=message;
    else status.textContent=message;
  }finally{
    activeController=null;
    busy=false;
    updateButtons();
  }
}

probeButton.addEventListener("click",()=>execute("probe"));
benchmarkButton.addEventListener("click",()=>execute("benchmark"));

exportButton.addEventListener("click",()=>{
  if(!lastReport||!consent.checked||busy)return;
  const blob=new Blob([JSON.stringify(lastReport,null,2)+"\n"],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="actor-swap-synthetic-wasm-benchmark.json";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
});
