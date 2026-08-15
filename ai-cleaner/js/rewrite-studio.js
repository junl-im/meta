(() => {
'use strict';
if(window.AICleanerRewriteStudio)return;
const app=window.AICleanerApp;if(!app)return;
const $=(s)=>document.querySelector(s),$$=(s)=>[...document.querySelectorAll(s)];
const esc=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nextFrame=()=>new Promise(r=>requestAnimationFrame(r));
const SESSION_KEY='ai-cleaner-rewrite-session-v3';
const MAX_REWRITE_CHARS=200000;
const FACT_LOCK_LIMIT=240;
let state={draft:'',locks:[],lockOverflow:0,lockSourceStamp:'',variant:0,composing:false,lastSource:'',generatedSourceStamp:'',stale:false,generating:false,directTargetText:'',directTargetChars:[],directTrustedValue:'',directBlockedCount:0,compareFrame:0};

function sourceText(){const kind=$('#rewriteSource').value;return app.getText(kind==='original'?'original':'output').replace(/\r\n?/g,'\n');}
function sourceKind(){return $('#rewriteSource').value==='original'?'original':'output';}
function sourceStamp(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return `${text.length}:${(h>>>0).toString(16)}`;}
function saveSession(){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({savedAt:Date.now(),source:$('#rewriteSource').value,strength:$('#rewriteStrength').value,style:$('#rewriteStyle').value,length:$('#rewriteLength').value,draft:$('#rewriteDraft').value||state.draft||'',variant:state.variant,generatedSourceStamp:state.generatedSourceStamp,lastSource:state.lastSource}));}catch(_){}}
function restoreSession(){try{const raw=sessionStorage.getItem(SESSION_KEY);if(!raw)return;const s=JSON.parse(raw);if(!s||Date.now()-Number(s.savedAt||0)>12*60*60*1000)return;if(s.source)$('#rewriteSource').value=s.source;if(s.strength)$('#rewriteStrength').value=s.strength;if(s.style)$('#rewriteStyle').value=s.style;if(s.length)$('#rewriteLength').value=s.length;state.variant=Number(s.variant)||0;state.generatedSourceStamp=String(s.generatedSourceStamp||'');state.lastSource=String(s.lastSource||'');state.draft=String(s.draft||'');$('#rewriteDraft').value=state.draft;}catch(_){}}
function markStaleIfNeeded(){const current=sourceStamp(sourceText());state.stale=!!state.draft&&!!state.generatedSourceStamp&&current!==state.generatedSourceStamp;return state.stale;}
function addLock(list,type,value){value=String(value||'').trim();if(value.length<1||list.some(x=>x.value===value))return;list.push({type,value});}
function extractFactLocks(text){
  const raw=[];
  const patterns=[
    ['URL',/https?:\/\/[^\s<>"'’”]+/g],
    ['이메일',/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
    ['날짜',/\b\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2}\b|\d{4}년\s*\d{1,2}월\s*\d{1,2}일/g],
    ['시간',/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/g],
    ['전화번호',/(?:\+82[- .]?)?0\d{1,2}[- .]?\d{3,4}[- .]?\d{4}/g],
    ['모델/코드',/\b(?=[A-Z0-9_-]{2,24}\b)(?=[A-Z0-9_-]*[A-Z])(?=[A-Z0-9_-]*\d)[A-Z0-9]+(?:[-_][A-Z0-9]+)*\b/g],
    ['해시태그',/#[0-9A-Za-z가-힣_]{2,}/g],
    ['인용',/[“"][^”"\n]{2,80}[”"]|[‘'][^’'\n]{2,80}[’']/g],
    ['숫자',/(?:₩|\$)?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|원|만원|억원|개|명|회|년|월|일|시|분|초|kg|g|km|m|cm|mm|GB|MB|TB))?/gi]
  ];
  for(const [type,re] of patterns)for(const m of text.matchAll(re)){const value=String(m[0]||'').trim();if(value)raw.push({type,value});}
  raw.sort((a,b)=>b.value.length-a.value.length);
  const counts=new Map();for(const item of raw){const key=item.type+'\u0000'+item.value,prev=counts.get(key);if(prev)prev.count++;else counts.set(key,{...item,count:1});}
  const list=[...counts.values()];const limited=list.slice(0,FACT_LOCK_LIMIT);limited.overflow=Math.max(0,list.length-limited.length);return limited;
}
function uniqueFactToken(text,i){let nonce;do{nonce=`AI_FACT_${i}_${Math.random().toString(36).slice(2,10)}`;}while(text.includes(nonce));return `\uE000${nonce}\uE001`;}
function protectFacts(text,locks){let out=text;const map=[];locks.forEach((lock,i)=>{const token=uniqueFactToken(out,i);if(out.includes(lock.value)){out=out.split(lock.value).join(token);map.push([token,lock.value]);}});return{out,map};}
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
function isFixedBlock(p){const t=p.trim();if(!t)return true;const lines=t.split('\n').filter(Boolean);const hashCount=(t.match(/#[0-9A-Za-z가-힣_]{2,}/g)||[]).length;return hashCount>=3||lines.every(x=>/^\s*(?:[-*•]|\d+[.)])\s+/.test(x));}
function rebuildProseStructure(paragraphs,opts,variant){
  if(opts.strength==='light')return paragraphs;
  const out=[],buffer=[];
  const flush=()=>{if(!buffer.length)return;const sentences=buffer.splice(0).flatMap(x=>sentenceList(x));let group=[];for(let i=0;i<sentences.length;i++){group.push(sentences[i]);const target=opts.strength==='draft'?(((i+variant)%3===0)?2:3):2;const chars=group.reduce((n,s)=>n+s.length,0);if(group.length>=target||chars>180){out.push(group.join(' '));group=[];}}if(group.length)out.push(group.join(' '));};
  for(const p of paragraphs){if(isFixedBlock(p)){flush();out.push(p);}else buffer.push(p);}flush();return out;
}
function localRewrite(text,opts,variant,locks){
  const {out,map}=protectFacts(text,locks);let working=out.replace(/\n{3,}/g,'\n\n');
  let paras=working.split(/\n{2,}/).map(p=>isFixedBlock(p)?p:rewriteParagraph(p,opts,variant)).filter(Boolean);
  paras=rebuildProseStructure(paras,opts,variant);
  if(opts.length==='compact'){const seen=new Set();paras=paras.filter(p=>{const key=p.replace(/\s+/g,' ').trim();if(seen.has(key))return false;seen.add(key);return true;});}
  working=paras.join('\n\n').replace(/\n{3,}/g,'\n\n');
  return restoreFacts(working,map).trim();
}
function countOccurrences(text,value){if(!value)return 0;let n=0,pos=0;while((pos=text.indexOf(value,pos))>=0){n++;pos+=Math.max(1,value.length);}return n;}
function validateFacts(text){return state.locks.map(lock=>{const found=countOccurrences(text,lock.value),required=Math.max(1,Number(lock.count)||1);return {...lock,found,required,ok:found>=required};});}
function renderFacts(validation=validateFacts($('#rewriteDraft').value||state.draft||'')){
  const box=$('#rewriteFacts');if(!state.locks.length){box.innerHTML='<span class="sub">잠글 사실값이 없습니다.</span>';$('#rewriteFactSummary').textContent='잠금 0개';$('#rewriteFactSummary').classList.toggle('warn',state.lockOverflow>0);return validation;}
  const ok=validation.filter(x=>x.ok).length;$('#rewriteFactSummary').textContent=`잠금 ${ok}/${validation.length}${state.lockOverflow?` · +${state.lockOverflow} 초과`:''}`;$('#rewriteFactSummary').classList.toggle('warn',ok!==validation.length||state.lockOverflow>0);
  box.innerHTML=validation.slice(0,40).map(x=>`<span class="factChip ${x.ok?'':'missing'}"><b>${esc(x.type)}</b><span>${esc(x.value.length>42?x.value.slice(0,39)+'…':x.value)}${(x.required||x.count||1)>1?` ×${x.found??x.count??1}/${x.required||x.count}`:''}</span></span>`).join('')+(validation.length>40?`<span class="factChip">+${validation.length-40}</span>`:'');return validation;
}
function renderValidation(){
  const draft=$('#rewriteDraft').value;state.draft=draft;const validation=renderFacts(validateFacts(draft)),missing=validation.filter(x=>!x.ok);
  const box=$('#rewriteValidation'),apply=$('#rewriteApply');
  if(!draft.trim()){box.textContent='아직 만든 초안이 없습니다.';box.classList.remove('warn');apply.disabled=true;return;}
  if(markStaleIfNeeded()){box.textContent='기준 글이 초안을 만든 뒤 바뀌었습니다. 오래된 초안이 새 결과를 덮지 않도록 적용을 잠갔습니다. 새 초안을 다시 만들어 주세요.';box.classList.add('warn');apply.disabled=true;}
  else if(state.lockOverflow){box.textContent=`Fact Lock 한도를 ${state.lockOverflow}개 초과했습니다. 사실값 보호를 위해 글을 나눠서 재작성해 주세요.`;box.classList.add('warn');apply.disabled=true;}
  else if(missing.length){box.textContent=`Fact Lock 경고 · ${missing.length}개 보호 항목이 초안에서 사라졌습니다. 빨간 항목을 복원하면 적용할 수 있습니다.`;box.classList.add('warn');apply.disabled=true;}
  else{box.textContent=`검증 통과 · 보호 항목 ${validation.length}개가 모두 유지됐습니다. 필요하면 초안을 직접 수정한 뒤 결과에 적용하세요.`;box.classList.remove('warn');apply.disabled=false;}
  $('#rewriteVariant').disabled=false;
}
function progress(stage,pct){$('#rewriteProgress').hidden=false;$('#rewriteStage').textContent=stage;$('#rewritePercent').textContent=pct+'%';$('#rewriteProgressBar').style.width=pct+'%';}
async function generate(variantBump=false){
  if(state.generating)return;const started=performance.now();const text=sourceText();if(!text.trim())return app.showToast('먼저 원본 글을 입력해 주세요.');if(text.length>MAX_REWRITE_CHARS)return app.showToast('20만 자가 넘는 글은 브라우저가 멈출 수 있어 재작성을 시작하지 않았습니다. 문서를 나눠서 사용해 주세요.');
  state.generating=true;$('#rewriteGenerate').disabled=true;$('#rewriteVariant').disabled=true;if(variantBump)state.variant++;else state.variant=0;
  try{
    progress('원문 준비',12);await nextFrame();state.lastSource=text;state.generatedSourceStamp=sourceStamp(text);state.stale=false;
    state.locks=extractFactLocks(text);state.lockOverflow=Number(state.locks.overflow||0);state.lockSourceStamp=state.generatedSourceStamp;renderFacts(state.locks.map(x=>({...x,ok:true})));progress('Fact Lock 보호',34);await nextFrame();
    const opts={strength:$('#rewriteStrength').value,style:$('#rewriteStyle').value,length:$('#rewriteLength').value};progress('문장·문단 재구성',66);await nextFrame();
    const draft=localRewrite(text,opts,state.variant,state.locks);$('#rewriteDraft').value=draft;state.draft=draft;progress('보호 항목 검증',88);await nextFrame();renderValidation();progress('완료',100);
    const elapsed=Math.max(0,performance.now()-started),beforeParas=text.split(/\n{2,}/).filter(x=>x.trim()).length,afterParas=draft.split(/\n{2,}/).filter(x=>x.trim()).length;$('#rewritePanelStatus').textContent=`완료 · ${elapsed<100?elapsed.toFixed(0):Math.round(elapsed)}ms · 문단 ${beforeParas}→${afterParas} · Fact Lock ${state.locks.length}개`;setTimeout(()=>{$('#rewriteProgress').hidden=true;},900);app.showToast(variantBump?'다른 초안을 만들었습니다.':'새 초안을 만들었습니다.');resetDirect();saveSession();
  }finally{state.generating=false;$('#rewriteGenerate').disabled=false;$('#rewriteVariant').disabled=!state.draft;}
}
function applyDraft(){renderValidation();if($('#rewriteApply').disabled)return;const text=$('#rewriteDraft').value;if(!text.trim())return;if(app.applyRewrite(text,'새 글 재작성')){$('#directTarget').value='output';resetDirect();state.generatedSourceStamp=sourceStamp(sourceText());state.stale=false;saveSession();}}

function targetText(){return app.getText('original');}
function targetChars(){const text=targetText();if(text!==state.directTargetText){state.directTargetText=text;state.directTargetChars=Array.from(text);}return state.directTargetChars;}
function compareTyped(){
  const target=targetChars(),typed=Array.from($('#directTyped').value),compareN=state.composing?Math.max(0,typed.length-1):typed.length;let correct=0,first=-1;
  for(let i=0;i<compareN;i++){if(typed[i]===target[i])correct++;else if(first<0)first=i;}
  if(first<0&&typed.length>target.length)first=target.length;
  const pct=typed.length?Math.round(correct/Math.max(1,compareN)*100):0,complete=!state.composing&&typed.length===target.length&&first<0&&typed.every((c,i)=>c===target[i]);
  $('#directProgress').textContent=`${typed.length} / ${target.length}`;$('#directAccuracy').textContent=typed.length?`정확도 ${pct}%`:'정확도 —';
  const status=$('#directStatus');status.className='';if(state.composing){status.textContent='한글 조합 중…';}else if(complete){status.textContent='원본과 100% 일치 ✓';status.classList.add('ok');}else if(first>=0){status.textContent=`${first+1}번째 글자 확인`;status.classList.add('bad');}else{status.textContent='직접 입력 중';}
  $('#directCopy').disabled=!complete;renderGuide(target,typed,first);
}
function renderGuide(target,typed,first){
  const box=$('#directGuide');if($('#directHideTarget').checked){box.className='directGuide targetHidden';box.textContent=`목표 글 가림 · 현재 ${typed.length}/${target.length}자`;return;}box.className='directGuide';
  const pos=first>=0?first:Math.min(typed.length,target.length),start=Math.max(0,pos-70),end=Math.min(target.length,pos+90),before=target.slice(start,pos).join(''),cur=target[pos]||'',after=target.slice(pos+(cur?1:0),end).join('');
  const className=first>=0?'errorChar':'currentChar';box.innerHTML=(start?'…':'')+`<span class="donePart">${esc(before)}</span>`+(cur?`<span class="${className}">${esc(cur===' '?'␣':cur==='\n'?'↵':cur)}</span>`:'<span class="donePart">✓</span>')+esc(after)+(end<target.length?'…':'');
}
function resetDirect(){state.composing=false;state.directTargetText='';state.directTargetChars=[];state.directTrustedValue='';state.directBlockedCount=0;if(state.compareFrame){cancelAnimationFrame(state.compareFrame);state.compareFrame=0;}$('#directTyped').value='';$('#directInputBadge').classList.remove('blocked');$('#directInputBadge').innerHTML='<b>직접 입력 전용</b><span>붙여넣기 · 드롭 · 복사 · 잘라내기 차단</span>';compareTyped();}
function queueDirectCompare(){if(state.compareFrame)return;state.compareFrame=requestAnimationFrame(()=>{state.compareFrame=0;compareTyped();});}
function switchTab(name){$$('[data-rewrite-tab]').forEach(b=>b.classList.toggle('active',b.dataset.rewriteTab===name));$('#rewriteDraftPane').hidden=name!=='draft';$('#rewriteVerifyPane').hidden=name!=='verify';if(name==='verify'){$('#directTarget').value='original';resetDirect();setTimeout(()=>$('#directTyped').focus(),0);}}
function refreshForSource(){const text=sourceText(),stamp=sourceStamp(text);state.lastSource=text;if(stamp!==state.lockSourceStamp){state.locks=extractFactLocks(text);state.lockOverflow=Number(state.locks.overflow||0);state.lockSourceStamp=stamp;}renderFacts(state.locks.map(x=>({...x,ok:!state.draft||state.draft.includes(x.value)})));if(state.draft)renderValidation();}
function open(){restoreSession();refreshForSource();switchTab('draft');renderValidation();app.configureEditors($('#rewritePanel'));}

$$('[data-rewrite-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.rewriteTab)));
$('#rewriteGenerate').addEventListener('click',()=>generate(false));$('#rewriteVariant').addEventListener('click',()=>generate(true));$('#rewriteApply').addEventListener('click',applyDraft);
$('#rewriteSource').addEventListener('change',()=>{state.draft='';state.generatedSourceStamp='';$('#rewriteDraft').value='';$('#rewriteVariant').disabled=true;refreshForSource();renderValidation();resetDirect();saveSession();});
['rewriteStrength','rewriteStyle','rewriteLength'].forEach(id=>$('#'+id).addEventListener('change',()=>{$('#rewritePanelStatus').textContent='설정을 바꿨습니다. 새 초안을 다시 만들어보세요.';saveSession();}));
let editTimer=0;$('#rewriteDraft').addEventListener('input',()=>{clearTimeout(editTimer);editTimer=setTimeout(()=>{renderValidation();resetDirect();saveSession();},120);});
$('#directTarget').addEventListener('change',resetDirect);$('#directHideTarget').addEventListener('change',queueDirectCompare);$('#directReset').addEventListener('click',resetDirect);
const directEl=$('#directTyped');
function blockedDirectInput(label){state.directBlockedCount++;directEl.value=state.directTrustedValue;$('#directInputBadge').classList.add('blocked');$('#directInputBadge').innerHTML=`<b>직접 입력 전용</b><span>${esc(label)} 차단됨 · 실제 키보드로 입력하세요.</span>`;app.showToast(`${label}은 사용할 수 없습니다. 실제 키보드로 입력해 주세요.`);queueDirectCompare();}
directEl.addEventListener('compositionstart',()=>{state.composing=true;queueDirectCompare();});
directEl.addEventListener('compositionend',(e)=>{state.composing=false;if(e.isTrusted)state.directTrustedValue=directEl.value;state.directTargetText='';queueDirectCompare();});
directEl.addEventListener('beforeinput',(e)=>{const blocked=new Set(['insertFromPaste','insertFromPasteAsQuotation','insertFromDrop','insertFromYank','insertReplacementText']);if(blocked.has(e.inputType)){e.preventDefault();blockedDirectInput('붙여넣기/드롭');}});
directEl.addEventListener('input',(e)=>{if(!e.isTrusted){blockedDirectInput('합성 입력');return;}state.directTrustedValue=directEl.value;queueDirectCompare();});
['paste','drop','copy','cut'].forEach(ev=>directEl.addEventListener(ev,e=>{e.preventDefault();blockedDirectInput(ev==='paste'?'붙여넣기':ev==='drop'?'드롭':ev==='copy'?'복사':'잘라내기');}));
directEl.addEventListener('keydown',(e)=>{const mod=e.ctrlKey||e.metaKey;const key=e.key.toLowerCase();if((mod&&['v','c','x'].includes(key))||(e.shiftKey&&e.key==='Insert')){e.preventDefault();blockedDirectInput(key==='c'?'복사':key==='x'?'잘라내기':'붙여넣기');}});
$('#directCopy').addEventListener('click',()=>{const target=targetChars(),typed=Array.from(directEl.value),ok=typed.length===target.length&&typed.every((c,i)=>c===target[i]);if(!ok)return app.showToast('아직 원본과 100% 일치하지 않습니다.');const manuallyTyped=directEl.value;if(app.applyRewrite(manuallyTyped,'원본 직접 작성')){app.showToast('✓ 직접 작성한 글이 원본과 100% 일치해 결과에 반영됐습니다.');resetDirect();}});
document.addEventListener('ai-cleaner:text-changed',(e)=>{if(!state.draft||!e.detail||e.detail.kind!==sourceKind())return;markStaleIfNeeded();renderValidation();});
function resetSession(){try{sessionStorage.removeItem(SESSION_KEY);}catch(_){}state={draft:'',locks:[],lockOverflow:0,lockSourceStamp:'',variant:0,composing:false,lastSource:'',generatedSourceStamp:'',stale:false,generating:false,directTargetText:'',directTargetChars:[],directTrustedValue:'',directBlockedCount:0,compareFrame:0};$('#rewriteDraft').value='';$('#rewriteSource').value='output';$('#rewriteStrength').value='structure';$('#rewriteStyle').value='natural';$('#rewriteLength').value='same';$('#rewriteVariant').disabled=true;renderFacts([]);renderValidation();resetDirect();}
app.configureEditors($('#rewritePanel'));
window.AICleanerRewriteStudio={open,generate,extractFactLocks,saveSession,resetSession};
})();
