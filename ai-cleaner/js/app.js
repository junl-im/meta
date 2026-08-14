(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const sample = 'AI가\u200B 쓴 글에는\u200E 보이지 않는 문자가 섞일 수 있어요.\u00A0\n\n결론적으로 이번 제품은 생각보다 사용감이 좋았습니다.\n정말 정말 좋은 제품이라서 적극 추천드립니다.\n정말 좋은 선택이고 정말 좋은 경험이며 정말 좋은 결과입니다.\n정말 좋은 문장이라 정말 좋은 표현을 반복해서 정말 좋은 예시를 만듭니다.\n\n자주 묻는 질문 (FAQ)';
const specialSpaces = new Set([0xA0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200A,0x202F,0x205F,0x3000]);
const removable = new Set([0x200B,0x200E,0x200F,0x202A,0x202B,0x202C,0x202D,0x202E,0x2066,0x2067,0x2068,0x2069,0xFEFF]);
const sensitive = new Set([0x200C,0x200D,0x2060]);
const lookalike = {'а':'Cyrillic a','е':'Cyrillic e','о':'Cyrillic o','р':'Cyrillic er','с':'Cyrillic es','х':'Cyrillic ha','у':'Cyrillic u','і':'Cyrillic i'};

let state = {
  original:'', base:'', working:'', chars:[], allChars:[], issues:[], applied:new Set(),
  manual:false, homoglyphs:[], reviews:[], score:100, focusCycles:Object.create(null),
  issueUnread:false, techUnread:false, analyzeMs:0
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4,'0');

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
    const re=/[가-힣A-Za-z0-9]{2,}/g, counts=new Map(), positions=new Map();
    let m;
    while((m=re.exec(text))){
      const w=m[0];
      counts.set(w,(counts.get(w)||0)+1);
      if(!positions.has(w))positions.set(w,[]);
      positions.get(w).push(m.index);
    }
    [...counts.entries()].filter(([,n])=>n>=6).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([w,n])=>{
      add('반복 단어',`“${w}”가 ${n}회 반복됩니다. 돋보기로 위치를 순서대로 확인해보세요.`,`${w} × ${n}`,null,'read',-1,-1,{word:w,positions:positions.get(w)});
    });
  }
  return out;
}

