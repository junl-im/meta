(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const APP_META=window.__AI_CLEANER_VERSION__||{};
const APP_VERSION=String(APP_META.version||'local');
const ASSET_VERSION=encodeURIComponent(String(APP_META.assetVersion||APP_META.version||Date.now()));
const lazyScripts=new Map();
function loadLazyScript(src){
  if(lazyScripts.has(src))return lazyScripts.get(src);
  const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>resolve(s);s.onerror=()=>reject(new Error('도구 로드 실패: '+src));document.body.appendChild(s);});
  lazyScripts.set(src,p);return p;
}
async function ensureImageAnalyzer(){if(typeof window.loadImage==='function')return window.loadImage;await loadLazyScript(`js/image-analyzer.js?v=${ASSET_VERSION}`);if(typeof window.loadImage!=='function')throw new Error('이미지 검사 엔진 초기화 실패');return window.loadImage;}
async function ensureRewriteStudio(){if(window.AICleanerRewriteStudio)return window.AICleanerRewriteStudio;await loadLazyScript(`js/rewrite-studio.js?v=${ASSET_VERSION}`);if(!window.AICleanerRewriteStudio)throw new Error('재작성 스튜디오 초기화 실패');return window.AICleanerRewriteStudio;}
const UPDATE_DRAFT_KEY='ai-cleaner-update-draft-v1';
const UPDATE_RELOAD_KEY='ai-cleaner-refresh-target';
let appUpdateCheckBusy=false;
let historyState={entries:[],index:-1,restoring:false};
let manualEditBaseline='';
let inputDirty=false;
let typewriterDisabledState=new Map();
const REWRITE_SESSION_KEY='ai-cleaner-rewrite-session-v3';

function applyVersionUi(){
  const badge=$('#versionBadge'),footer=$('#footerVersion');
  if(badge)badge.textContent=APP_VERSION==='local'?'local':'v'+APP_VERSION;
  if(footer)footer.textContent=APP_VERSION==='local'?'local':'v'+APP_VERSION;
  if(APP_VERSION!=='local')document.title=`곰같은여우의 AI 흔적 지우개 v${APP_VERSION}`;
}

function captureUpdateDraft(targetVersion){
  try{
    const draft={
      savedAt:Date.now(),targetVersion,
      input:$('#input')?.value||'',output:$('#output')?.value||'',
      outputReadOnly:$('#output')?.readOnly!==false,
      settings:{profile:$('#cleanProfile')?.value||'standard',norm:!!$('#norm')?.checked,repeat:!!$('#repeat')?.checked,length:!!$('#length')?.checked,liveScan:!!$('#liveScan')?.checked},
      activeTool:document.querySelector('[data-tool].active')?.dataset.tool||'text',
      resultTab:document.querySelector('[data-resulttab].active')?.dataset.resulttab||'cleaned'
    };
    sessionStorage.setItem(UPDATE_DRAFT_KEY,JSON.stringify(draft));
  }catch(_){}
}

async function checkForAppUpdate(){
  if(appUpdateCheckBusy||APP_VERSION==='local'||window.__AI_CLEANER_TYPEWRITER_BUSY__)return;
  appUpdateCheckBusy=true;
  try{
    const res=await fetch(`version.json?ts=${Date.now()}`,{cache:'no-store'});if(!res.ok)return;
    const data=await res.json(),latest=String(data&&data.version||'').trim();if(!latest)return;
    if(latest===APP_VERSION){try{sessionStorage.removeItem(UPDATE_RELOAD_KEY);}catch(_){}return;}
    let already='';try{already=sessionStorage.getItem(UPDATE_RELOAD_KEY)||'';}catch(_){}
    if(already===latest)return;
    captureUpdateDraft(latest);try{sessionStorage.setItem(UPDATE_RELOAD_KEY,latest);}catch(_){}
    const url=new URL(location.href);url.searchParams.set('__appv',latest);url.searchParams.set('__fresh',String(Date.now()));location.replace(url.toString());
  }catch(_){}finally{appUpdateCheckBusy=false;}
}

const sample = 'AI가\u200B 쓴 글에는\u200E 보이지 않는 문자가 섞일 수 있어요.\u00A0\n\n결론적으로 이번 제품은 생각보다 사용감이 좋았습니다.\n정말 정말 좋은 제품이라서 적극 추천드립니다.\n정말 좋은 선택이고 정말 좋은 경험이며 정말 좋은 결과입니다.\n정말 좋은 문장이라 정말 좋은 표현을 반복해서 정말 좋은 예시를 만듭니다.\n\n자주 묻는 질문 (FAQ)';
const specialSpaces = new Set([0xA0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200A,0x202F,0x205F,0x3000]);
const removable = new Set([0x200B,0x200E,0x200F,0x202A,0x202B,0x202C,0x202D,0x202E,0x2066,0x2067,0x2068,0x2069,0xFEFF]);
const sensitive = new Set([0x200C,0x200D,0x2060]);
const lookalike = {'а':'Cyrillic a','е':'Cyrillic e','о':'Cyrillic o','р':'Cyrillic er','с':'Cyrillic es','х':'Cyrillic ha','у':'Cyrillic u','і':'Cyrillic i'};

function makeEmptyTextState(){
  return {
    original:'', base:'', issueBase:'', working:'', chars:[], allChars:[], issues:[], applied:new Set(),
    manual:false, homoglyphs:[], reviews:[], score:100, focusCycles:Object.create(null),
    issueUnread:false, reviewUnread:false, techUnread:false, analyzeMs:0, reviewOverflow:0
  };
}
let state=makeEmptyTextState();
let compareTimer = 0;
let xrayFilter = 'all';
let contextTarget = null;
const PANEL_SHEET_BREAKPOINT=980;
const MAX_TEXT_FILE_BYTES=20*1024*1024;
function notifyTextChanged(kind){try{document.dispatchEvent(new CustomEvent('ai-cleaner:text-changed',{detail:{kind}}));}catch(_){}}


function historySnapshot(label=''){
  return {label,output:$('#output')?.value||state.working||'',manual:!!state.manual,applied:[...state.applied],issueBase:state.issueBase||state.base||''};
}
function historySignature(s){return JSON.stringify([s.output,s.manual,s.applied,s.issueBase]);}
function updateHistoryButtons(){
  const u=$('#undoStep'),r=$('#redoStep');if(u)u.disabled=historyState.index<=0;if(r)r.disabled=historyState.index<0||historyState.index>=historyState.entries.length-1;
}
function resetHistory(label='분석 결과'){
  historyState={entries:[historySnapshot(label)],index:0,restoring:false};updateHistoryButtons();
}
function recordHistory(label){
  if(historyState.restoring)return;
  const snap=historySnapshot(label),current=historyState.entries[historyState.index];
  if(current&&historySignature(current)===historySignature(snap)){updateHistoryButtons();return;}
  historyState.entries=historyState.entries.slice(0,historyState.index+1);historyState.entries.push(snap);
  if(historyState.entries.length>60)historyState.entries.shift();else historyState.index++;
  if(historyState.entries.length===60)historyState.index=59;
  updateHistoryButtons();
}
function restoreHistoryIndex(nextIndex,{announce=true}={}){
  if(nextIndex<0||nextIndex>=historyState.entries.length)return;
  const snap=historyState.entries[nextIndex];historyState.restoring=true;historyState.index=nextIndex;
  state.issueBase=typeof snap.issueBase==='string'&&snap.issueBase?snap.issueBase:state.base;state.issues=issues(state.issueBase);state.reviews=[];state.focusCycles=Object.create(null);
  state.applied=new Set(snap.applied||[]);state.manual=!!snap.manual;state.working=snap.output||'';
  $('#output').readOnly=true;$('#editResult').textContent='✎ 직접 수정';
  renderAll();$('#output').value=snap.output||state.working;state.working=$('#output').value;
  historyState.restoring=false;updateHistoryButtons();renderCompare();renderDiff();notifyTextChanged('output');flashOutput();
  if(announce)showToast(snap.label?`${snap.label} 상태로 이동했습니다.`:'이전 상태로 이동했습니다.');
}
function undoHistory(){restoreHistoryIndex(historyState.index-1);}
function redoHistory(){restoreHistoryIndex(historyState.index+1);}

