import {TYPES, SODAS, BLOOD_CODES, getStory} from "./data/content.mjs";

const STORAGE_KEY = "maeumdogam:selection:v03";
const $ = (selector) => document.querySelector(selector);
const state = {type:null, blood:null, friend:null, scene:"friend"};

function validType(code){return TYPES.some((item)=>item.code===code);}
function validBlood(code){return BLOOD_CODES.includes(code);}
function readInitialState(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};}catch{}
  const params=new URLSearchParams(location.search);
  const type=params.has("t")?params.get("t"):saved.type;
  const blood=params.has("b")?params.get("b"):saved.blood;
  const friend=params.has("f")?params.get("f"):saved.friend;
  state.type=validType(type)?type:null;
  state.blood=validBlood(blood)?blood:null;
  state.friend=validType(friend)?friend:null;
  state.scene=["friend","love","work"].includes(saved.scene)?saved.scene:"friend";
}
function pageUrl(){
  const url=new URL(location.href);
  for(const key of ["t","b","f"])url.searchParams.delete(key);
  if(state.type)url.searchParams.set("t",state.type);
  if(state.blood)url.searchParams.set("b",state.blood);
  if(state.friend)url.searchParams.set("f",state.friend);
  url.hash="theater";
  return url.toString();
}
function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
  try{
    const url=new URL(location.href);
    ["t","b","f"].forEach((name)=>url.searchParams.delete(name));
    if(state.type)url.searchParams.set("t",state.type);
    if(state.blood)url.searchParams.set("b",state.blood);
    if(state.friend)url.searchParams.set("f",state.friend);
    history.replaceState(null,"",url.pathname+url.search+url.hash);
  }catch{}
}
function makeText(tag,klass,value){
  const element=document.createElement(tag);
  element.className=klass;
  element.textContent=value;
  return element;
}
function renderOptions(){
  const typeGrid=$("#types-grid");
  for(const profile of TYPES){
    const button=document.createElement("button");
    button.type="button";
    button.className="type-card";
    button.dataset.type=profile.code;
    button.setAttribute("aria-label",profile.code+" "+profile.name+" 선택");
    button.append(
      makeText("span","type-code",profile.code),
      makeText("strong","type-name",profile.name),
      makeText("span","type-tagline",profile.tagline),
      makeText("span","type-prop","✦ "+profile.prop)
    );
    button.addEventListener("click",()=>choose("type",profile.code));
    typeGrid.append(button);
    const option=document.createElement("option");
    option.value=profile.code;
    option.textContent=profile.code+" · "+profile.name;
    $("#friend-type").append(option);
  }
  const sodaGrid=$("#blood-grid");
  for(const soda of SODAS){
    const button=document.createElement("button");
    button.type="button";
    button.className="soda-card";
    button.dataset.blood=soda.code;
    button.style.setProperty("--tint",soda.accent);
    button.setAttribute("aria-label",soda.code+"형 이야기 캐릭터 "+soda.name+" 선택");
    button.append(
      makeText("span","soda-symbol",soda.symbol),
      makeText("strong","soda-code",soda.code+"형"),
      makeText("span","soda-name",soda.name)
    );
    button.addEventListener("click",()=>choose("blood",soda.code));
    sodaGrid.append(button);
  }
  $("#friend-type").addEventListener("change",(event)=>choose("friend",event.target.value||null));
  document.querySelectorAll(".scene-button").forEach((button)=>{
    button.addEventListener("click",()=>{state.scene=button.dataset.scene;persist();render();});
  });
  $("#reset").addEventListener("click",()=>{
    Object.assign(state,{type:null,blood:null,friend:null,scene:"friend"});
    persist();render();location.hash="types";
    $("#feedback").textContent="";
  });
  $("#copy").addEventListener("click",async()=>{
    const item=getStory(state.type,state.blood);
    if(!item)return;
    const text="곰같은여우의 마음도감\n"+state.type+" × "+state.blood+"형\n"+item.title+"\n\n"+item.story+"\n\n마음의 한 줄: "+item.tip+"\n"+pageUrl();
    const success=await copyText(text);
    $("#feedback").textContent=success?"이야기를 복사했어요.":"복사가 지원되지 않는 환경이에요. 링크 공유를 이용해 주세요.";
  });
  $("#share").addEventListener("click",async()=>{
    const item=getStory(state.type,state.blood);
    if(!item)return;
    const url=pageUrl();
    if(typeof navigator.share==="function"){
      try{
        await navigator.share({title:"곰같은여우의 마음도감",text:item.title+" · "+item.story,url});
        $("#feedback").textContent="공유 창을 열었어요.";
        return;
      }catch(error){
        if(error && error.name==="AbortError")return;
      }
    }
    const success=await copyText(url);
    $("#feedback").textContent=success?"결과 링크를 복사했어요.":"공유가 지원되지 않는 환경이에요.";
  });
}
async function copyText(text){
  try{if(navigator.clipboard && navigator.clipboard.writeText){await navigator.clipboard.writeText(text);return true;}}catch{}
  const field=document.createElement("textarea");
  field.value=text;field.setAttribute("readonly","");field.style.position="fixed";field.style.opacity="0";
  document.body.append(field);field.select();
  let copied=false;try{copied=document.execCommand("copy");}catch{}
  field.remove();return copied;
}
function choose(field,value){
  state[field]=value;
  persist();render();
  if(field==="blood" && state.type && state.blood){
    const link=$("#result-link");if(link)link.focus({preventScroll:true});
  }
}
function render(){
  const myType=TYPES.find((item)=>item.code===state.type);
  const friend=TYPES.find((item)=>item.code===state.friend);
  document.querySelectorAll(".type-card").forEach((node)=>{
    node.setAttribute("aria-pressed",String(node.dataset.type===state.type));
  });
  document.querySelectorAll(".soda-card").forEach((node)=>{
    node.setAttribute("aria-pressed",String(node.dataset.blood===state.blood));
  });
  $("#chosen-type").textContent=myType?myType.code+" · "+myType.name+" 선택됨":"아직 선택한 유형이 없어요";
  $("#my-type-label").textContent=myType?myType.code+" · "+myType.name:"아직 선택 전";
  $("#friend-type").value=state.friend||"";
  renderBridge(myType,friend);
  renderStory(myType);
  $("#result-link").hidden=!(state.type&&state.blood);
}
function renderBridge(myType,friend){
  const ready=!!myType&&!!friend;
  $("#bridge-result").hidden=!ready;
  $("#bridge-prompt").hidden=ready;
  if(!ready)return;
  $("#bridge-headline").textContent=myType.name+"와 "+friend.name+"의 다리";
  $("#bridge-story").textContent="너는 "+myType.tagline+"이고, 상대는 "+friend.tagline+"이야. 서로 다른 이야기를 가진 두 사람이 만나면 생각의 폭이 넓어질 수 있어.";
  $("#bridge-tip").textContent="한 걸음 더 가까워지는 말: 너는 '"+myType.tip+"'를 기억하고, 상대에게는 '"+friend.tip+"'라는 문장을 함께 건네 봐. 실제 관계는 서로의 대화로 만들어져.";
}
function renderStory(myType){
  const item=getStory(state.type,state.blood);
  $("#result").hidden=!item;
  $("#story-placeholder").hidden=!!item;
  if(!item)return;
  $("#stamp").textContent=state.type+" × "+state.blood+"형 · 64개의 창작 이야기 중 하나";
  $("#headline").textContent=item.title;
  $("#story-lead").textContent=item.lead;
  $("#storyline").textContent=item.story;
  $("#story-tip").textContent=item.tip;
  document.querySelectorAll(".scene-button").forEach((button)=>{
    button.setAttribute("aria-pressed",String(button.dataset.scene===state.scene));
  });
  const prompts={
    friend:"친구라면 '요즘 어떤 마음이 제일 바빠?'라고 물어볼까? "+myType.truth,
    love:"연인이라면 서로 기대하는 배려를 한 가지씩 말해 볼까? "+myType.truth,
    work:"동료라면 일을 시작하기 전 필요한 도움을 먼저 물어볼까? "+myType.truth
  };
  $("#scene-question").textContent=prompts[state.scene];
}
function run(){
  if(TYPES.length!==16||SODAS.length!==4||TYPES.some((type)=>type.scenes.length!==4)){
    $("#chosen-type").textContent="콘텐츠를 확인하고 있어요.";
    return;
  }
  readInitialState();renderOptions();render();
}
run();