function hygiene(text,all,hom){
  const md=(text.match(/\*\*|^#{1,6}\s/gm)||[]).length;
  return Math.max(0,100-Math.min(60,all.length*4)-Math.min(20,hom.length*4)-Math.min(20,md*2));
}

function analyze(silent=false){
  const t0=performance.now();
  const input=$('#input').value;
  if(!input.trim()){if(!silent)alert('먼저 글을 붙여넣어 주세요.');return;}
  const sc=scan(input);
  let base=sc.clean;
  if($('#norm').checked)base=base.normalize('NFKC');
  const hom=homoglyphs(base);
  const foundIssues=issues(base);
  const prevIssueCount=state.issues.length, prevTechCount=state.allChars.length+state.homoglyphs.length;
  state={
    original:input,base,working:base,chars:sc.auto,allChars:sc.all,issues:foundIssues,applied:new Set(),manual:false,
    homoglyphs:hom,reviews:[],score:hygiene(input,sc.all,hom),focusCycles:Object.create(null),
    issueUnread:foundIssues.length>0&&(foundIssues.length!==prevIssueCount||!state.original),
    techUnread:(sc.all.length+hom.length)>0&&((sc.all.length+hom.length)!==prevTechCount||!state.original),
    analyzeMs:0
  };
  $('#output').readOnly=true;
  $('#editResult').textContent='✎ 직접 수정';
  renderAll();
  state.analyzeMs=performance.now()-t0;
  $('#textPerf').textContent=`${state.analyzeMs.toFixed(state.analyzeMs<10?1:0)}ms`;
}

function rebuild(){
  let text=state.base;
  for(const x of state.issues.filter(x=>state.applied.has(x.id)&&x.applicable&&x.start>=0).sort((a,b)=>b.start-a.start)){
    text=text.slice(0,x.start)+x.after+text.slice(x.end);
  }
  if(!state.manual)state.working=text;
  $('#output').value=state.working;
}

function renderAll(){
  rebuild();
  renderDiag();
  renderIssues();
  renderTech();
  renderStats();
  buildReviews();
  renderCompare();
  syncWidgets();
  if(!$('#xrayPane').classList.contains('hidden'))renderXray();
}

function renderDiag(){
  const spaces=state.allChars.filter(x=>x.type==='특수 공백').length;
  $('#diagHidden').textContent=state.allChars.length-spaces;
  $('#diagSpace').textContent=spaces;
  $('#diagLanguage').textContent=state.issues.filter(x=>x.kind==='style').length;
  $('#diagFormat').textContent=state.issues.filter(x=>x.kind==='format').length;
  $('#diagRead').textContent=state.issues.filter(x=>x.kind==='read').length;
  $('#diagAuto').textContent=state.chars.length;
  $('#diagStatus').textContent=`기술 ${state.allChars.length+state.homoglyphs.length} · 교정 제안 ${state.issues.length}`;
}

function renderIssues(){
  const box=$('#issues');
  if(!state.issues.length){box.innerHTML='<div class="empty">교정 제안이 없습니다. 🦊</div>';return;}
  box.innerHTML=state.issues.map(x=>{
    const locateTarget=x.word||((x.start>=0&&x.before)?x.before:null);
    const locate=locateTarget?`<button class="mini locate" data-locate="${x.id}" title="결과에서 위치 찾기">🔍 위치 보기</button><span class="locateStatus" id="loc-${x.id}"></span>`:'';
    const apply=x.applicable?(state.applied.has(x.id)?`<button class="mini undo" data-undo="${x.id}">↶ 되돌리기</button>`:`<button class="mini apply" data-apply="${x.id}">반영</button>`):'<span class="tag blue">확인 항목</span>';
    return `<div class="item"><div class="itemtop"><span class="tag ${x.kind==='format'?'blue':''}">${esc(x.cat)}</span><span class="sub">${esc(x.before||'')}</span></div><p>${esc(x.reason)}</p><div class="itemactions">${apply}${locate}</div></div>`;
  }).join('');
  $$('[data-apply]').forEach(b=>b.onclick=()=>{state.applied.add(b.dataset.apply);state.manual=false;renderAll();flashOutput();});
  $$('[data-undo]').forEach(b=>b.onclick=()=>{state.applied.delete(b.dataset.undo);state.manual=false;renderAll();flashOutput();});
  $$('[data-locate]').forEach(b=>b.onclick=()=>locateIssue(b.dataset.locate));
}

function locateIssue(id){
  const issue=state.issues.find(x=>x.id===id);
  if(!issue)return;
  const text=$('#output').value, needle=issue.word||issue.before;
  if(!needle)return;
  const starts=[];let from=0;
  while(from<=text.length){
    const idx=text.indexOf(needle,from);
    if(idx<0)break;
    starts.push(idx);from=idx+Math.max(1,needle.length);
    if(starts.length>500)break;
  }
  const status=$('#loc-'+id);
  if(!starts.length){if(status)status.textContent='현재 결과에서 찾지 못함';return;}
  const next=(state.focusCycles[id]||0)%starts.length;
  state.focusCycles[id]=next+1;
  const pos=starts[next], out=$('#output');
  out.focus({preventScroll:false});
  out.setSelectionRange(pos,pos+needle.length);
  if(status)status.textContent=`${next+1}/${starts.length}`;
  out.scrollIntoView({behavior:'smooth',block:'center'});
}

function flashOutput(){
  const out=$('#output');
  out.classList.remove('resultFlash');void out.offsetWidth;out.classList.add('resultFlash');
  setTimeout(()=>out.classList.remove('resultFlash'),800);
}

function renderTech(){
  const rows=[];
  for(const x of state.allChars.slice(0,500)){
    rows.push(`<tr><td>${x.pos}</td><td><b>${x.code}</b></td><td>${esc(x.type)}</td><td>${esc(x.action)}</td><td>${x.auto?'자동':'보존'}</td></tr>`);
  }
  for(const x of state.homoglyphs.slice(0,100)){
    rows.push(`<tr><td>${x.pos}</td><td><b>${x.code}</b></td><td>유사문자</td><td>확인</td><td>보존</td></tr>`);
  }
  $('#removalTable').innerHTML=rows.length?rows.join(''):'<tr><td colspan="5" class="empty">기술 정보가 없습니다.</td></tr>';
  const hidden=state.allChars.filter(x=>x.type==='숨은 문자').length;
  const spaces=state.allChars.filter(x=>x.type==='특수 공백').length;
  const kept=state.allChars.filter(x=>!x.auto).length;
  $('#techSummary').innerHTML=[
    `<span class="techChip">숨은 문자 <b>${hidden}</b></span>`,
    `<span class="techChip">특수 공백 <b>${spaces}</b></span>`,
    `<span class="techChip">보존 항목 <b>${kept}</b></span>`,
    `<span class="techChip">유사문자 <b>${state.homoglyphs.length}</b></span>`
  ].join('');
}

function renderXray(){
  const box=$('#xrayView');
  if(!state.original){box.innerHTML='<div class="empty">숨은 문자가 있으면 위치를 눈에 보이게 표시합니다.</div>';return;}
  const byPos=new Map(state.allChars.map(x=>[x.pos,x]));
  let html='',i=0;
  for(const ch of state.original){
    const x=byPos.get(i);
    html+=x?`<span class="${x.auto?(x.type==='특수 공백'?'xrhit xrspace':'xrhit'):'xrhit xrkeep'}" title="${esc(x.name)}">${x.code}</span>`:esc(ch);
    i+=ch.length;
  }
  box.innerHTML=html;
}

function codePointLength(t){let n=0;for(const _ of t)n++;return n;}

function renderStats(){
  const t=state.original||$('#input').value||'';
  const words=(t.match(/[가-힣A-Za-z0-9]{2,}/g)||[]).length;
  const lines=t?t.split(/\r?\n/).length:0;
  $('#textStats').innerHTML=`<span class="statpill">문자 <b>${codePointLength(t)}</b></span><span class="statpill">단어 <b>${words}</b></span><span class="statpill">줄 <b>${lines}</b></span>`;
  $('#cleanScore').textContent=`텍스트 위생 ${state.original?state.score:'--'}`;
}

function buildReviews(){
  state.reviews=sentences(state.base||'').map((x,i)=>{
    let score=0,reasons=[];
    if($('#length').checked){
      if(x.text.length>100){score+=2;reasons.push('100자 초과 긴 문장');}
      else if(x.text.length>72){score++;reasons.push('조금 긴 문장');}
    }
    const inner=issues(x.text);
    if(inner.length){score+=Math.min(2,inner.length);reasons.push(...inner.slice(0,2).map(v=>v.cat));}
    return {id:'s'+i,...x,score,reasons:[...new Set(reasons)],edit:x.text,selected:score>=1.5};
  });
  const box=$('#v62ReviewList');
  box.innerHTML=state.reviews.length?state.reviews.map(r=>`<div class="v62review ${r.score>=1.5?'attn':''}"><div class="itemtop"><label class="check"><input type="checkbox" data-rsel="${r.id}" ${r.selected?'checked':''}> 선택</label><span class="tag blue">편집 체크 ${r.score.toFixed(1)}</span><span class="v62small">${r.text.length}자</span></div><div class="src">${esc(r.text)}</div><textarea data-redit="${r.id}">${esc(r.edit)}</textarea><div class="v62reason">${r.reasons.length?'확인: '+esc(r.reasons.join(' · ')):'특별한 편집 신호 없음'}</div></div>`).join(''):'<div class="empty">검토할 문장이 없습니다.</div>';
  $$('[data-rsel]').forEach(e=>e.onchange=()=>{const r=state.reviews.find(x=>x.id===e.dataset.rsel);if(r)r.selected=e.checked;});
  $$('[data-redit]').forEach(e=>e.oninput=()=>{const r=state.reviews.find(x=>x.id===e.dataset.redit);if(r)r.edit=e.value;});
}

function renderCompare(){
  if(!state.original){$('#v62HygBefore').textContent='—';$('#v62HygAfter').textContent='—';return;}
  const before=state.score,current=$('#output').value||state.working,sc=scan(current);
  const after=hygiene(current,sc.all,homoglyphs(sc.clean));
  $('#v62HygBefore').textContent=before+'/100';
  $('#v62HygAfter').textContent=after+'/100';
  $('#v62HygDelta').textContent=`기술 흔적 ${state.allChars.length} → ${sc.all.length}`;
  $('#v62IssueDelta').textContent=`편집 체크 ${state.issues.length} → ${issues(sc.clean).length}`;
}

function applyReviews(){
  let text=$('#output').value||state.working,done=0;
  for(const r of state.reviews.filter(r=>r.selected&&r.edit!==r.text).sort((a,b)=>b.start-a.start)){
    let idx=-1;
    if(text.slice(r.start,r.end)===r.text)idx=r.start;
    if(idx<0)idx=text.indexOf(r.text,Math.max(0,r.start-80));
    if(idx<0)idx=text.indexOf(r.text);
    if(idx>=0){text=text.slice(0,idx)+r.edit+text.slice(idx+r.text.length);done++;}
  }
  if(!done)return alert('수정한 문장이 없습니다.');
  state.working=text;state.manual=true;$('#output').value=text;
  renderCompare();renderIssues();syncWidgets();flashOutput();
}

function download(name,data,type){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data],{type}));
  a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function liveDelay(len){return len>50000?950:len>20000?650:360;}

