(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};

ns.createAiWritingOsController=function createAiWritingOsController({
  assetBase='ai-writing-os',
  storage=null,
  showToast=()=>{},
  openWindow=(url)=>window.open(url,'_blank','noopener,noreferrer'),
  workLock=null
}={}){
  const $=id=>document.getElementById(id);
  const FALLBACK_PROVIDERS=[
    {id:'chatgpt',label:'ChatGPT',preferred:['context_pack','zip'],notes:'이 정적 사이트에서는 Task Pack/ZIP 전달을 사용합니다.',launchUrl:'https://chatgpt.com/'},
    {id:'claude',label:'Claude',preferred:['context_pack','zip'],notes:'이 정적 사이트에서는 Task Pack/ZIP 전달을 사용합니다.',launchUrl:'https://claude.ai/'},
    {id:'gemini',label:'Gemini',preferred:['context_pack','zip'],notes:'이 정적 사이트에서는 Task Pack/ZIP 전달을 사용합니다.',launchUrl:'https://gemini.google.com/'},
    {id:'grok',label:'Grok',preferred:['context_pack','zip'],notes:'이 정적 사이트에서는 Task Pack/ZIP 전달을 사용합니다.',launchUrl:'https://grok.com/'},
    {id:'meta-ai',label:'Meta AI',preferred:['context_pack','zip'],notes:'Context Pack/ZIP을 기본 전달 방식으로 사용합니다.',launchUrl:'https://www.meta.ai/'},
    {id:'other',label:'기타 AI',preferred:['context_pack','zip'],notes:'Provider-neutral Task Pack을 복사하거나 다운로드해 전달합니다.',launchUrl:''}
  ];
  const FALLBACK_MANIFEST={name:'AI COMPANY OS',version:'6.1',defaultLanguage:'ko',portableZip:'AI_COMPANY_OS_V6_1_PUBLIC.zip',publicProfileMode:true};
  const PROFILE_KEY='ai-writing-os-profile-v1';
  const MAX_TASK_CHARS=200000;
  const FAST_FILES=['00_OPEN_FIRST.md','01_OWNER_PROFILE.md','02_DEFAULTS_AND_BOUNDARIES.md','03_TASK_ROUTER.md'];
  const CHANNEL_FILE={BLOG:'04_BLOG_CORE.md',INSTAGRAM:'05_INSTAGRAM_CORE.md',PRODUCT:'06_PRODUCT_ENTERPRISE_CORE.md',YOUTUBE:'03_TASK_ROUTER.md',GENERAL:'02_DEFAULTS_AND_BOUNDARIES.md'};
  let providers=FALLBACK_PROVIDERS,manifest=FALLBACK_MANIFEST,provider='chatgpt',initialized=false,currentMarkdown='',active=true,seq=0,prepareAbort=null,busy=false;
  const textCache=new Map();

  function includesAny(text,words){return words.some(word=>text.includes(word));}
  function detectOutputLanguage(raw,text){
    if(includesAny(text,['영어로','영문으로','english output','write in english','in english']))return'en';
    if(includesAny(text,['일본어로','일문으로','日本語で','in japanese']))return'ja';
    if(includesAny(text,['중국어로','중문으로','中文','in chinese']))return'zh';
    return'ko';
  }
  function routeTask(task,requestedMode='auto'){
    const raw=String(task??'').trim(),text=raw.toLowerCase();let channel='GENERAL';
    if(includesAny(text,['블로그','네이버','blog','포스팅']))channel='BLOG';
    else if(includesAny(text,['인스타','instagram','릴스','reels','피드']))channel='INSTAGRAM';
    else if(includesAny(text,['유튜브','youtube','쇼츠','shorts']))channel='YOUTUBE';
    else if(includesAny(text,['제품','상품','출시','판매','사업','기획','생산','product','launch','go-to-market','gtm']))channel='PRODUCT';
    const explicitQuick=includesAny(text,['빠르게','간단히','초안만','quick','draft only']);
    const explicit100=/(100\s*명|백\s*명|100\+|120\s*명|grand challenge)/i.test(raw)||(includesAny(text,['기획','생산'])&&includesAny(text,['출시','판매'])&&channel==='PRODUCT');
    const explicitEnterprise=includesAny(text,['대기업','전사','enterprise','전사적']);
    let workforceMode,contributions;
    if(requestedMode&&requestedMode!=='auto'){workforceMode=String(requestedMode).toUpperCase();contributions=null;}
    else if(explicit100){workforceMode='GRAND_CHALLENGE';contributions='100-140+';}
    else if(explicitEnterprise){workforceMode='ENTERPRISE';contributions='30-80+';}
    else if(explicitQuick){workforceMode='QUICK';contributions=channel==='BLOG'||channel==='INSTAGRAM'?'3-5 role-contributions':'1-3 role-contributions';}
    else if(channel==='BLOG'||channel==='INSTAGRAM'){workforceMode='CREATOR_10';contributions='10+';}
    else if(channel==='YOUTUBE'){workforceMode='CREATOR_8';contributions='8+';}
    else if(channel==='PRODUCT'){workforceMode='TASKFORCE';contributions='15-30+';}
    else{workforceMode='STANDARD_PLUS';contributions='3-7+';}
    const deliverables=channel==='INSTAGRAM'?['reels_subtitles','feed_post','shopping_review_style']:channel==='BLOG'?['naver_blog_post']:channel==='PRODUCT'?['executive_synthesis']:[];
    return{task:raw,channel,workforceMode,contributions,outputLanguage:detectOutputLanguage(raw,text),deliverables,controlPlaneIsNotContent:true,rules:[
      'OS/운영규칙은 작업 방법이며 글의 소재가 아니다.','사용자가 다른 출력 언어를 명시하지 않으면 최종 결과는 한국어다.','영문 제품명/영문 자료/영문 주제는 그 자체로 영어 출력 요청이 아니다.','사용자가 제공하지 않은 구매·사용·가족반응·효과 경험을 꾸며내지 않는다.','내부 직원명·회의·엔진·평가 과정은 사용자가 요구하지 않으면 최종 결과에 노출하지 않는다.'
    ]};
  }
  function parsePreferences(text){
    const out={};for(const line of String(text||'').split('\n')){const i=line.indexOf(':');if(i>0){const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();if(k&&v)out[k]=v;}}
    return out;
  }
  function getProfile(){return{displayName:$('osDisplayName')?.value.trim()||'',preferences:parsePreferences($('osPreferences')?.value||'')};}
  function loadStoredProfile(){
    if(!storage)return;try{const raw=storage.getItem(PROFILE_KEY);if(!raw)return;const value=JSON.parse(raw);if($('osDisplayName'))$('osDisplayName').value=String(value.displayName||'');if($('osPreferences'))$('osPreferences').value=String(value.preferencesText||'');}catch(_){}
  }
  function saveProfile(){
    const value={displayName:$('osDisplayName')?.value.trim()||'',preferencesText:$('osPreferences')?.value||'',savedAt:Date.now()};
    if(storage){try{storage.setItem(PROFILE_KEY,JSON.stringify(value));showToast('AI 글쓰기 OS 기본 설정을 이 브라우저에 저장했습니다.');return true;}catch(_){}}
    showToast('브라우저 저장소를 사용할 수 없어 설정을 저장하지 못했습니다.');return false;
  }
  async function loadJson(path,fallback){try{const r=await fetch(`${assetBase}/${path}`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch(_){return fallback;}}
  async function loadText(path,signal){if(textCache.has(path))return textCache.get(path);const r=await fetch(`${assetBase}/${path}`,{cache:'no-store',signal});if(!r.ok)throw new Error(`OS 파일을 읽지 못했습니다: ${path}`);const text=await r.text();textCache.set(path,text);return text;}
  async function ensureAssets(){
    const [reg,man]=await Promise.all([loadJson('providers.json',{providers:FALLBACK_PROVIDERS}),loadJson('os-manifest.json',FALLBACK_MANIFEST)]);providers=Array.isArray(reg?.providers)?reg.providers:FALLBACK_PROVIDERS;manifest=man&&typeof man==='object'?{...FALLBACK_MANIFEST,...man}:FALLBACK_MANIFEST;
  }
  function selectedProvider(){return providers.find(p=>p.id===provider)||providers.find(p=>p.id==='other')||FALLBACK_PROVIDERS.at(-1);}
  function deliveryLabel(mode){return mode==='mcp'?'Remote MCP':mode==='context_pack'?'Task Pack':mode==='zip'?'OS ZIP':mode;}
  function renderProviders(){
    const box=$('osProviders');if(!box)return;box.textContent='';for(const p of providers.filter(p=>['chatgpt','claude','gemini','grok','meta-ai'].includes(p.id))){const b=document.createElement('button');b.type='button';b.className='osProvider'+(p.id===provider?' active':'');b.textContent=p.label;b.dataset.provider=p.id;b.setAttribute('aria-pressed',String(p.id===provider));b.onclick=()=>{provider=p.id;invalidatePreparedOutput();renderProviders();updateProviderHint();};box.appendChild(b);}updateProviderHint();
  }
  function updateProviderHint(){const p=selectedProvider(),hint=$('osProviderHint');if(hint)hint.textContent=`${p.label||'선택한 AI'}에 붙여넣을 요청문을 준비합니다.`;}
  function routeSummary(pack){
    const d=pack.route.deliverables||[],names={BLOG:'블로그',INSTAGRAM:'인스타그램',YOUTUBE:'유튜브/쇼츠',PRODUCT:'제품/사업',GENERAL:'일반'};
    return [`AI: ${pack.providerLabel||pack.provider}`,`분류: ${names[pack.route.channel]||pack.route.channel}`,`작업 강도: ${pack.route.workforceMode}${pack.route.contributions?` · ${pack.route.contributions}`:''}`,`출력 언어: ${pack.route.outputLanguage==='ko'?'한국어':pack.route.outputLanguage}`,d.length?`결과 형식: ${d.join(', ')}`:'','',`OS V${manifest.version}은 작업 방법(Control Plane)이며 콘텐츠 소재가 아닙니다.`].filter(Boolean).join('\n');
  }
  async function buildContext(channel,signal){
    const files=[...FAST_FILES],channelFile=CHANNEL_FILE[channel]||CHANNEL_FILE.GENERAL;if(!files.includes(channelFile))files.push(channelFile);files.push('07_STATE_AND_UPDATE.md');
    const chunks=[];for(const file of [...new Set(files)])chunks.push(`\n===== ${file} =====\n${await loadText(`os/current/${file}`,signal)}`);return chunks.join('\n');
  }
  async function buildTaskPack(signal){
    const task=$('osTask')?.value.trim()||'';if(!task)throw new Error('원하는 글을 먼저 적어주세요.');if(task.length>MAX_TASK_CHARS)throw new Error('20만 자가 넘는 요청은 브라우저가 느려질 수 있어 준비하지 않았습니다. 요청을 나눠서 사용해 주세요.');const route=routeTask(task,$('osMode')?.value||'auto'),p=selectedProvider(),profile=getProfile(),coreContext=await buildContext(route.channel,signal);
    return{schemaVersion:1,createdAt:new Date().toISOString(),os:{name:manifest.name,version:manifest.version,mode:'STATIC_CONTEXT_PACK + PORTABLE_ZIP',defaultLanguage:manifest.defaultLanguage||'ko',portableZip:manifest.portableZip},task,provider:p.id,providerLabel:p.label,route,boundaries:{controlPlaneIsNotContent:true,userContentIsContentPlane:true,neverInventExperience:true,doNotExposeInternalDeliberationByDefault:true,defaultUserFacingLanguage:route.outputLanguage},userProfile:(profile.displayName||Object.keys(profile.preferences).length)?profile:undefined,coreContext,delivery:{preferredModes:(p.preferred||['context_pack','zip']).filter(x=>x!=='mcp'),apiKeyRequiredByDefault:false,note:p.notes||''}};
  }
  function taskPackToMarkdown(pack){
    const profile=pack.userProfile;return['# AI COMPANY TASK PACK','',`- OS: ${pack.os.name} V${pack.os.version}`,`- Provider: ${pack.providerLabel||pack.provider}`,`- Channel: ${pack.route.channel}`,`- Workforce: ${pack.route.workforceMode}${pack.route.contributions?` (${pack.route.contributions})`:''}`,`- Output language: ${pack.route.outputLanguage}`,'','## 사용자 요청',pack.task,'',profile?'## 사용자 기본 설정':'',profile?.displayName?`- 표시 이름: ${profile.displayName}`:'',profile&&Object.keys(profile.preferences||{}).length?Object.entries(profile.preferences).map(([k,v])=>`- ${k}: ${v}`).join('\n'):'','', '## 절대 경계','- AI Company OS는 작업 방법(Control Plane)이며 글/콘텐츠의 소재가 아니다.','- 사용자 주제, 사진, PDF, 키워드, 명시한 경험만 Content Plane으로 사용한다.','- 사용자가 외국어 출력을 명시하지 않았다면 사용자-facing 결과는 한국어다.','- 사용자가 제공하지 않은 구매/사용/가족반응/효과 경험을 만들어내지 않는다.','- 내부 직원명/회의/심사과정은 요청하지 않으면 최종 결과에 노출하지 않는다.','','## OS 핵심 컨텍스트',pack.coreContext,'','## 실행','위 규칙을 적용해 사용자 요청을 완료하라. OS 자체를 콘텐츠에 섞지 마라.'].filter((v,i,a)=>!(v===''&&a[i-1]==='')).join('\n');
  }
  function invalidatePreparedOutput(){
    if(busy){seq++;prepareAbort?.abort();prepareAbort=null;busy=false;}
    currentMarkdown='';const wrap=$('osTaskPackResult');if(wrap)wrap.hidden=true;const preview=$('osTaskPackPreview');if(preview)preview.value='';syncSimpleState();
  }
  function syncSimpleState(){
    const hasTask=!!$('osTask')?.value.trim(),prepare=$('osPrepare'),status=$('osPrepareStatus');
    if(prepare)prepare.disabled=busy||!hasTask;
    for(const id of ['osCopyPack','osDownloadPack','osOpenAi']){const b=$(id);if(b)b.disabled=busy||!currentMarkdown;}
    if(status)status.textContent=busy?'요청문을 준비하고 있습니다…':hasTask?'준비되면 ‘글쓰기 준비’를 누르세요.':'원하는 글을 먼저 적어주세요.';
    $('writingTool')?.setAttribute('aria-busy',busy?'true':'false');
  }
  function setBusy(next){busy=!!next;syncSimpleState();}
  function preferredScrollBehavior(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';}catch(_){return'auto';}}
  async function prepare(){
    const token=++seq;prepareAbort?.abort();currentMarkdown='';const staleWrap=$('osTaskPackResult');if(staleWrap)staleWrap.hidden=true;const stalePreview=$('osTaskPackPreview');if(stalePreview)stalePreview.value='';const controller=new AbortController();prepareAbort=controller;const lockName=`ai-writing-os-${token}`;workLock?.acquire?.(lockName,{kind:'prepare'});setBusy(true);
    try{
      const pack=await buildTaskPack(controller.signal);if(token!==seq||!active||controller.signal.aborted)return null;
      currentMarkdown=taskPackToMarkdown(pack);$('osRouteSummary').textContent=routeSummary(pack);const preview=$('osTaskPackPreview'),wrap=$('osTaskPackResult');if(preview)preview.value=currentMarkdown;if(wrap){wrap.hidden=false;requestAnimationFrame(()=>wrap.scrollIntoView({behavior:preferredScrollBehavior(),block:'nearest'}));}
      const ready=$('osReadyMessage');if(ready)ready.textContent=`${pack.providerLabel||'선택한 AI'}에 붙여넣을 요청문이 준비됐습니다.`;
      showToast('글쓰기 준비 완료 · 요청문을 복사해 AI에 붙여넣으세요.');return pack;
    }catch(error){if(controller.signal.aborted||token!==seq||!active)return null;throw error;}
    finally{workLock?.release?.(lockName);if(prepareAbort===controller)prepareAbort=null;if(token===seq)setBusy(false);}
  }
  async function ensureMarkdown(){if(currentMarkdown&&$('osTaskPackPreview')?.value===currentMarkdown)return currentMarkdown;const pack=await prepare();return pack?currentMarkdown:'';}
  async function copyMarkdown(){const md=await ensureMarkdown();if(!md)return;try{await navigator.clipboard.writeText(md);showToast('요청문을 복사했습니다. 이제 선택한 AI를 열어 붙여넣으세요.');}catch(_){showToast('클립보드 권한이 없어 복사하지 못했습니다. ‘만든 요청문 보기’에서 직접 선택해 주세요.');}}
  function downloadText(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}}
  async function downloadMarkdown(){const md=await ensureMarkdown();if(md)downloadText('AI_COMPANY_TASK_PACK.md',md,'text/markdown;charset=utf-8');}
  async function openSelectedAi(){
    const p=selectedProvider();if(!p?.launchUrl)return showToast('이 AI의 실행 주소가 등록되어 있지 않습니다.');if(!currentMarkdown)return showToast('먼저 글쓰기 준비를 눌러주세요.');
    const opened=openWindow(p.launchUrl);try{await navigator.clipboard.writeText(currentMarkdown);}catch(_){}if(opened===null)return showToast('새 탭이 차단됐습니다. 브라우저 팝업 허용 후 다시 눌러주세요.');showToast(`${p.label||'선택한 AI'}를 열었습니다. 복사한 요청문을 붙여넣으세요.`);
  }
  function downloadOsZip(){const href=`${assetBase}/os/releases/${encodeURIComponent(manifest.portableZip||FALLBACK_MANIFEST.portableZip)}`,a=document.createElement('a');a.href=href;a.download=manifest.portableZip||FALLBACK_MANIFEST.portableZip;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();}}
  function clearTask(){seq++;prepareAbort?.abort();prepareAbort=null;currentMarkdown='';if($('osTask'))$('osTask').value='';if($('osRouteSummary'))$('osRouteSummary').textContent='글쓰기 준비를 누르면 요청에 맞는 작업 방식을 자동으로 고릅니다.';if($('osTaskPackPreview'))$('osTaskPackPreview').value='';if($('osTaskPackResult'))$('osTaskPackResult').hidden=true;setBusy(false);$('osTask')?.focus();}
  function bind(){
    $('osPrepare')?.addEventListener('click',()=>prepare().catch(e=>showToast(e.message)));
    $('osCopyPack')?.addEventListener('click',()=>copyMarkdown().catch(e=>showToast(e.message)));
    $('osDownloadPack')?.addEventListener('click',()=>downloadMarkdown().catch(e=>showToast(e.message)));
    $('osOpenAi')?.addEventListener('click',()=>openSelectedAi().catch(e=>showToast(e.message)));
    $('osDownloadZip')?.addEventListener('click',downloadOsZip);$('osSavePrefs')?.addEventListener('click',()=>{invalidatePreparedOutput();saveProfile();});$('osClearTask')?.addEventListener('click',clearTask);
    $('osTask')?.addEventListener('input',invalidatePreparedOutput);$('osTask')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!$('osPrepare')?.disabled){e.preventDefault();void prepare().catch(err=>showToast(err.message));}});
    $('osMode')?.addEventListener('change',invalidatePreparedOutput);$('osDisplayName')?.addEventListener('input',invalidatePreparedOutput);$('osPreferences')?.addEventListener('input',invalidatePreparedOutput);
  }
  async function init(){
    if(initialized)return;initialized=true;bind();loadStoredProfile();await ensureAssets();if($('osStatus'))$('osStatus').textContent=`LOCAL · OS V${manifest.version}`;renderProviders();if($('osStaticMode'))$('osStaticMode').textContent='GitHub Pages 정적 모드 · 로컬 요청문 생성';syncSimpleState();
  }
  function captureState(){return{provider,task:$('osTask')?.value||'',mode:$('osMode')?.value||'auto'};}
  function restoreState(value){if(!value||typeof value!=='object')return false;const requestedProvider=String(value.provider||'');if(requestedProvider)provider=requestedProvider;if($('osTask'))$('osTask').value=String(value.task||'');if($('osMode'))$('osMode').value=['auto','quick','creator_10','enterprise','grand_challenge'].includes(String(value.mode))?String(value.mode):'auto';invalidatePreparedOutput();if(initialized){renderProviders();updateProviderHint();syncSimpleState();}return true;}
  async function activate(){active=true;await init();syncSimpleState();}
  function deactivate(){active=false;seq++;prepareAbort?.abort();prepareAbort=null;setBusy(false);}
  return{init,activate,deactivate,captureState,restoreState,routeTask,buildTaskPack,taskPackToMarkdown,get provider(){return provider;},get manifest(){return manifest;}};
};
})();