function commonEdgeMarkup(before,after){
  const a=splitGraphemesExact(before),b=splitGraphemesExact(after);
  let p=0;while(p<a.length&&p<b.length&&a[p]===b[p])p++;
  let s=0;while(s<a.length-p&&s<b.length-p&&a[a.length-1-s]===b[b.length-1-s])s++;
  const render=(parts,start,end)=>esc(parts.slice(0,start).join(''))+(end>start?`<mark class="diffChange">${esc(parts.slice(start,end).join(''))}</mark>`:'')+esc(parts.slice(end).join(''));
  return {before:render(a,p,a.length-s),after:render(b,p,b.length-s)};
}
function lineDiff(before,after){
  const a=before.split('\n'),b=after.split('\n'),ops=[];
  if(a.length*b.length<=50000&&a.length<=240&&b.length<=240){
    const m=b.length,dp=Array.from({length:a.length+1},()=>new Uint16Array(m+1));
    for(let i=a.length-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
    let i=0,j=0;
    while(i<a.length||j<b.length){
      if(i<a.length&&j<b.length&&a[i]===b[j]){ops.push({type:'same',text:a[i]});i++;j++;}
      else if(j>=b.length||(i<a.length&&dp[i+1][j]>=dp[i][j+1])){ops.push({type:'del',text:a[i++]});}
      else{ops.push({type:'add',text:b[j++]});}
    }
  }else{
    const n=Math.max(a.length,b.length);for(let i=0;i<n;i++){if(a[i]===b[i])ops.push({type:'same',text:a[i]||''});else{if(i<a.length)ops.push({type:'del',text:a[i]});if(i<b.length)ops.push({type:'add',text:b[i]});}}
  }
  const hunks=[];let cur=null,line=1;
  for(const op of ops){
    if(op.type==='same'){if(cur){hunks.push(cur);cur=null;}line++;continue;}
    if(!cur)cur={line,before:[],after:[]};(op.type==='del'?cur.before:cur.after).push(op.text);if(op.type==='del')line++;
  }
  if(cur)hunks.push(cur);return hunks;
}
function renderDiff(){
  const list=$('#diffList'),count=$('#diffCount');if(!list||!count)return;
  const before=state.base||'',after=$('#output')?.value||state.working||'';
  if(!before&&!after){count.textContent='변경 0곳';list.innerHTML='<div class="empty">분석 후 변경된 부분을 확인할 수 있습니다.</div>';return;}
  if(before===after){count.textContent='변경 0곳';list.innerHTML='<div class="empty">자동 정리 결과에서 추가로 달라진 내용이 없습니다.</div>';return;}
  const hunks=lineDiff(before,after);count.textContent=`변경 ${hunks.length}곳`;
  list.innerHTML=hunks.slice(0,120).map((h,i)=>{const bv=h.before.join('\n'),av=h.after.join('\n'),mk=commonEdgeMarkup(bv,av);return `<div class="diffItem"><div class="diffLabel">변경 ${i+1} · ${h.line}줄 근처</div><div class="diffRow before"><span class="diffSide">이전</span><div class="diffText">${mk.before||'<span class="sub">없음</span>'}</div></div><div class="diffRow after"><span class="diffSide">현재</span><div class="diffText">${mk.after||'<span class="sub">없음</span>'}</div></div></div>`;}).join('')+(hunks.length>120?`<div class="empty">변경이 많아 앞의 120곳만 표시했습니다.</div>`:'');
}

function restoreUpdateDraft(){
  let draft=null;try{draft=JSON.parse(sessionStorage.getItem(UPDATE_DRAFT_KEY)||'null');}catch(_){}
  if(!draft||Date.now()-Number(draft.savedAt||0)>30*60*1000)return;
  try{sessionStorage.removeItem(UPDATE_DRAFT_KEY);}catch(_){}
  const s=draft.settings||{};if($('#cleanProfile'))$('#cleanProfile').value=s.profile||'standard';if($('#norm'))$('#norm').checked=!!s.norm;if($('#repeat'))$('#repeat').checked=s.repeat!==false;if($('#length'))$('#length').checked=s.length!==false;if($('#liveScan'))$('#liveScan').checked=s.liveScan!==false;
  if($('#input'))$('#input').value=draft.input||'';
  if((draft.input||'').trim()){
    analyze(true);
    if(typeof draft.output==='string'&&draft.output!==$('#output').value){state.working=draft.output;state.manual=true;$('#output').value=draft.output;buildReviews();renderCompare();renderIssues();syncWidgets();}
    resetHistory('업데이트 복원');
  }
  if(draft.resultTab)activateResultTab(draft.resultTab);
  if(draft.activeTool){const b=document.querySelector(`[data-tool="${draft.activeTool}"]`);if(b)b.click();}
  showToast('새 버전을 적용하고 작성 중이던 내용을 복원했습니다.');
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4,'0');

function configureEditors(root=document){
  root.querySelectorAll('textarea').forEach(el=>{
    el.spellcheck=false;
    el.setAttribute('spellcheck','false');
    el.setAttribute('autocorrect','off');
    el.setAttribute('autocapitalize','off');
    el.setAttribute('autocomplete','off');
    el.setAttribute('data-gramm','false');
    el.setAttribute('data-gramm_editor','false');
    el.setAttribute('data-enable-grammarly','false');
  });
}

function info(ch,pos,profile){
  const cp=ch.codePointAt(0), code=hex(cp);
  if(specialSpaces.has(cp)) return {pos,code,name:'SPECIAL SPACE',type:'특수 공백',auto:profile==='standard',action:profile==='standard'?'일반 공백':'보존',replace:' '};
  if(removable.has(cp)||((cp<32&&ch!=='\n'&&ch!=='\t')||cp===127)) return {pos,code,name:'INVISIBLE / CONTROL',type:'숨은 문자',auto:profile!=='inspect',action:profile==='inspect'?'보존':'삭제',replace:''};
  if(sensitive.has(cp)||(cp>=0xFE00&&cp<=0xFE0F)||(cp>=0xE0100&&cp<=0xE01EF)||(cp>=0xE0000&&cp<=0xE007F)) {
    return {pos,code,name:'MEANING-SENSITIVE UNICODE',type:'의미 민감 문자',auto:false,action:'보존',replace:ch,risk:'문자 결합·이모지·표현에 영향을 줄 수 있어 기본 보존'};
  }
  return null;
}

function scan(text){
  const profile=$('#cleanProfile').value;
  let clean='', all=[], auto=[], i=0;
  for(const ch of text){
    const x=info(ch,i,profile);
    if(x){
      all.push({...x,char:ch});
      if(x.auto){auto.push({...x,char:ch});clean+=x.replace}else clean+=ch;
    } else clean+=ch;
    i+=ch.length;
  }
  return {clean,all,auto};
}

function homoglyphs(text){
  let out=[],i=0;
  for(const ch of text){
    if(lookalike[ch]) out.push({pos:i,char:ch,code:hex(ch.codePointAt(0)),name:lookalike[ch]});
    i+=ch.length;
  }
  return out;
}

function sentences(text){
  let out=[],start=0,buf='';
  for(let i=0;i<text.length;i++){
    buf+=text[i];
    if(/[.!?。！？]/.test(text[i])||text[i]==='\n'){
      const t=buf.trim();
      if(t.length>=4){const lead=buf.indexOf(t);out.push({start:start+Math.max(0,lead),end:start+Math.max(0,lead)+t.length,text:t});}
      start=i+1;buf='';
    }
  }
  const t=buf.trim();
  if(t.length>=4){const lead=buf.indexOf(t);out.push({start:start+Math.max(0,lead),end:start+Math.max(0,lead)+t.length,text:t});}
  return out;
}

function issues(text){
  let out=[],id=0;
  const add=(cat,reason,before,after=null,kind='read',start=-1,end=-1,extra={})=>{
    out.push({id:'i'+(++id),cat,reason,before,after,kind,start,end,applicable:typeof after==='string',...extra});
  };
  const rules=[
    [/자주 묻는 질문\s*\(FAQ\)/g,'정형 템플릿','의도한 구성인지 확인하세요.','자주 물어보시더라고요','style'],
    [/결론적으로|요약하자면|정리하자면|마무리하자면/g,'정형 전환어','문맥상 꼭 필요한 연결어인지 확인하세요.','그래서','style'],
    [/\*\*([^*\n]+)\*\*/g,'마크다운 **','굵게 표시 기호가 남아 있습니다.',null,'format'],
    [/^(#{1,6})\s+(.+)$/gm,'마크다운 제목','제목 기호가 남아 있습니다.',null,'format']
  ];
  for(const [re,cat,reason,repl,kind] of rules){
    let m;
    while((m=re.exec(text))){
      const after=cat==='마크다운 **'?m[1]:cat==='마크다운 제목'?m[2]:repl;
      add(cat,reason,m[0],after,kind,m.index,m.index+m[0].length);
    }
  }
  for(const m of text.matchAll(/\n{3,}/g)) add('연속 빈 줄','빈 줄을 줄이면 읽기 흐름이 좋아집니다.',m[0],'\n\n','read',m.index,m.index+m[0].length);

  if($('#repeat').checked){
    const re=/[가-힣A-Za-z0-9]{2,}/g, counts=new Map();
    let m;
    while((m=re.exec(text))) counts.set(m[0],(counts.get(m[0])||0)+1);
    [...counts.entries()].filter(([,n])=>n>=6).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([w,n])=>{
      add('반복 단어',`“${w}”가 ${n}회 반복됩니다. 돋보기로 위치를 순서대로 확인해보세요.`,`${w} × ${n}`,null,'read',-1,-1,{word:w});
    });
  }
  return out;
}

function sentenceSignals(text){
  const reasons=[];
  if(/자주 묻는 질문\s*\(FAQ\)/.test(text))reasons.push('정형 템플릿');
  if(/결론적으로|요약하자면|정리하자면|마무리하자면/.test(text))reasons.push('정형 전환어');
  if(/\*\*[^*\n]+\*\*/.test(text)||/^#{1,6}\s+/m.test(text))reasons.push('마크다운 서식');
  return reasons;
}

function hygiene(text,all,hom){
  const md=(text.match(/\*\*|^#{1,6}\s/gm)||[]).length;
  return Math.max(0,100-Math.min(60,all.length*4)-Math.min(20,hom.length*4)-Math.min(20,md*2));
}

function syncOriginalMetadata(source){
  const t0=performance.now(),sc=scan(source);let base=sc.clean;if($('#norm').checked)base=base.normalize('NFKC');
  const hom=homoglyphs(base);state.original=source;state.base=base;state.chars=sc.auto;state.allChars=sc.all;state.homoglyphs=hom;state.score=hygiene(source,sc.all,hom);state.analyzeMs=performance.now()-t0;state.techUnread=(sc.all.length+hom.length)>0;inputDirty=false;
  $('#textPerf').textContent=`${state.analyzeMs.toFixed(state.analyzeMs<10?1:0)}ms`;renderStats();renderTech();if(!$('#xrayPane').classList.contains('hidden'))renderXray();notifyTextChanged('original');
}
function clearTextAnalysis({keepInput=true,clearRewrite=false,announce=false}={}){
  if(window.__AI_CLEANER_TYPEWRITER_BUSY__)stopTypingPreview({restore:false,silent:true});
  clearTimeout(timer);inputDirty=false;state=makeEmptyTextState();manualEditBaseline='';
  if(!keepInput)$('#input').value='';$('#input').readOnly=false;$('#input').scrollTop=0;$('#output').value='';$('#output').scrollTop=0;$('#output').readOnly=true;$('#editResult').textContent='✎ 직접 수정';delete $('#output').dataset.typewriterVerified;const details=$('#detailDiagnostics');if(details)details.open=false;
  closeAllPanels();activateResultTab('cleaned');renderAll({preserveOutput:true});renderXray();renderDiff();$('#textPerf').textContent='대기';resetHistory('빈 상태');
  if(clearRewrite){try{sessionStorage.removeItem(REWRITE_SESSION_KEY);}catch(_){}try{window.AICleanerRewriteStudio?.resetSession?.();}catch(_){}}
  if(announce)showToast('글 작업을 초기화했습니다.');
}
function resetTextWorkspace(){clearTextAnalysis({keepInput:false,clearRewrite:true,announce:true});queueStats();notifyTextChanged('original');}

function analyze(silent=false){
  const t0=performance.now();
  const input=$('#input').value;
  if(!input.trim()){clearTextAnalysis({keepInput:true});if(!silent)showToast('먼저 글을 입력해 주세요.');return;}
  inputDirty=false;
  const prevIssueCount=state.issues.length;
  const prevReviewCount=state.reviews.filter(r=>r.score>=1).length;
  const prevTechCount=state.allChars.length+state.homoglyphs.length;
  const hadOriginal=!!state.original;
  const sc=scan(input);
  let base=sc.clean;
  if($('#norm').checked)base=base.normalize('NFKC');
  const hom=homoglyphs(base), foundIssues=issues(base);
  state={
    original:input,base,issueBase:base,working:base,chars:sc.auto,allChars:sc.all,issues:foundIssues,applied:new Set(),manual:false,
    homoglyphs:hom,reviews:[],score:hygiene(input,sc.all,hom),focusCycles:Object.create(null),
    issueUnread:foundIssues.length>0&&(!hadOriginal||foundIssues.length!==prevIssueCount),
    reviewUnread:false,
    techUnread:(sc.all.length+hom.length)>0&&(!hadOriginal||(sc.all.length+hom.length)!==prevTechCount),
    analyzeMs:0,reviewOverflow:0
  };
  $('#output').readOnly=true;
  $('#editResult').textContent='✎ 직접 수정';
  renderAll();
  const reviewCount=state.reviews.filter(r=>r.score>=1).length;
  state.reviewUnread=reviewCount>0&&(!hadOriginal||reviewCount!==prevReviewCount);
  state.analyzeMs=performance.now()-t0;
  $('#textPerf').textContent=`${state.analyzeMs.toFixed(state.analyzeMs<10?1:0)}ms`;
  syncWidgets();
  notifyTextChanged('output');
  if(!historyState.restoring)resetHistory('분석 결과');
}

function rebuild(){
  let text=state.issueBase||state.base;
  for(const x of state.issues.filter(x=>state.applied.has(x.id)&&x.applicable&&x.start>=0).sort((a,b)=>b.start-a.start)){
    text=text.slice(0,x.start)+x.after+text.slice(x.end);
  }
  if(!state.manual)state.working=text;
  $('#output').value=state.working;
}

function refreshSuggestionBaseline(text,{unread=true}={}){
  const next=String(text||'');
  state.issueBase=next;state.working=next;state.manual=false;state.applied=new Set();state.issues=issues(next);state.reviews=[];state.focusCycles=Object.create(null);
  const reviewCandidates=sentences(next).filter(x=>{const sig=sentenceSignals(x.text);return ($('#length').checked&&x.text.length>72)||sig.length;}).length;
  state.issueUnread=unread&&state.issues.length>0;state.reviewUnread=unread&&reviewCandidates>0;
  notifyTextChanged('output');
}

function renderAll({preserveOutput=false}={}){
  if(!preserveOutput)rebuild();buildReviews();renderDiag();renderIssues();renderTech();renderStats();renderCompare();syncWidgets();configureEditors();
  if(!$('#xrayPane').classList.contains('hidden'))renderXray();
  if(!$('#diffPane').classList.contains('hidden'))renderDiff();
}

function renderDiag(){
  const spaces=state.allChars.filter(x=>x.type==='특수 공백').length;
  $('#diagHidden').textContent=state.allChars.length-spaces;
  $('#diagSpace').textContent=spaces;
  $('#diagLanguage').textContent=state.issues.filter(x=>x.kind==='style').length;
  $('#diagFormat').textContent=state.issues.filter(x=>x.kind==='format').length;
  $('#diagRead').textContent=state.issues.filter(x=>x.kind==='read').length;
  $('#diagAuto').textContent=state.chars.length;
  const reviewCount=state.reviews.filter(r=>r.score>=1).length;
  $('#diagStatus').textContent=`기술 ${state.allChars.length+state.homoglyphs.length} · 교정 ${state.issues.length} · 문장 검토 ${reviewCount}`;
  const ds=$('#detailSummary');if(ds)ds.textContent=state.original?`교정 ${state.issues.length} · 기술 ${state.allChars.length+state.homoglyphs.length}`:'분석 전';
}

function renderIssues(){
  const box=$('#issues');
  if(!state.issues.length){box.innerHTML='<div class="empty">교정 제안이 없습니다. 🦊</div>';return;}
  box.innerHTML=state.issues.map(x=>{
    const locateTarget=x.word||((x.start>=0&&x.before)?x.before:null);
    const locate=locateTarget?`<button class="mini locate" data-locate="${x.id}" title="결과에서 위치 찾기">🔍 위치 보기</button><span class="locateStatus" id="loc-${x.id}"></span>`:'';
    const apply=x.applicable?(state.applied.has(x.id)?`<button class="mini undo" data-undo="${x.id}">↶ 되돌리기</button>`:`<button class="mini apply" data-apply="${x.id}">반영</button>`):'<span class="mini passive">확인 항목</span>';
    return `<div class="item"><div class="itemtop"><span class="tag ${x.kind==='format'?'blue':''}">${esc(x.cat)}</span><span class="sub">${esc(x.before||'')}</span></div><p>${esc(x.reason)}</p><div class="itemactions">${apply}${locate}</div></div>`;
  }).join('');
  $$('[data-apply]').forEach(b=>b.onclick=()=>{state.applied.add(b.dataset.apply);state.manual=false;renderAll();notifyTextChanged('output');flashOutput();recordHistory('교정 반영');});
  $$('[data-undo]').forEach(b=>b.onclick=()=>{state.applied.delete(b.dataset.undo);state.manual=false;renderAll();notifyTextChanged('output');flashOutput();recordHistory('교정 되돌리기');});
  $$('[data-locate]').forEach(b=>b.onclick=()=>locateIssue(b.dataset.locate));
}

function activateResultTab(name){
  $$('[data-resulttab]').forEach(x=>x.classList.toggle('active',x.dataset.resulttab===name));
  ['cleaned','xray','diff'].forEach(n=>$('#'+n+'Pane').classList.toggle('hidden',name!==n));
  if(name==='xray')renderXray();if(name==='diff')renderDiff();
}

function scrollTextareaToRange(el,start,end){
  const value=el.value||'';
  start=Math.max(0,Math.min(value.length,start));end=Math.max(start,Math.min(value.length,end));
  const cs=getComputedStyle(el), mirror=document.createElement('div');
  mirror.style.position='fixed';mirror.style.left='-100000px';mirror.style.top='0';mirror.style.visibility='hidden';
  mirror.style.boxSizing='border-box';mirror.style.width=el.offsetWidth+'px';mirror.style.padding=cs.padding;mirror.style.border=cs.border;
  mirror.style.fontFamily=cs.fontFamily;mirror.style.fontSize=cs.fontSize;mirror.style.fontWeight=cs.fontWeight;mirror.style.fontStyle=cs.fontStyle;
  mirror.style.letterSpacing=cs.letterSpacing;mirror.style.lineHeight=cs.lineHeight;mirror.style.whiteSpace='pre-wrap';mirror.style.wordBreak='break-word';mirror.style.overflowWrap='break-word';
  mirror.textContent=value.slice(0,start);
  const marker=document.createElement('span');marker.textContent=value.slice(start,Math.max(start+1,end))||'\u200b';mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const targetY=marker.offsetTop;
  mirror.remove();
  el.focus({preventScroll:true});
  el.setSelectionRange(start,end);
  const lineHeight=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.6||20;
  el.scrollTop=Math.max(0,targetY-el.clientHeight*.42+lineHeight*2);
  const r=el.getBoundingClientRect();
  if(r.top<70||r.bottom>innerHeight-20)el.scrollIntoView({behavior:'smooth',block:'center'});
}

function locateIssue(id){
  const issue=state.issues.find(x=>x.id===id);if(!issue)return;
  activateResultTab('cleaned');
  const out=$('#output'),text=out.value,needle=issue.word||issue.before;if(!needle)return;
  const starts=[];let from=0;
  while(from<=text.length){const idx=text.indexOf(needle,from);if(idx<0)break;starts.push(idx);from=idx+Math.max(1,needle.length);if(starts.length>=500)break;}
  const status=$('#loc-'+id);
  if(!starts.length){if(status)status.textContent='현재 결과에서 찾지 못함';return;}
  const next=(state.focusCycles[id]||0)%starts.length;state.focusCycles[id]=next+1;
  const pos=starts[next];if(status)status.textContent=`${next+1}/${starts.length}`;
  requestAnimationFrame(()=>scrollTextareaToRange(out,pos,pos+needle.length));
}

function locateOriginalPosition(pos,len=1){
  const input=$('#input');
  requestAnimationFrame(()=>scrollTextareaToRange(input,pos,pos+Math.max(1,len)));
}

function flashOutput(){
  const out=$('#output');out.classList.remove('resultFlash');void out.offsetWidth;out.classList.add('resultFlash');
  setTimeout(()=>out.classList.remove('resultFlash'),800);
}

function renderTech(){
  const rows=[];
  for(const x of state.allChars.slice(0,500))rows.push(`<tr><td>${x.pos}</td><td><b>${x.code}</b></td><td>${esc(x.type)}</td><td>${esc(x.action)}</td><td>${x.auto?'자동':'보존'}</td></tr>`);
  for(const x of state.homoglyphs.slice(0,100))rows.push(`<tr><td>${x.pos}</td><td><b>${x.code}</b></td><td>유사문자</td><td>확인</td><td>보존</td></tr>`);
  $('#removalTable').innerHTML=rows.length?rows.join(''):'<tr><td colspan="5" class="empty">기술 정보가 없습니다.</td></tr>';
  const hidden=state.allChars.filter(x=>x.type==='숨은 문자').length,spaces=state.allChars.filter(x=>x.type==='특수 공백').length,kept=state.allChars.filter(x=>!x.auto).length;
  $('#techSummary').innerHTML=[`<span class="techChip">숨은 문자 <b>${hidden}</b></span>`,`<span class="techChip">특수 공백 <b>${spaces}</b></span>`,`<span class="techChip">보존 항목 <b>${kept}</b></span>`,`<span class="techChip">유사문자 <b>${state.homoglyphs.length}</b></span>`].join('');
}

function renderXray(){
  const box=$('#xrayView');
  if(!state.original){box.innerHTML='<div class="empty">숨은 문자가 있으면 위치를 눈에 보이게 표시합니다.</div>';$('#xraySummary').innerHTML='';return;}
  const byPos=new Map(state.allChars.map(x=>[x.pos,x]));
  const hidden=state.allChars.filter(x=>x.type==='숨은 문자').length,spaces=state.allChars.filter(x=>x.type==='특수 공백').length,kept=state.allChars.filter(x=>!x.auto).length;
  $('#xraySummary').innerHTML=`<span class="techChip">숨은 문자 <b>${hidden}</b></span><span class="techChip">특수 공백 <b>${spaces}</b></span><span class="techChip">보존 <b>${kept}</b></span>`;
  let html='',i=0;
  for(const ch of state.original){
    const x=byPos.get(i);
    if(x){
      const kind=x.type==='특수 공백'?'space':(x.auto?'auto':'keep');
      const cls=kind==='space'?'xrhit xrspace':kind==='auto'?'xrhit xrauto':'xrhit xrkeep';
      html+=`<button type="button" class="${cls}" data-xkind="${kind}" data-xpos="${x.pos}" data-xlen="${x.char.length}" title="${esc(x.name)} · 원본 위치로 이동">${x.code}</button>`;
    }else html+=esc(ch);
    i+=ch.length;
  }
  box.innerHTML=html;box.dataset.filter=xrayFilter;
  $$('[data-xpos]').forEach(el=>el.onclick=()=>locateOriginalPosition(Number(el.dataset.xpos),Number(el.dataset.xlen)||1));
}

function codePointLength(t){let n=0;for(const _ of t)n++;return n;}
let statsFrame=0,statsTimer=0;
function queueStats(){
  const len=($('#input').value||'').length;
  if(statsFrame){cancelAnimationFrame(statsFrame);statsFrame=0;}
  clearTimeout(statsTimer);
  if(len<12000){statsFrame=requestAnimationFrame(()=>{statsFrame=0;renderStats();});}
  else{statsTimer=setTimeout(renderStats,len>100000?180:100);}
}
function renderStats(){
  const t=$('#input').value||'',words=(t.match(/[가-힣A-Za-z0-9]{2,}/g)||[]).length,lines=t?t.split(/\r?\n/).length:0;
  $('#textStats').innerHTML=`<span class="statpill">문자 <b>${codePointLength(t)}</b></span><span class="statpill">단어 <b>${words}</b></span><span class="statpill">줄 <b>${lines}</b></span>`;
  const analyzed=!!t&&state.original===t&&!inputDirty;$('#cleanScore').textContent=analyzed?`텍스트 위생 ${state.score}`:(t?'텍스트 위생 재분석 대기':'텍스트 위생 --');
}

function reviewSuggestion(text){
  let s=text;
  s=s.replace(/자주 묻는 질문\s*\(FAQ\)/g,'자주 물어보시더라고요');
  s=s.replace(/결론적으로|요약하자면|정리하자면|마무리하자면/g,'그래서');
  s=s.replace(/\*\*([^*\n]+)\*\*/g,'$1');
  s=s.replace(/^(#{1,6})\s+(.+)$/gm,'$2');
  return s===text?'':s;
}

function buildReviews(){
  const source=$('#output').value||state.working||state.base||'';
  const previous=new Map((state.reviews||[]).map(r=>[`${r.start}:${r.text}`,r]));
  const all=sentences(source),limit=400;state.reviewOverflow=Math.max(0,all.length-limit);
  state.reviews=all.slice(0,limit).map((x,i)=>{
    let score=0,reasons=[];
    if($('#length').checked){if(x.text.length>100){score+=2;reasons.push('100자 초과 긴 문장');}else if(x.text.length>72){score++;reasons.push('조금 긴 문장');}}
    const sig=sentenceSignals(x.text);if(sig.length){score+=Math.min(2,sig.length);reasons.push(...sig.slice(0,2));}
    const prev=previous.get(`${x.start}:${x.text}`),suggestion=reviewSuggestion(x.text);
    return {id:'s'+i,...x,score,reasons:[...new Set(reasons)],suggestion,edit:prev?prev.edit:x.text,selected:prev?prev.selected:false};
  });
  const box=$('#v62ReviewList'),candidates=state.reviews.filter(r=>r.score>=1);
  $('#reviewPanelStatus').textContent=state.reviewOverflow?`검토 후보 ${candidates.length}개 · ${state.reviewOverflow}문장 추가 생략`:`검토 후보 ${candidates.length}개`;
  box.innerHTML=candidates.length?candidates.map(r=>`<div class="v62review ${r.score>=1.5?'attn':''}" data-review-card="${r.id}"><div class="itemtop"><label class="check"><input type="checkbox" data-rsel="${r.id}" ${r.selected?'checked':''}> 반영 선택</label><span class="tag blue">편집 체크 ${r.score.toFixed(1)}</span><span class="v62small">${r.text.length}자</span></div><div class="src">${esc(r.text)}</div><textarea spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" data-redit="${r.id}">${esc(r.edit)}</textarea><div class="v62reason">${r.reasons.length?'확인: '+esc(r.reasons.join(' · ')):'특별한 편집 신호 없음'}</div><div class="itemactions">${r.suggestion?`<button class="mini suggest" type="button" data-rsuggest="${r.id}">추천안 채우기</button>`:''}<button class="mini locate" type="button" data-rlocate="${r.id}">🔍 결과에서 보기</button></div></div>`).join(''):'<div class="empty">따로 검토할 문장이 없습니다.</div>';
  $$('[data-rsel]').forEach(e=>e.onchange=()=>{const r=state.reviews.find(x=>x.id===e.dataset.rsel);if(r)r.selected=e.checked;updateReviewApplyState();});
  $$('[data-redit]').forEach(e=>e.oninput=()=>{const r=state.reviews.find(x=>x.id===e.dataset.redit);if(r){r.edit=e.value;const card=e.closest('[data-review-card]');if(card)card.classList.toggle('reviewChanged',r.edit!==r.text);}updateReviewApplyState();});
  $$('[data-rsuggest]').forEach(b=>b.onclick=()=>{const r=state.reviews.find(x=>x.id===b.dataset.rsuggest);if(!r||!r.suggestion)return;const area=box.querySelector(`[data-redit="${r.id}"]`);if(area){area.value=r.suggestion;area.dispatchEvent(new Event('input',{bubbles:true}));}const check=box.querySelector(`[data-rsel="${r.id}"]`);if(check){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}});
  $$('[data-rlocate]').forEach(b=>b.onclick=()=>{const r=state.reviews.find(x=>x.id===b.dataset.rlocate);if(r)locateInTextarea($('#output'),r.text,0,'');});
  configureEditors(box);updateReviewApplyState();
}

function updateReviewApplyState(){
  const changed=state.reviews.filter(r=>r.selected&&r.edit!==r.text).length;
  const badge=$('#reviewEditCount'),button=$('#v62ApplyReviews');
  if(badge){badge.textContent=`수정됨 ${changed}개`;badge.classList.toggle('ready',changed>0);}
  if(button)button.disabled=changed===0;
}

function countIssuesLight(text){
  let n=0;
  n+=(text.match(/자주 묻는 질문\s*\(FAQ\)/g)||[]).length;
  n+=(text.match(/결론적으로|요약하자면|정리하자면|마무리하자면/g)||[]).length;
  n+=(text.match(/\*\*[^*\n]+\*\*/g)||[]).length;
  n+=(text.match(/^#{1,6}\s+.+$/gm)||[]).length;
  n+=(text.match(/\n{3,}/g)||[]).length;
  if($('#repeat').checked){const words=text.match(/[가-힣A-Za-z0-9]{2,}/g)||[],f=new Map();for(const w of words)f.set(w,(f.get(w)||0)+1);n+=[...f.values()].filter(v=>v>=6).length;}
  return n;
}

function renderCompare(){
  if(!state.original){$('#v62HygBefore').textContent='—';$('#v62HygAfter').textContent='—';$('#v62HygDelta').textContent='분석 전';$('#v62IssueDelta').textContent='분석 전';return;}
  const current=$('#output').value||state.working,sc=scan(current),after=hygiene(current,sc.all,homoglyphs(sc.clean));
  $('#v62HygBefore').textContent=state.score+'/100';$('#v62HygAfter').textContent=after+'/100';
  $('#v62HygDelta').textContent=`기술 흔적 ${state.allChars.length} → ${sc.all.length}`;$('#v62IssueDelta').textContent=`편집 체크 ${state.issues.length} → ${countIssuesLight(sc.clean)}`;
}
function queueCompare(){clearTimeout(compareTimer);compareTimer=setTimeout(renderCompare,180);}

function applyReviews(){
  let text=$('#output').value||state.working,done=0;
  const selected=state.reviews.filter(r=>r.selected);
  const changed=selected.filter(r=>r.edit!==r.text);
  if(!changed.length){
    showToast(selected.length?'체크만으로는 문장이 바뀌지 않습니다. 문장을 수정하거나 추천안 채우기를 눌러주세요.':'수정할 문장을 먼저 선택해 주세요.');
    return;
  }
  for(const r of changed.sort((a,b)=>b.start-a.start)){
    let idx=-1;if(text.slice(r.start,r.end)===r.text)idx=r.start;if(idx<0)idx=text.indexOf(r.text,Math.max(0,r.start-100));if(idx<0)idx=text.indexOf(r.text);
    if(idx>=0){text=text.slice(0,idx)+r.edit+text.slice(idx+r.text.length);done++;}
  }
  if(!done)return showToast('현재 결과에서 수정 대상 문장을 찾지 못했습니다. 다시 분석한 뒤 시도해 주세요.');
  $('#output').value=text;refreshSuggestionBaseline(text,{unread:false});renderAll();flashOutput();recordHistory('문장 검토 반영');revealAppliedResult(`✓ ${done}개 문장을 결과에 반영했습니다.`);
}

function download(name,data,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function liveDelay(len){return len>50000?1100:len>20000?720:380;}

function syncWidgets(){
  const textVisible=!$('#textTool').classList.contains('hidden'),issueCount=inputDirty?0:state.issues.length,reviewCount=inputDirty?0:state.reviews.filter(r=>r.score>=1).length,techCount=inputDirty?0:state.allChars.length+state.homoglyphs.length;
  const iw=$('#issuesWidget'),rw=$('#reviewWidget'),tw=$('#techWidget'),ww=$('#rewriteWidget');
  const hasText=!!((state.original||$('#input')?.value||'').trim());
  iw.hidden=!textVisible||issueCount===0;rw.hidden=!textVisible||reviewCount===0;tw.hidden=!textVisible||techCount===0;if(ww)ww.hidden=!textVisible||!hasText;
  $('#issueCount').textContent=issueCount;$('#reviewCount').textContent=reviewCount;$('#techCount').textContent=techCount;
  iw.classList.toggle('attention',state.issueUnread&&issueCount>0);rw.classList.toggle('attention',state.reviewUnread&&reviewCount>0);tw.classList.toggle('attention',state.techUnread&&techCount>0);
  if(ww&&hasText&&!ww.dataset.seenReady){ww.classList.add('rewriteReady');ww.dataset.seenReady='1';setTimeout(()=>ww.classList.remove('rewriteReady'),3600);}
  if(inputDirty){$('#issuesPanel').hidden=true;$('#reviewPanel').hidden=true;$('#techPanel').hidden=true;}
  if(!textVisible){$('#issuesPanel').hidden=true;$('#reviewPanel').hidden=true;$('#rewritePanel').hidden=true;$('#techPanel').hidden=true;}
}

function positionPanelDefault(panel){
  if(innerWidth<=PANEL_SHEET_BREAKPOINT||!panel)return;
  const anchor=$('#input').getBoundingClientRect(),r=panel.getBoundingClientRect();
  const offsets={issuesPanel:[14,12],reviewPanel:[34,30],rewritePanel:[22,16],techPanel:[54,48]};
  const [ox,oy]=offsets[panel.id]||[14,12];
  const left=Math.max(8,Math.min(innerWidth-r.width-8,anchor.left+ox));
  const top=Math.max(76,Math.min(innerHeight-r.height-8,anchor.top+oy));
  panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';panel.style.bottom='auto';
}

function clampPanelToViewport(panel){
  if(!panel||panel.hidden||innerWidth<=PANEL_SHEET_BREAKPOINT)return;
  const r=panel.getBoundingClientRect();
  const maxW=Math.max(360,innerWidth-16),maxH=Math.max(260,innerHeight-16);
  if(r.width>maxW)panel.style.width=maxW+'px';if(r.height>maxH)panel.style.height=maxH+'px';
  const rr=panel.getBoundingClientRect(),left=Math.max(8,Math.min(innerWidth-rr.width-8,rr.left)),top=Math.max(76,Math.min(innerHeight-rr.height-8,rr.top));
  panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';panel.style.bottom='auto';
}
const FLOAT_PANEL_IDS=['issuesPanel','reviewPanel','rewritePanel','techPanel'];
function closeAllPanels(except=''){for(const pid of FLOAT_PANEL_IDS){if(pid!==except){const p=$('#'+pid);if(p)p.hidden=true;}}}
function openPanel(id){
  closeAllPanels(id);
  const panel=$('#'+id);panel.hidden=false;
  if(panel.dataset.defaultPosition==='pending'){positionPanelDefault(panel);panel.dataset.defaultPosition='done';}
  if(id==='issuesPanel'){state.issueUnread=false;$('#issuesWidget').classList.remove('attention');}
  if(id==='reviewPanel'){state.reviewUnread=false;$('#reviewWidget').classList.remove('attention');}
  if(id==='techPanel'){state.techUnread=false;$('#techWidget').classList.remove('attention');}
  panel.style.zIndex=String(++openPanel.z);clampPanelToViewport(panel);
}
openPanel.z=220;
function revealAppliedResult(message='결과에 적용했습니다.'){
  closeAllPanels();
  const textButton=document.querySelector('[data-tool="text"]');if(textButton&&!textButton.classList.contains('active'))textButton.click();
  activateResultTab('cleaned');
  const out=$('#output');
  requestAnimationFrame(()=>{
    out.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
    setTimeout(()=>{out.classList.remove('resultApplied');void out.offsetWidth;out.classList.add('resultApplied');out.focus({preventScroll:true});try{out.setSelectionRange(0,0);}catch(_){}setTimeout(()=>out.classList.remove('resultApplied'),1300);},180);
  });
  showToast(message);
}

function makeDraggable(panel){
  const handle=panel.querySelector('[data-drag-handle]');if(!handle)return;let drag=null;const key='ai-cleaner-panel-'+panel.id,legacyKey='v66-pos-'+panel.id;
  try{const saved=JSON.parse(localStorage.getItem(key)||localStorage.getItem(legacyKey)||'null');if(saved&&innerWidth>PANEL_SHEET_BREAKPOINT){panel.style.left=saved.left+'px';panel.style.top=saved.top+'px';panel.style.right='auto';panel.style.bottom='auto';if(saved.width)panel.style.width=saved.width+'px';if(saved.height)panel.style.height=saved.height+'px';panel.dataset.defaultPosition='done';setTimeout(()=>clampPanelToViewport(panel),0);}else panel.dataset.defaultPosition='pending';}catch(_){panel.dataset.defaultPosition='pending';}
  handle.addEventListener('pointerdown',(e)=>{
    if(e.button!==0||innerWidth<=PANEL_SHEET_BREAKPOINT||e.target.closest('button'))return;
    const r=panel.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};handle.setPointerCapture(e.pointerId);
    panel.style.left=r.left+'px';panel.style.top=r.top+'px';panel.style.right='auto';panel.style.bottom='auto';panel.style.zIndex=String(++openPanel.z);
  });
  handle.addEventListener('pointermove',(e)=>{
    if(!drag||drag.id!==e.pointerId)return;const maxX=Math.max(8,innerWidth-panel.offsetWidth-8),maxY=Math.max(8,innerHeight-panel.offsetHeight-8);
    panel.style.left=Math.max(8,Math.min(maxX,e.clientX-drag.dx))+'px';panel.style.top=Math.max(8,Math.min(maxY,e.clientY-drag.dy))+'px';
  });
  const savePanel=()=>{if(innerWidth<=PANEL_SHEET_BREAKPOINT||panel.hidden)return;const r=panel.getBoundingClientRect();try{localStorage.setItem(key,JSON.stringify({left:r.left,top:r.top,width:r.width,height:r.height}));}catch(_){}};
  const end=()=>{if(!drag)return;savePanel();drag=null;};
  handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  if('ResizeObserver' in window){let rt=0;new ResizeObserver(()=>{clearTimeout(rt);rt=setTimeout(savePanel,140);}).observe(panel);}
}

function showToast(message){
  const t=$('#appToast');t.textContent=message;t.hidden=false;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.hidden=true,180);},1800);
}

function isTextEditor(el){return !!el&&el.matches&&el.matches('textarea,input[type="text"],input[type="search"],input[type="url"],input[type="email"]');}
function hideContextMenu(){$('#textContextMenu').hidden=true;contextTarget=null;}
function showContextMenu(x,y,target){
  const menu=$('#textContextMenu');contextTarget=target;menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
  requestAnimationFrame(()=>{const w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-h-8,y))+'px';});
  const directOnly=target.dataset&&target.dataset.directTyping==='true';menu.querySelectorAll('[data-context-action="copy"],[data-context-action="paste"],[data-context-action="append"]').forEach(b=>b.disabled=directOnly||((b.dataset.contextAction!=='copy')&&(!!target.readOnly||target.disabled)));
}
async function clipboardRead(){try{return await navigator.clipboard.readText();}catch(_){showToast('클립보드 읽기가 차단됐습니다. 입력창에서 Ctrl+V를 사용하세요.');return null;}}
async function contextAction(action){
  const el=contextTarget;if(!el)return hideContextMenu();
  if(action==='selectAll'){el.focus();el.select();}
  else if(action==='copy'){const text=el.value.slice(el.selectionStart||0,el.selectionEnd||0)||el.value;try{await navigator.clipboard.writeText(text);showToast('복사했습니다.');}catch(_){showToast('복사 권한이 없어 Ctrl+C를 사용해 주세요.');}}
  else if(action==='paste'&&!el.readOnly){const text=await clipboardRead();if(text!=null){el.focus();el.setRangeText(text,el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input',{bubbles:true}));}}
  else if(action==='append'&&!el.readOnly){const text=await clipboardRead();if(text!=null){el.focus();const pos=el.selectionEnd;el.setRangeText(text,pos,pos,'end');el.dispatchEvent(new Event('input',{bubbles:true}));}}
  hideContextMenu();
}

document.addEventListener('contextmenu',(e)=>{
  const editor=e.target.closest&&e.target.closest('textarea,input[type="text"],input[type="search"],input[type="url"],input[type="email"]');
  e.preventDefault();
  if(editor)showContextMenu(e.clientX,e.clientY,editor);else hideContextMenu();
});
document.addEventListener('selectstart',(e)=>{if(!isTextEditor(e.target)&&!e.target.closest('textarea'))e.preventDefault();});
document.addEventListener('pointerdown',(e)=>{if(!e.target.closest('#textContextMenu'))hideContextMenu();});
document.addEventListener('dragstart',(e)=>{e.preventDefault();});
$('#textContextMenu').addEventListener('click',(e)=>{const b=e.target.closest('[data-context-action]');if(b&&!b.disabled)contextAction(b.dataset.contextAction);});

document.addEventListener('keydown',(e)=>{
  if(e.key!=='Escape')return;
  hideContextMenu();
  if(!$('#typingPreviewOverlay').hidden){stopTypingPreview();return;}
  const visible=FLOAT_PANEL_IDS.map(id=>$('#'+id)).filter(p=>p&&!p.hidden).sort((x,y)=>(Number(y.style.zIndex)||0)-(Number(x.style.zIndex)||0));
  if(visible[0]){visible[0].hidden=true;e.preventDefault();}
});
window.addEventListener('resize',()=>{for(const id of FLOAT_PANEL_IDS)clampPanelToViewport($('#'+id));});

let typingPreview={running:false,paused:false,completed:false,chars:[],index:0,frame:0,last:0,source:'',historyIndex:-1,inputWasReadOnly:false,bridgePct:-1};
function splitGraphemesExact(text){
  if(typeof Intl!=='undefined'&&Intl.Segmenter){try{return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(x=>x.segment);}catch(_){}}
  return Array.from(text);
}
function setTypewriterBusy(busy){
  window.__AI_CLEANER_TYPEWRITER_BUSY__=!!busy;
  const controls=[...new Set([
    ...['copy','downloadTxt','editResult','undoStep','redoStep','undoAll','sample','reset','textFileInput','cleanProfile','norm','repeat','length','liveScan','openImage','imageInput'].map(id=>$('#'+id)).filter(Boolean),
    ...$$('[data-tool]'),...$$('[data-resulttab]')
  ])];
  if(busy){typewriterDisabledState=new Map();for(const el of controls){typewriterDisabledState.set(el,!!el.disabled);el.disabled=true;}}
  else{for(const [el,wasDisabled] of typewriterDisabledState){if(el&&el.isConnected)el.disabled=wasDisabled;}typewriterDisabledState.clear();updateHistoryButtons();syncWidgets();}
  $('#typingPreviewButton').disabled=!!busy;$('#typingPreviewButton').classList.toggle('typewriterRunning',!!busy);$('#typingPreviewButton').setAttribute('aria-expanded',busy?'true':'false');
  $('#output').classList.toggle('typewriterActive',!!busy);$('#output').setAttribute('aria-busy',busy?'true':'false');
}
function typewriterStatus(text){const el=$('#typingPreviewText');if(el)el.textContent=text;}
function typewriterBridgeStatus(text='원본 → 결과'){const el=$('#typingBridgeStatus');if(el)el.textContent=text;}
function stopTypingPreview({restore=true,silent=false}={}){
  cancelAnimationFrame(typingPreview.frame);const wasRunning=typingPreview.running&&!typingPreview.completed;
  typingPreview.running=false;typingPreview.paused=false;window.__AI_CLEANER_TYPEWRITER_BUSY__=false;
  $('#typingPreviewOverlay').hidden=true;$('#typingPreviewPause').textContent='일시정지';typewriterBridgeStatus();
  $('#input').readOnly=typingPreview.inputWasReadOnly;setTypewriterBusy(false);
  if(restore&&wasRunning&&typingPreview.historyIndex>=0){restoreHistoryIndex(typingPreview.historyIndex,{announce:false});if(!silent)showToast('자동 작성을 중지하고 이전 결과로 복원했습니다.');}
}
function finishTypingPreview(){
  const out=$('#output'),exact=out.value===typingPreview.source;
  typingPreview.running=false;typingPreview.completed=exact;window.__AI_CLEANER_TYPEWRITER_BUSY__=false;$('#input').readOnly=typingPreview.inputWasReadOnly;setTypewriterBusy(false);
  if(!exact){typewriterStatus(`일치 검증 실패 · 원본 ${typingPreview.source.length} UTF-16 / 결과 ${out.value.length} UTF-16`);$('#typingPreviewPause').textContent='오류';if(typingPreview.historyIndex>=0)restoreHistoryIndex(typingPreview.historyIndex,{announce:false});$('#typingPreviewOverlay').hidden=true;typewriterBridgeStatus();showToast('자동 작성 검증에 실패해 이전 결과로 복원했습니다.');return;}
  typewriterStatus(`100% 일치 확인 ✓ · ${typingPreview.chars.length.toLocaleString()} 글자 단위 · ${typingPreview.source.length.toLocaleString()} UTF-16`);
  $('#typingPreviewProgress').textContent='100%';$('#typingPreviewPause').textContent='완료';typewriterBridgeStatus('완료');out.dataset.typewriterVerified='true';
  if(window.AICleanerApp.commitProgressiveResult(typingPreview.source,'원본 자동 작성')){setTimeout(()=>{$('#typingPreviewOverlay').hidden=true;typewriterBridgeStatus();},850);}
}
function startTypingPreview(){
  if(typingPreview.running)return;
  const source=$('#input').value;if(!source)return showToast('먼저 원본 글을 입력해 주세요.');
  clearTimeout(timer);if(!$('#output').readOnly)$('#editResult').click();syncOriginalMetadata(source);if(historyState.index<0)resetHistory('자동 작성 전');
  closeAllPanels();activateResultTab('cleaned');
  cancelAnimationFrame(typingPreview.frame);typingPreview={running:true,paused:false,completed:false,chars:splitGraphemesExact(source),index:0,frame:0,last:0,source,historyIndex:historyState.index,inputWasReadOnly:$('#input').readOnly,bridgePct:-1};
  const out=$('#output'),overlay=$('#typingPreviewOverlay');delete out.dataset.typewriterVerified;out.readOnly=true;out.value='';out.scrollTop=0;$('#input').readOnly=true;overlay.hidden=false;
  $('#typingPreviewPause').textContent='일시정지';$('#typingPreviewProgress').textContent='0%';typewriterBridgeStatus('0%');typewriterStatus(`원본 ${typingPreview.chars.length.toLocaleString()} 글자 단위를 결과창에 순서대로 작성합니다.`);setTypewriterBusy(true);
  const step=(ts)=>{
    if(!typingPreview.running)return;
    if(typingPreview.paused){typingPreview.frame=requestAnimationFrame(step);return;}
    const delay=Math.max(0,Number($('#typingPreviewSpeed').value)||0);
    if(!typingPreview.last||ts-typingPreview.last>=delay){
      const piece=typingPreview.chars[typingPreview.index];
      if(piece!==undefined){out.setRangeText(piece,out.value.length,out.value.length,'end');typingPreview.index++;typingPreview.last=ts;out.scrollTop=out.scrollHeight;}
      const pct=Math.round((typingPreview.index/Math.max(1,typingPreview.chars.length))*100);$('#typingPreviewProgress').textContent=pct+'%';if(pct!==typingPreview.bridgePct){typingPreview.bridgePct=pct;typewriterBridgeStatus(pct+'%');}
      if(typingPreview.index===1||typingPreview.index%50===0||typingPreview.index===typingPreview.chars.length)typewriterStatus(`작성 중 · ${typingPreview.index.toLocaleString()} / ${typingPreview.chars.length.toLocaleString()} 글자 단위 · ${pct}%`);
    }
    if(typingPreview.index>=typingPreview.chars.length){finishTypingPreview();return;}
    typingPreview.frame=requestAnimationFrame(step);
  };
  typingPreview.frame=requestAnimationFrame(step);
}
$('#typingPreviewButton').onclick=startTypingPreview;
$('#typingPreviewClose').onclick=()=>stopTypingPreview({restore:true});
$('#typingPreviewPause').onclick=()=>{if(!typingPreview.running)return;typingPreview.paused=!typingPreview.paused;$('#typingPreviewPause').textContent=typingPreview.paused?'계속':'일시정지';const pct=Math.round((typingPreview.index/Math.max(1,typingPreview.chars.length))*100);typewriterBridgeStatus(typingPreview.paused?'일시정지':pct+'%');typewriterStatus(typingPreview.paused?`일시정지 · ${typingPreview.index.toLocaleString()} / ${typingPreview.chars.length.toLocaleString()}`:`작성 계속 · ${typingPreview.index.toLocaleString()} / ${typingPreview.chars.length.toLocaleString()}`);};

let timer;
$('#input').addEventListener('input',()=>{inputDirty=true;queueStats();syncWidgets();notifyTextChanged('original');if(!$('#input').value.trim()){clearTextAnalysis({keepInput:true});return;}if($('#liveScan').checked){clearTimeout(timer);timer=setTimeout(()=>analyze(true),liveDelay($('#input').value.length));}});
$('#analyze').onclick=()=>analyze(false);$('#sample').onclick=()=>{$('#input').value=sample;inputDirty=true;notifyTextChanged('original');analyze(true);};$('#reset').onclick=resetTextWorkspace;
['norm','repeat','length','liveScan','cleanProfile'].forEach(id=>$('#'+id).addEventListener('change',()=>{if($('#input').value.trim()&&id!=='liveScan')analyze(true);}));

$('#copy').onclick=async()=>{if(!$('#output').value)return;try{await navigator.clipboard.writeText($('#output').value);showToast('결과를 복사했습니다.');}catch(_){showToast('클립보드 권한이 없어 복사하지 못했습니다. 결과창에서 직접 선택해 주세요.');}};
$('#downloadTxt').onclick=()=>$('#output').value&&download(`cleaned-v${APP_VERSION}.txt`,$('#output').value,'text/plain;charset=utf-8');
$('#downloadJson').onclick=()=>state.original&&download(`ai-clean-report-v${APP_VERSION}.json`,JSON.stringify({version:APP_VERSION,profile:$('#cleanProfile').value,hygieneScore:state.score,analysisMs:state.analyzeMs,autoProcessed:state.chars,preserved:state.allChars.filter(x=>!x.auto),homoglyphs:state.homoglyphs,suggestions:state.issues},null,2),'application/json;charset=utf-8');
$('#undoAll').onclick=()=>{if(!state.original)return;state.issueBase=state.base;state.issues=issues(state.base);state.reviews=[];state.applied.clear();state.manual=false;state.working=state.base;renderAll();notifyTextChanged('output');flashOutput();recordHistory('처음 결과');};
$('#undoStep').onclick=undoHistory;$('#redoStep').onclick=redoHistory;
$('#editResult').onclick=()=>{if(!state.original)return;if($('#output').readOnly){manualEditBaseline=$('#output').value;$('#output').readOnly=false;$('#output').focus();$('#editResult').textContent='✓ 수정 완료';}else{$('#output').readOnly=true;const edited=$('#output').value;$('#editResult').textContent='✎ 직접 수정';if(edited!==manualEditBaseline){refreshSuggestionBaseline(edited,{unread:false});renderAll();flashOutput();recordHistory('직접 수정');}else{state.working=edited;state.manual=false;}manualEditBaseline='';}};
$('#output').addEventListener('input',()=>{if(!$('#output').readOnly){state.working=$('#output').value;state.manual=true;queueCompare();}});
$('#v62ApplyReviews').onclick=applyReviews;

function rtfToText(raw){
  let text=raw.replace(/\\u(-?\d+)\??/g,(_,n)=>{let cp=Number(n);if(cp<0)cp+=65536;return String.fromCharCode(cp);});
  return text.replace(/\\par[d]?\b ?/g,'\n').replace(/\\tab\b ?/g,'\t').replace(/\\'[0-9a-fA-F]{2}/g,m=>String.fromCharCode(parseInt(m.slice(2),16))).replace(/\\[a-zA-Z]+-?\d* ?/g,'').replace(/[{}]/g,'').replace(/\\([\\{}])/g,'$1');
}
function importedText(name,raw){
  if(/\.html?$/i.test(name)){const d=new DOMParser().parseFromString(raw,'text/html');return (d.body&&d.body.innerText)||d.documentElement.textContent||'';}
  if(/\.xml$/i.test(name)){try{const d=new DOMParser().parseFromString(raw,'application/xml');if(!d.querySelector('parsererror'))return d.documentElement.textContent||raw;}catch(_){}return raw;}
  if(/\.rtf$/i.test(name))return rtfToText(raw);
  return raw;
}
function looksBinaryText(raw){if(!raw)return false;const sample=raw.slice(0,65536);let nul=0,ctrl=0;for(const ch of sample){const cp=ch.charCodeAt(0);if(cp===0)nul++;else if(cp<9||(cp>13&&cp<32))ctrl++;}return nul>0||ctrl>Math.max(12,sample.length*.02);}
$('#textFileInput').addEventListener('change',async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{if(f.size>MAX_TEXT_FILE_BYTES){showToast('20MB가 넘는 텍스트 파일은 브라우저가 느려질 수 있어 열지 않았습니다. 파일을 나눠서 사용해 주세요.');return;}const raw=await f.text();if(looksBinaryText(raw)){showToast('바이너리 데이터가 많은 파일이라 텍스트로 열지 않았습니다.');return;}const s=importedText(f.name,raw);$('#input').value=s;inputDirty=true;notifyTextChanged('original');analyze(true);showToast(`${f.name} 파일을 열었습니다.`);}catch(err){showToast('파일을 읽지 못했습니다. 텍스트 기반 파일인지 확인해 주세요.');}finally{e.target.value='';}});

$$('[data-resulttab]').forEach(t=>t.onclick=()=>activateResultTab(t.dataset.resulttab));
$$('[data-xray-filter]').forEach(b=>b.onclick=()=>{xrayFilter=b.dataset.xrayFilter;$$('[data-xray-filter]').forEach(x=>x.classList.toggle('active',x===b));$('#xrayView').dataset.filter=xrayFilter;});

$$('[data-tool]').forEach(b=>b.onclick=()=>{$$('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));$('#textTool').classList.toggle('hidden',b.dataset.tool!=='text');$('#imageTool').classList.toggle('hidden',b.dataset.tool!=='image');syncWidgets();});

window.AICleanerApp={
  version:APP_VERSION,assetVersion:ASSET_VERSION,showToast,configureEditors,
  getText(kind='output'){if(kind==='original')return $('#input').value||'';if(!$('#output').value&&$('#input').value.trim())analyze(true);return $('#output').value||state.working||'';},
  commitProgressiveResult(text,label='원본 자동 작성'){
    const next=String(text??''),out=$('#output');if(out.value!==next)return false;
    out.readOnly=true;$('#editResult').textContent='✎ 직접 수정';refreshSuggestionBaseline(next,{unread:false});renderAll({preserveOutput:true});recordHistory(label);notifyTextChanged('output');revealAppliedResult('✓ 원본을 한 글자씩 작성했고 100% 일치를 확인했습니다.');return true;
  },
  applyRewrite(text,label='새 글 재작성'){
    const next=String(text||'');if(!next.trim())return false;
    $('#output').readOnly=true;$('#output').value=next;$('#editResult').textContent='✎ 직접 수정';
    refreshSuggestionBaseline(next,{unread:false});renderAll();recordHistory(label);revealAppliedResult('✓ 새 글을 결과에 적용했습니다.');return true;
  },
  openPanel,closeAllPanels,revealAppliedResult
};
$('#rewriteWidget').onclick=async()=>{try{showToast('재작성 스튜디오를 여는 중…');const studio=await ensureRewriteStudio();openPanel('rewritePanel');studio.open();}catch(err){console.error(err);showToast('재작성 도구를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');}};
$('#issuesWidget').onclick=()=>openPanel('issuesPanel');$('#reviewWidget').onclick=()=>openPanel('reviewPanel');$('#techWidget').onclick=()=>openPanel('techPanel');
$$('[data-close-panel]').forEach(b=>b.onclick=()=>{$('#'+b.dataset.closePanel).hidden=true;});
makeDraggable($('#issuesPanel'));makeDraggable($('#reviewPanel'));makeDraggable($('#rewritePanel'));makeDraggable($('#techPanel'));

const dz=$('#dropzone'),fi=$('#imageInput');
const runImage=async(f)=>{try{$('#imageLoadStatus').textContent='이미지 검사 엔진 준비 중…';const loadImage=await ensureImageAnalyzer();loadImage(f);}catch(err){console.error(err);$('#imageLoadStatus').textContent='이미지 검사 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';}};
$('#openImage').onclick=()=>fi.click();dz.onclick=e=>{if(!e.target.closest('#openImage'))fi.click();};fi.onchange=()=>{const f=fi.files&&fi.files[0];if(f)runImage(f);fi.value='';};
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
dz.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)runImage(f);});

applyVersionUi();configureEditors();renderStats();renderXray();syncWidgets();restoreUpdateDraft();
setTimeout(checkForAppUpdate,5000);window.addEventListener('online',checkForAppUpdate);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkForAppUpdate();});setInterval(checkForAppUpdate,120000);
})();