function syncWidgets(){
  const textVisible=!$('#textTool').classList.contains('hidden');
  const issueCount=state.issues.length;
  const techCount=state.allChars.length+state.homoglyphs.length;
  const iw=$('#issuesWidget'),tw=$('#techWidget');
  iw.hidden=!textVisible||issueCount===0;
  tw.hidden=!textVisible||techCount===0;
  $('#issueCount').textContent=issueCount;
  $('#techCount').textContent=techCount;
  iw.classList.toggle('attention',state.issueUnread&&issueCount>0);
  tw.classList.toggle('attention',state.techUnread&&techCount>0);
  if(!textVisible){$('#issuesPanel').hidden=true;$('#techPanel').hidden=true;}
}

function openPanel(id){
  const panel=$('#'+id);
  panel.hidden=false;
  if(id==='issuesPanel'){state.issueUnread=false;$('#issuesWidget').classList.remove('attention');}
  if(id==='techPanel'){state.techUnread=false;$('#techWidget').classList.remove('attention');}
  panel.style.zIndex=String(++openPanel.z);
}
openPanel.z=220;

function makeDraggable(panel){
  const handle=panel.querySelector('[data-drag-handle]');
  if(!handle)return;
  let drag=null;
  const key='v64-pos-'+panel.id;
  try{
    const saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved&&innerWidth>760){panel.style.left=saved.left+'px';panel.style.top=saved.top+'px';panel.style.right='auto';panel.style.bottom='auto';}
  }catch(_){}
  handle.addEventListener('pointerdown',(e)=>{
    if(innerWidth<=760||e.target.closest('button'))return;
    const r=panel.getBoundingClientRect();
    drag={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};
    handle.setPointerCapture(e.pointerId);
    panel.style.left=r.left+'px';panel.style.top=r.top+'px';panel.style.right='auto';panel.style.bottom='auto';
    panel.style.zIndex=String(++openPanel.z);
  });
  handle.addEventListener('pointermove',(e)=>{
    if(!drag||drag.id!==e.pointerId)return;
    const maxX=Math.max(8,innerWidth-panel.offsetWidth-8),maxY=Math.max(8,innerHeight-panel.offsetHeight-8);
    panel.style.left=Math.max(8,Math.min(maxX,e.clientX-drag.dx))+'px';
    panel.style.top=Math.max(8,Math.min(maxY,e.clientY-drag.dy))+'px';
  });
  const end=()=>{
    if(!drag)return;
    try{localStorage.setItem(key,JSON.stringify({left:parseFloat(panel.style.left)||8,top:parseFloat(panel.style.top)||8}));}catch(_){}
    drag=null;
  };
  handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
}

