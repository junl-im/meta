import {TYPES, SODAS, BLOOD_CODES, getStory} from "./data/content.mjs";
import {EXPLORE_QUESTIONS, recommendStoryType} from "./data/explore.mjs";

const STORAGE_KEY = "maeumdogam:selection:v03";
const $ = (selector) => document.querySelector(selector);
const state = {type:null, blood:null, friend:null, scene:"friend"};
const SCENES=["friend","love","work"];
const exploreState={answers:[],step:0};

function validType(code){return TYPES.some((item)=>item.code===code);}
function validBlood(code){return BLOOD_CODES.includes(code);}
function readInitialState(){
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};}catch{}
  const params=new URLSearchParams(location.search);
  const fromLink=["t","b","f","s"].some(key=>params.has(key));
  const source=fromLink?{type:params.get("t"),blood:params.get("b"),friend:params.get("f"),scene:params.get("s")}:saved;
  state.type=validType(source.type)?source.type:null;
  state.blood=validBlood(source.blood)?source.blood:null;
  state.friend=validType(source.friend)?source.friend:null;
  state.scene=SCENES.includes(source.scene)?source.scene:"friend";
}
function pageUrl(){
  const url=new URL(location.href);
  for(const key of ["t","b","f","s"])url.searchParams.delete(key);
  if(state.type)url.searchParams.set("t",state.type);
  if(state.blood)url.searchParams.set("b",state.blood);
  if(state.friend)url.searchParams.set("f",state.friend);
  if(state.scene!=="friend")url.searchParams.set("s",state.scene);
  url.hash="theater";
  return url.toString();
}
function persist(){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch{}
  try{
    const url=new URL(location.href);
    ["t","b","f","s"].forEach((name)=>url.searchParams.delete(name));
    if(state.type)url.searchParams.set("t",state.type);
    if(state.blood)url.searchParams.set("b",state.blood);
    if(state.friend)url.searchParams.set("f",state.friend);
    if(state.scene!=="friend")url.searchParams.set("s",state.scene);
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
    window.dispatchEvent(new CustomEvent("maeum:selection-change",{detail:{field:"reset",value:null}}));
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
  if(field==="type")$("#explore-result").hidden=true;
  persist();render();
  // 탐험 추천처럼 카드 클릭 없이 상태가 바뀌어도 원화·카드 묶음을 함께 갱신한다.
  window.dispatchEvent(new CustomEvent("maeum:selection-change",{detail:{field,value}}));
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
  const lenses=[
    ["둘 다 조용한 시간을 소중히 하는 이야기라, 말없이 나란히 있어도 편안할 수 있어.","한 친구는 사람들 속에서 힘을 얻고 다른 친구는 쉬는 시간이 필요할지도 몰라. 함께하는 시간과 혼자 있는 시간을 나눠 보자."],
    ["익숙한 장면을 꼼꼼히 살피는 두 친구가 만나니 놓친 작은 것을 발견할 수도 있겠어.","한 친구는 눈앞의 사실부터, 다른 친구는 그 뒤의 가능성부터 펼쳐 볼 수도 있어. 서로의 그림을 겹쳐 보면 더 넓은 지도가 완성되지."],
    ["둘 다 고민을 나누는 말투가 익숙할지도 몰라. 그래도 필요한 위로의 모양은 매번 물어보는 게 좋아.","한쪽의 해결책이 다른 쪽에겐 무심하게 들릴 수도, 마음을 알아주는 말이 답답할 수도 있어. '들어줄까, 같이 해결할까?'라고 먼저 물어보면 어때?"],
    ["함께 작은 계획을 세우는 장면이 그려져. 예기치 못한 일이 생겨도 계획을 바꿔 볼 수 있어.","한 친구는 일정을 먼저 정하고 다른 친구는 현장에서 길을 찾고 싶을 수 있어. 꼭 지킬 약속 하나만 정하고 나머지엔 여백을 남겨 둬 보자."]
  ];
  const different=[];const same=[];
  [0,1,2,3].forEach((axis)=>{(myType.code[axis]===friend.code[axis]?same:different).push(lenses[axis][myType.code[axis]===friend.code[axis]?0:1]);});
  const scene=different[0]||same[0]||"서로의 말에 귀 기울이는 순간부터 이야기가 시작돼.";
  const second=different[1]||same[1]||"같은 유형이어도 마음은 매일 달라질 수 있어.";
  $("#bridge-story").textContent="마음마을 속 너는 "+myType.tagline+"이고, 친구는 "+friend.tagline+"이야. "+scene+" "+second;
  $("#bridge-tip").textContent="오늘 건넬 한마디: ‘"+myType.tip+"’ 또는 ‘"+friend.tip+"’. 이건 유형이 정한 운명이 아니라 둘이 만들어 가는 대화의 힌트야.";
}
function renderStory(myType){
  const item=getStory(state.type,state.blood);
  $("#result").hidden=!item;
  $("#story-placeholder").hidden=!!item;
  if(!item)return;
  $("#stamp").textContent=state.type+" × "+state.blood+"형 · 오늘의 작은 이야기";
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

function renderExplorer(){
  const index=exploreState.step;
  const question=EXPLORE_QUESTIONS[index];
  if(!question)return;
  $("#explore-count").textContent=(index+1)+" / "+EXPLORE_QUESTIONS.length;
  $("#explore-progress").value=index;
  $("#explore-question").textContent=question.prompt;
  $("#explore-prev").disabled=index===0;
  const choices=$("#explore-choices");
  choices.replaceChildren();
  question.options.forEach((option,answer)=>{
    const button=makeText("button","explore-choice",option.label);
    button.type="button";
    button.addEventListener("click",()=>{
      exploreState.answers[index]=answer;
      exploreState.step++;
      if(exploreState.step===EXPLORE_QUESTIONS.length){
        const code=recommendStoryType(exploreState.answers);
        const profile=TYPES.find(item=>item.code===code);
        if(!profile)return;
        choose("type",code);
        const result=$("#explore-result");
        const heading=makeText("strong","","오늘의 이야기 추천: "+code+" · "+profile.name);
        const detail=makeText("p","","12개 선택 장면을 바탕으로 골라 본 창작 이야기야. 공식 MBTI 검사가 아니며 언제든 다른 유형을 직접 선택할 수 있어.");
        const link=makeText("a","","소다상점에서 이야기 이어가기");
        link.href="#blood";
        result.replaceChildren(heading,detail,link);
        result.hidden=false;
        $("#explore-panel").hidden=true;
        $("#explore-toggle").setAttribute("aria-expanded","false");
        result.tabIndex=-1;
        result.focus({preventScroll:true});
        result.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
      }else{
        renderExplorer();
        $("#explore-choices button").focus({preventScroll:true});
      }
    });
    choices.append(button);
  });
}
function setupExplorer(){
  const toggle=$("#explore-toggle");
  const panel=$("#explore-panel");
  toggle.addEventListener("click",()=>{
    const opening=panel.hidden;
    if(opening && exploreState.step>=EXPLORE_QUESTIONS.length){
      exploreState.answers=[];exploreState.step=0;
    }
    // 재탐험에는 이전 추천을 남기지 않는다. 두 화면이 겹치지 않게 단일 상태로 전환.
    if(opening)$("#explore-result").hidden=true;
    panel.hidden=!opening;
    toggle.setAttribute("aria-expanded",String(opening));
    if(opening){
      renderExplorer();
      $("#explore-question").tabIndex=-1;
      $("#explore-question").focus({preventScroll:true});
    }
  });
  $("#explore-prev").addEventListener("click",()=>{
    if(exploreState.step>0){exploreState.step--;renderExplorer();$("#explore-question").focus({preventScroll:true});}
  });
  $("#explore-close").addEventListener("click",()=>{
    panel.hidden=true;
    toggle.setAttribute("aria-expanded","false");
    toggle.focus({preventScroll:true});
  });
}

function run(){
  if(TYPES.length!==16||SODAS.length!==4||TYPES.some((type)=>type.scenes.length!==4)){
    $("#chosen-type").textContent="콘텐츠를 확인하고 있어요.";
    return;
  }
  readInitialState();renderOptions();setupExplorer();render();
}
run();
