import {loadWasmRuntime,runSyntheticWasmInference} from "./onnx_probe.mjs";

const byId=(id)=>document.getElementById(id);
const consent=byId("onnx-runtime-consent");
const button=byId("onnx-probe-button");
const status=byId("onnx-probe-status");
let busy=false, generation=0;

function updateButton(){button.disabled=busy||!consent.checked;}
consent.addEventListener("change",()=>{
  generation++;
  updateButton();
  if(!consent.checked){
    status.textContent="ONNX 다운로드 선택을 해제했어. 새 검증을 시작하지 않아.";
  }
});
byId("reset-button").addEventListener("click",()=>{
  generation++;
  consent.checked=false;
  status.textContent="WASM 추론은 실행 전이야. 인물·모델 가중치를 사용하지 않는 계산 테스트야.";
  updateButton();
});
button.addEventListener("click",async()=>{
  if(button.disabled)return;
  const id=++generation;
  busy=true;updateButton();
  status.textContent="ONNX Runtime WASM 전용 실행 파일을 내려받고, 로컬 2 + 3 계산 모델을 준비하는 중이야.";
  try{
    const ort=await loadWasmRuntime();
    if(id!==generation||!consent.checked)return;
    const result=await runSyntheticWasmInference(ort);
    if(id!==generation||!consent.checked)return;
    status.textContent="실제 ONNX WASM 추론 성공 · 2 + 3 = "+result.output+
      " · "+result.elapsedMs+"ms · 합성 계산 모델 전용. AI 얼굴 교체는 아직 실행하지 않았어.";
  }catch(error){
    if(id!==generation)return;
    status.textContent="ONNX 테스트 실패: "+(error?.message||"이 브라우저에서 처리할 수 없어.");
  }finally{
    busy=false;updateButton();
  }
});