let timer;
$('#input').addEventListener('input',()=>{
  renderStats();
  if($('#liveScan').checked){
    clearTimeout(timer);
    timer=setTimeout(()=>analyze(true),liveDelay($('#input').value.length));
  }
});
$('#analyze').onclick=()=>analyze(false);
$('#sample').onclick=()=>{$('#input').value=sample;analyze(true);};
$('#reset').onclick=()=>location.reload();

['norm','repeat','length','liveScan','cleanProfile'].forEach(id=>$('#'+id).addEventListener('change',()=>{if($('#input').value.trim()&&id!=='liveScan')analyze(true);}));

$('#copy').onclick=async()=>{if($('#output').value)await navigator.clipboard.writeText($('#output').value);};
$('#downloadTxt').onclick=()=>$('#output').value&&download('cleaned-v6.4.txt',$('#output').value,'text/plain;charset=utf-8');
$('#downloadJson').onclick=()=>state.original&&download('ai-clean-report-v6.4.json',JSON.stringify({
  version:'6.4',profile:$('#cleanProfile').value,hygieneScore:state.score,analysisMs:state.analyzeMs,
  autoProcessed:state.chars,preserved:state.allChars.filter(x=>!x.auto),homoglyphs:state.homoglyphs,suggestions:state.issues
},null,2),'application/json;charset=utf-8');

