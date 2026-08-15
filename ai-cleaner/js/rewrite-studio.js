(() => {
'use strict';
if(window.AICleanerRewriteStudio)return;
const app=window.AICleanerApp;if(!app)return;
const $=(s)=>document.querySelector(s),$$=(s)=>[...document.querySelectorAll(s)];
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
let state={draft:'',locks:[],variant:0,composing:false,lastSource:'',generating:false,directTargetText:'',directTargetChars:[],compareFrame:0};

function sourceText(){const kind=$('#rewriteSource').value;return app.getText(kind==='original'?'original':'output').replace(/\r\n?/g,'\n');}
function addLock(list,type,value){value=String(value||'').trim();if(value.length<1||list.some(x=>x.value===value))return;list.push({type,value});}
function extractFactLocks(text){
  const list=[];
  const patterns=[
    ['URL',/https?:\/\/[^\s<>"'’”]+/g],
    ['이메일',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
    ['날짜',/\b\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}\b|\d{4}년\s*\d{1,2}월\s*\d{1,2}일/g],
    ['시간',/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/g],
    ['전화번호',/(?:\+82[- .]?)?0\d{1,2}[- .]?\d{3,4}[- .]?\d{4}/g],
    ['해시태그',/#[0-9A-Za-z가-힣_]{2,}/g],
    ['인용',/[“"][^”"\n]{2,80}[”"]|[‘'][^’'\n]{2,80}[’']/g],
    ['숫자',/(?:₩|\$)?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|원|만원|억원|개|명|회|년|월|일|시|분|초|kg|g|km|m|cm|mm|GB|MB|TB))?/gi]
  ];
  for(const [type,re] of patterns)for(const m of text.matchAll(re))addLock(list,type,m[0]);
  return list.sort((a,b)=>b.value.length-a.value.length).slice(0,80);
}
function protectFacts(text,locks){let out=text;const map=[];locks.forEach((lock,i)=>{const token=`\uE000${i}\uE001`;if(out.includes(lock.value)){out=out.split(lock.value).join(token);map.push([token,lock.value]);}});return{out,map};}
function restoreFacts(text,map){let out=text;for(const [token,value] of map)out=out.split(token).join(value);return out;}
function pick(arr,variant,offset=0){return arr[(variant+offset)%arr.length];}
function phraseRewrite(text,style,variant){
  const maps={
    natural:[[/결론적으로/g,['그래서','결국','정리하면']],[/요약하자면|정리하자면/g,['정리하면','한마디로 정리하면','전체적으로 보면']],[/또한/g,['이와 함께','여기에','그리고']],[/하지만/g,['다만','그렇지만','반면']],[/따라서/g,['그래서','이에 따라','그 때문에']]],
    concise:[[/결론적으로/g,['결국']],[/요약하자면|정리하자면/g,['정리하면']],[/또한/g,['또']],[/하지만/g,['다만']],[/따라서/g,['그래서']]],
    structured:[[/결론적으로/g,['정리하면']],[/요약하자면|정리하자면/g,['핵심을 정리하면']],[/그리고/g,['또한']],[/하지만/g,['다만']],[/그래서/g,['따라서']]],
    friendly:[[/결론적으로/g,['그래서','결국']],[/요약하자면|정리하자면/g,['쉽게 정리하면','한마디로 보면']],[/또한/g,['그리고','여기에']],[/하지만/g,['다만','그렇지만']],[/따라서/g,['그래서','그 때문에']]]
  };
  let out=text;for(const [idx,[re,vals]] of (maps[style]||maps.natural).entries())out=out.replace(re,pick(vals,variant,idx));return out;
}
function sentenceList(paragraph){return (paragraph.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)||[]).map(x=>x.trim()).filter(Boolean);}
function splitLongSentence(s){if(s.length<96)return[s];const parts=s.split(/,\s*(?=(?:그리고|하지만|다만|또한|그래서|따라서|반면)\s+)/);if(parts.length<2)return[s];return parts.map((x,i)=>{let t=x.trim();if(i<parts.length-1&&!/[.!?。！？]$/.test(t))t+='.';return t;});}
function rewriteParagraph(paragraph,opts,variant){
  let p=paragraph.replace(/[ \t]+/g,' ').trim();if(!p)return'';
  p=phraseRewrite(p,opts.style,variant);
  if(opts.style==='concise'||opts.length==='compact')p=p.replace(/(^|[.!?。！？]\s+)(?:개인적으로|사실상|기본적으로|굳이 말하자면|말 그대로)\s*/g,'$1').replace(/\b(정말|매우)\s+\1\b/g,'$1');
  let sentences=sentenceList(p);
  if(opts.strength!=='light')sentences=sentences.flatMap(splitLongSentence);
  if(opts.length==='compact'){
    const seen=new Set();sentences=sentences.filter(s=>{const key=s.replace(/\s+/g,' ').trim();if(seen.has(key))return false;seen.add(key);return true;});
  }
  if(opts.strength==='light')return sentences.join(' ');
  const groups=[];let i=0;while(i<sentences.length){const size=opts.strength==='draft'?((i+variant)%3===0?1:2):2;groups.push(sentences.slice(i,i+size).join(' '));i+=size;}
  return groups.join('\n\n');
}
function localRewrite(text,opts,variant,locks){
  const {out,map}=protectFacts(text,locks);let working=out.replace(/\n{3,}/g,'\n\n');
  const paras=working.split(/\n{2,}/).map(p=>rewriteParagraph(p,opts,variant)).filter(Boolean);
  working=paras.join('\n\n');
  if(opts.strength==='draft')working=working.replace(/\n{3,}/g,'\n\n');
  return restoreFacts(working,map).trim();
}
function validateFacts(text){return state.locks.map(lock=>({...lock,ok:text.includes(lock.value)}));}
function renderFacts(validation=validateFacts($('#rewriteDraft').value||state.draft||'')){
  const box=$('#rewriteFacts');if(!state.locks.length){box.innerHTML='<span class="sub">잠글 숫자·날짜·URL·이메일·인용구가 없습니다.</span>';$('#rewriteFactSummary').textContent='잠금 0개';$('#rewriteFactSummary').classList.remove('warn');return validation;}
  const ok=validation.filter(x=>x.ok).length;$('#rewriteFactSummary').textContent=`잠금 ${ok}/${validation.length}`;$('#rewriteFactSummary').classList.toggle('warn',ok!==validation.length);
  box.innerHTML=validation.slice(0,40).map(x=>`<span class="factChip ${x.ok?'':'missing'}"><b>${esc(x.type)}</b><span>${esc(x.value.length>42?x.value.slice(0,39)+'…':x.value)}</span></span>`).join('')+(validation.length>40?`<span class="factChip">+${validation.length-40}</span>`:'');return validation;
}
function renderValidation(){
  const draft=$('#rewriteDraft').value;state.draft=draft;const validation=renderFacts(validateFacts(draft)),missing=validation.filter(x=>!x.ok);
  const box=$('#rewriteValidation'),apply=$('#rewriteApply');
  if(!draft.trim()){box.textContent='아직 만든 초안이 없습니다.';box.classList.remove('warn');apply.disabled=true;return;}
  if(missing.length){box.textContent=`Fact Lock 경고 · ${missing.length}개 보호 항목이 초안에서 사라졌습니다. 빨간 항목을 복원하면 적용할 수 있습니다.`;box.classList.add('warn');apply.disabled=true;}
  else{box.textContent=`검증 통과 · 보호 항목 ${validation.length}개가 모두 유지됐습니다. 필요하면 초안을 직접 수정한 뒤 결과에 적용하세요.`;box.classList.remove('warn');apply.disabled=false;}
  $('#rewriteVariant').disabled=false;
}
function progress(stage,pct){$('#rewriteProgress').hidden=false;$('#rewriteStage').textContent=stage;$('#rewritePercent').textContent=pct+'%';$('#rewriteProgressBar').style.width=pct+'%';}
async function generate(variantBump=false){
  if(state.generating)return;const started=performance.now();const text=sourceText();if(!text.trim())return app.showToast('먼저 원본 글을 입력해 주세요.');
  state.generating=true;$('#rewriteGenerate').disabled=true;$('#rewriteVariant').disabled=true;if(variantBump)state.variant++;else state.variant=0;
  try{
    progress('원문 준비',12);await nextFrame();state.lastSource=text;
    state.locks=extractFactLocks(text);renderFacts(state.locks.map(x=>({...x,ok:true})));progress('Fact Lock 보호',34);await nextFrame();
    const opts={strength:$('#rewriteStrength').value,style:$('#rewriteStyle').value,length:$('#rewriteLength').value};progress('문장·문단 재구성',66);await nextFrame();
    const draft=localRewrite(text,opts,state.variant,state.locks);$('#rewriteDraft').value=draft;state.draft=draft;progress('보호 항목 검증',88);await nextFrame();renderValidation();progress('완료',100);
    const elapsed=Math.max(0,performance.now()-started);$('#rewritePanelStatus').textContent=`완료 · ${elapsed<100?elapsed.toFixed(0):Math.round(elapsed)}ms · Fact Lock ${state.locks.length}개`;setTimeout(()=>{$('#rewriteProgress').hidden=true;},900);app.showToast(variantBump?'다른 초안을 만들었습니다.':'새 초안을 만들었습니다.');resetDirect();
  }finally{state.generating=false;$('#rewriteGenerate').disabled=false;$('#rewriteVariant').disabled=!state.draft;}
}
function applyDraft(){renderValidation();if($('#rewriteApply').disabled)return;const text=$('#rewriteDraft').value.trim();if(app.applyRewrite(text,'새 글 재작성')){$('#directTarget').value='output';resetDirect();}}

function targetText(){const v=$('#directTarget').value;if(v==='original')return app.getText('original');if(v==='rewrite')return $('#rewriteDraft').value||state.draft||app.getText('output');return app.getText('output');}
function targetChars(){const text=targetText();if(text!==state.directTargetText){state.directTargetText=text;state.directTargetChars=Array.from(text);}return state.directTargetChars;}
function compareTyped(){
  const target=targetChars(),typed=Array.from($('#directTyped').value),compareN=state.composing?Math.max(0,typed.length-1):typed.length;let correct=0,first=-1;
  for(let i=0;i<compareN;i++){if(typed[i]===target[i])correct++;else if(first<0)first=i;}
  if(first<0&&typed.length>target.length)first=target.length;
  const pct=typed.length?Math.round(correct/Math.max(1,compareN)*100):0,complete=!state.composing&&typed.length===target.length&&first<0&&typed.every((c,i)=>c===target[i]);
  $('#directProgress').textContent=`${typed.length} / ${target.length}`;$('#directAccuracy').textContent=typed.length?`정확도 ${pct}%`:'정확도 —';
  const status=$('#directStatus');status.className='';if(state.composing){status.textContent='한글 조합 중…';}else if(complete){status.textContent='100% 일치 ✓';status.classList.add('ok');}else if(first>=0){status.textContent=`${first+1}번째 글자 확인`;status.classList.add('bad');}else{status.textContent='입력 중';}
  $('#directCopy').disabled=!complete;renderGuide(target,typed,first);
}
function renderGuide(target,typed,first){
  const box=$('#directGuide');if($('#directHideTarget').checked){box.className='directGuide targetHidden';box.textContent=`목표 글 가림 · 현재 ${typed.length}/${target.length}자`;return;}box.className='directGuide';
  const pos=first>=0?first:Math.min(typed.length,target.length),start=Math.max(0,pos-70),end=Math.min(target.length,pos+90),before=target.slice(start,pos).join(''),cur=target[pos]||'',after=target.slice(pos+(cur?1:0),end).join('');
  const className=first>=0?'errorChar':'currentChar';box.innerHTML=(start?'…':'')+`<span class="donePart">${esc(before)}</span>`+(cur?`<span class="${className}">${esc(cur===' '?'␣':cur==='\n'?'↵':cur)}</span>`:'<span class="donePart">✓</span>')+esc(after)+(end<target.length?'…':'');
}
function resetDirect(){state.composing=false;state.directTargetText='';state.directTargetChars=[];if(state.compareFrame){cancelAnimationFrame(state.compareFrame);state.compareFrame=0;}$('#directTyped').value='';compareTyped();}
function queueDirectCompare(){if(state.compareFrame)return;state.compareFrame=requestAnimationFrame(()=>{state.compareFrame=0;compareTyped();});}
function switchTab(name){$$('[data-rewrite-tab]').forEach(b=>b.classList.toggle('active',b.dataset.rewriteTab===name));$('#rewriteDraftPane').hidden=name!=='draft';$('#rewriteVerifyPane').hidden=name!=='verify';if(name==='verify')resetDirect();}
function refreshForSource(){const text=sourceText();state.lastSource=text;state.locks=extractFactLocks(text);renderFacts(state.locks.map(x=>({...x,ok:!state.draft||state.draft.includes(x.value)})));if(state.draft)renderValidation();}
function open(){refreshForSource();switchTab('draft');app.configureEditors($('#rewritePanel'));}

$$('[data-rewrite-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.rewriteTab)));
$('#rewriteGenerate').addEventListener('click',()=>generate(false));$('#rewriteVariant').addEventListener('click',()=>generate(true));$('#rewriteApply').addEventListener('click',applyDraft);
$('#rewriteSource').addEventListener('change',()=>{state.draft='';$('#rewriteDraft').value='';$('#rewriteVariant').disabled=true;refreshForSource();renderValidation();resetDirect();});
['rewriteStrength','rewriteStyle','rewriteLength'].forEach(id=>$('#'+id).addEventListener('change',()=>{$('#rewritePanelStatus').textContent='설정을 바꿨습니다. 새 초안을 다시 만들어보세요.';}));
let editTimer=0;$('#rewriteDraft').addEventListener('input',()=>{clearTimeout(editTimer);editTimer=setTimeout(()=>{renderValidation();resetDirect();},120);});
$('#directTarget').addEventListener('change',resetDirect);$('#directHideTarget').addEventListener('change',queueDirectCompare);$('#directReset').addEventListener('click',resetDirect);
$('#directTyped').addEventListener('compositionstart',()=>{state.composing=true;queueDirectCompare();});$('#directTyped').addEventListener('compositionend',()=>{state.composing=false;state.directTargetText='';queueDirectCompare();});$('#directTyped').addEventListener('input',queueDirectCompare);
['paste','drop'].forEach(ev=>$('#directTyped').addEventListener(ev,e=>{e.preventDefault();app.showToast('직접 작성 검증에서는 붙여넣기와 드롭을 사용하지 않습니다.');}));
$('#directCopy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#directTyped').value);app.showToast('검증 완료 글을 복사했습니다.');}catch(_){app.showToast('복사 권한이 없어 Ctrl+C를 사용해 주세요.');}});
app.configureEditors($('#rewritePanel'));
window.AICleanerRewriteStudio={open,generate,extractFactLocks};
})();