$('#undoAll').onclick=()=>{if(!state.original)return;state.applied.clear();state.manual=false;state.working=state.base;renderAll();flashOutput();};
$('#editResult').onclick=()=>{
  if(!state.original)return;
  if($('#output').readOnly){$('#output').readOnly=false;$('#output').focus();$('#editResult').textContent='✓ 수정 완료';}
  else{$('#output').readOnly=true;state.working=$('#output').value;state.manual=true;$('#editResult').textContent='✎ 직접 수정';renderCompare();flashOutput();}
};
$('#output').addEventListener('input',()=>{if(!$('#output').readOnly){state.working=$('#output').value;state.manual=true;renderCompare();}});
$('#v62ApplyReviews').onclick=applyReviews;

$('#textFileInput').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  let s=await f.text();
  if(/\.html?$/i.test(f.name)){const d=new DOMParser().parseFromString(s,'text/html');s=(d.body&&d.body.innerText)||d.documentElement.textContent||'';}
  $('#input').value=s;analyze(true);e.target.value='';
});

$$('[data-resulttab]').forEach(t=>t.onclick=()=>{
  $$('[data-resulttab]').forEach(x=>x.classList.remove('active'));t.classList.add('active');
  ['cleaned','xray','review'].forEach(n=>$('#'+n+'Pane').classList.toggle('hidden',t.dataset.resulttab!==n));
  if(t.dataset.resulttab==='xray')renderXray();
});

$$('[data-tool]').forEach(b=>b.onclick=()=>{
  $$('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));
  $('#textTool').classList.toggle('hidden',b.dataset.tool!=='text');
  $('#imageTool').classList.toggle('hidden',b.dataset.tool!=='image');
  syncWidgets();
});

$('#issuesWidget').onclick=()=>openPanel('issuesPanel');
$('#techWidget').onclick=()=>openPanel('techPanel');
$$('[data-close-panel]').forEach(b=>b.onclick=()=>{$('#'+b.dataset.closePanel).hidden=true;});
makeDraggable($('#issuesPanel'));makeDraggable($('#techPanel'));

const dz=$('#dropzone'),fi=$('#imageInput');
const runImage=(f)=>{
  if(typeof window.loadImage!=='function'){
    $('#imageLoadStatus').textContent='이미지 검사 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';
    return;
  }
  window.loadImage(f);
};
$('#openImage').onclick=()=>fi.click();
dz.onclick=e=>{if(!e.target.closest('#openImage'))fi.click();};
fi.onchange=()=>fi.files&&fi.files[0]&&runImage(fi.files[0]);
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));
['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
dz.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)runImage(f);});

renderStats();renderXray();syncWidgets();
})();
