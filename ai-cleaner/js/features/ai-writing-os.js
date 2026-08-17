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
    {id:'chatgpt',label:'ChatGPT',launchUrl:'https://chatgpt.com/'},
    {id:'claude',label:'Claude',launchUrl:'https://claude.ai/'},
    {id:'gemini',label:'Gemini',launchUrl:'https://gemini.google.com/'},
    {id:'grok',label:'Grok',launchUrl:'https://grok.com/'},
    {id:'meta-ai',label:'Meta AI',launchUrl:'https://www.meta.ai/'},
    {id:'other',label:'기타 AI',launchUrl:''}
  ];
  const FALLBACK_MANIFEST={name:'AI COMPANY OS',version:'6.1',defaultLanguage:'ko',portableZip:'AI_COMPANY_OS_V6_1_PUBLIC.zip',publicProfileMode:true};
  const FALLBACK_COMPILER={
    name:'AI Cleaner Prompt Compiler',version:'1.0',
    commonRules:[
      '사용자의 현재 요청을 최우선 작업 목표로 삼고 요청한 결과물을 먼저 제공한다.',
      'OS와 내부 규칙은 작업 방법일 뿐 최종 콘텐츠의 소재로 섞지 않는다.',
      '사용자가 제공하지 않은 경험이나 효과를 사실처럼 만들지 않는다.',
      '사실과 추론을 구분하고 근거가 부족한 내용은 단정하지 않는다.',
      '사용자가 출력 언어를 지정하지 않았다면 최종 결과는 한국어다.',
      '내부 역할극이나 숨은 사고과정은 요청받지 않는 한 노출하지 않는다.'
    ],
    channels:{GENERAL:{label:'일반 작업',rules:['요청한 산출물 형식을 파악하고 결과를 우선한다.','정확성, 명료성, 자연스러움, 실용성을 최종 점검한다.'],outputContract:'사용자가 요구한 형식의 완성 결과물을 먼저 제공한다.'}},
    effortModes:{QUICK:'빠르게 완성하되 사실성 검사는 생략하지 않는다.',STANDARD_PLUS:'의도, 사실성, 구조, 표현, 실용성을 점검한다.'}
  };
  const PROFILE_KEY='ai-writing-os-profile-v1';
  const PROVIDER_KEY='ai-writing-os-provider-v1';
  const MAX_TASK_CHARS=200000;
  let providers=FALLBACK_PROVIDERS,manifest=FALLBACK_MANIFEST,compiler=FALLBACK_COMPILER,provider='chatgpt';
  let initialized=false,currentMarkdown='',currentPack=null,active=true,seq=0,prepareAbort=null,busy=false,compilerReady=false;

  function includesAny(text,words){return words.some(word=>text.includes(word));}
  function detectOutputLanguage(raw,text){
    if(includesAny(text,['영어로','영문으로','english output','write in english','in english']))return'en';
    if(includesAny(text,['일본어로','일문으로','日本語で','in japanese']))return'ja';
    if(includesAny(text,['중국어로','중문으로','中文','in chinese']))return'zh';
    return'ko';
  }
  function detectIntent(text){
    if(includesAny(text,['요약','정리해','summarize','summary']))return'SUMMARY';
    if(includesAny(text,['고쳐줘','다듬어','재작성','rewrite','교정']))return'REWRITE';
    if(includesAny(text,['보고서','리포트','report']))return'REPORT';
    if(includesAny(text,['기획서','계획','로드맵','plan','strategy']))return'PLAN';
    if(includesAny(text,['비교','분석','analyze','analysis']))return'ANALYSIS';
    if(includesAny(text,['번역','translate']))return'TRANSLATION';
    if(includesAny(text,['코드','함수','버그','개발','code','debug']))return'CODE';
    if(includesAny(text,['이메일','메일','email']))return'EMAIL';
    return'CREATE';
  }
  function instagramDeliverables(text){
    if(includesAny(text,['릴스만','릴스 자막만','reels only']))return['reels_subtitles'];
    if(includesAny(text,['피드만','feed only']))return['feed_post'];
    if(includesAny(text,['캡션만','caption only']))return['caption'];
    return['reels_subtitles','feed_post','shopping_review_style'];
  }
  function routeTask(task,requestedMode='auto'){
    const raw=String(task??'').trim(),text=raw.toLowerCase();let channel='GENERAL';
    if(includesAny(text,['블로그','네이버','blog','포스팅']))channel='BLOG';
    else if(includesAny(text,['인스타','instagram','릴스','reels','피드','해시태그']))channel='INSTAGRAM';
    else if(includesAny(text,['유튜브','youtube','쇼츠','shorts']))channel='YOUTUBE';
    else if(includesAny(text,['제품','상품','출시','판매','사업','기획','생산','product','launch','go-to-market','gtm']))channel='PRODUCT';
    const explicitQuick=includesAny(text,['빠르게','간단히','초안만','quick','draft only']);
    const explicit100=/(100\s*명|백\s*명|100\+|120\s*명|grand challenge)/i.test(raw)||(includesAny(text,['기획','생산'])&&includesAny(text,['출시','판매'])&&channel==='PRODUCT');
    const explicitEnterprise=includesAny(text,['대기업','전사','enterprise','전사적']);
    let workforceMode,contributions;
    if(requestedMode&&requestedMode!=='auto'){
      workforceMode=String(requestedMode).toUpperCase();
      contributions=workforceMode==='CREATOR_10'?'10 perspectives':workforceMode==='ENTERPRISE'?'multi-department review':workforceMode==='GRAND_CHALLENGE'?'full-lifecycle deep review':null;
    }else if(explicit100){workforceMode='GRAND_CHALLENGE';contributions='full-lifecycle deep review';}
    else if(explicitEnterprise){workforceMode='ENTERPRISE';contributions='multi-department review';}
    else if(explicitQuick){workforceMode='QUICK';contributions='fast pass + truth check';}
    else if(channel==='BLOG'||channel==='INSTAGRAM'){workforceMode='CREATOR_10';contributions='10 perspectives';}
    else if(channel==='YOUTUBE'){workforceMode='CREATOR_8';contributions='8 perspectives';}
    else if(channel==='PRODUCT'){workforceMode='TASKFORCE';contributions='multi-angle taskforce review';}
    else{workforceMode='STANDARD_PLUS';contributions='quality review';}
    const deliverables=channel==='INSTAGRAM'?instagramDeliverables(text):channel==='BLOG'?['naver_blog_post']:channel==='YOUTUBE'?[includesAny(text,['쇼츠','shorts'])?'shorts_script':'video_script']:channel==='PRODUCT'?['executive_synthesis']:[];
    return{task:raw,channel,intent:detectIntent(text),workforceMode,contributions,outputLanguage:detectOutputLanguage(raw,text),deliverables,controlPlaneIsNotContent:true};
  }
  function parsePreferences(text){
    const out={};for(const line of String(text||'').split('\n')){const i=line.indexOf(':');if(i>0){const k=line.slice(0,i).trim(),v=line.slice(i+1).trim();if(k&&v)out[k]=v;}}
    return out;
  }
  function getProfile(){return{displayName:$('osDisplayName')?.value.trim()||'',preferences:parsePreferences($('osPreferences')?.value||'')};}
  function loadStoredProfile(){
    if(!storage)return;
    try{const raw=storage.getItem(PROFILE_KEY);if(raw){const value=JSON.parse(raw);if($('osDisplayName'))$('osDisplayName').value=String(value.displayName||'');if($('osPreferences'))$('osPreferences').value=String(value.preferencesText||'');}}catch(_){}
    try{const saved=storage.getItem(PROVIDER_KEY);if(saved&&providers.some(p=>p.id===saved))provider=saved;}catch(_){}
  }
  function rememberProvider(){if(!storage)return;try{storage.setItem(PROVIDER_KEY,provider);}catch(_){}}
  function saveProfile(){
    const value={displayName:$('osDisplayName')?.value.trim()||'',preferencesText:$('osPreferences')?.value||'',savedAt:Date.now()};
    if(storage){try{storage.setItem(PROFILE_KEY,JSON.stringify(value));showToast('AI 글쓰기 OS 기본 설정을 이 브라우저에 저장했습니다.');return true;}catch(_){}}
    showToast('브라우저 저장소를 사용할 수 없어 설정을 저장하지 못했습니다.');return false;
  }
  async function loadJson(path,fallback,signal){
    try{const r=await fetch(`${assetBase}/${path}`,{cache:'no-store',signal});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch(error){if(signal?.aborted)throw error;return fallback;}
  }
  async function ensureAssets(signal){
    const [reg,man,comp]=await Promise.all([
      loadJson('providers.json',{providers:FALLBACK_PROVIDERS},signal),
      loadJson('os-manifest.json',FALLBACK_MANIFEST,signal),
      loadJson('prompt-compiler.json',FALLBACK_COMPILER,signal)
    ]);
    providers=Array.isArray(reg?.providers)?reg.providers:FALLBACK_PROVIDERS;
    manifest=man&&typeof man==='object'?{...FALLBACK_MANIFEST,...man}:FALLBACK_MANIFEST;
    compiler=comp&&typeof comp==='object'?{...FALLBACK_COMPILER,...comp}:FALLBACK_COMPILER;
    compilerReady=true;
  }
  function selectedProvider(){return providers.find(p=>p.id===provider)||providers.find(p=>p.id==='other')||FALLBACK_PROVIDERS.at(-1);}
  function selectedChannel(route){return compiler.channels?.[route.channel]||compiler.channels?.GENERAL||FALLBACK_COMPILER.channels.GENERAL;}
  function qualityRule(route){return compiler.effortModes?.[route.workforceMode]||compiler.effortModes?.STANDARD_PLUS||FALLBACK_COMPILER.effortModes.STANDARD_PLUS;}
  function renderProviders(){
    const box=$('osProviders');if(!box)return;box.textContent='';
    for(const p of providers.filter(p=>['chatgpt','claude','gemini','grok','meta-ai','other'].includes(p.id))){
      const b=document.createElement('button');b.type='button';b.className='osProvider'+(p.id===provider?' active':'');b.textContent=p.label;b.dataset.provider=p.id;b.setAttribute('aria-pressed',String(p.id===provider));b.setAttribute('aria-label',p.id===provider?`${p.label} · 내 기본 AI로 선택됨`:`${p.label}을 내 기본 AI로 선택`);
      b.onclick=()=>{provider=p.id;rememberProvider();invalidatePreparedOutput();renderProviders();updateProviderHint();};box.appendChild(b);
    }
    updateProviderHint();
  }
  function getNavigator(){return root.navigator||(typeof navigator!=='undefined'?navigator:null);}
  function prefersNativeShare(){
    const n=getNavigator();if(typeof n?.share!=='function')return false;
    let coarse=false;try{coarse=!!root.matchMedia?.('(pointer: coarse)')?.matches;}catch(_){}
    const touchPoints=Number(n.maxTouchPoints||0),width=Number(root.innerWidth||0);
    return coarse||(touchPoints>0&&width>0&&width<=900);
  }
  function deliveryPlan(){
    const p=selectedProvider();
    if(prefersNativeShare())return{mode:'share',title:'모바일 연결 · 시스템 공유창',hint:p.id==='other'?'공유창이 열리면 평소 쓰는 AI 앱을 선택하세요.':'공유창이 열리면 '+p.label+' 앱을 선택하세요. 브라우저가 특정 앱을 강제로 열지는 않습니다.',button:'OS로 강화해서 공유하기',ready:'버튼 한 번으로 강화한 뒤 시스템 공유창을 엽니다.',after:p.id==='other'?'공유창에서 사용할 AI 앱을 선택해 이어가세요.':'공유창에서 '+p.label+'을 선택해 이어가세요.'};
    if(p.launchUrl)return{mode:'copy-open',title:'PC 연결 · '+p.label+' 열기 + 프롬프트 복사',hint:'버튼을 누르면 강화 프롬프트를 복사하고 '+p.label+' 새 탭을 엽니다. 새 탭에서 붙여넣기만 하면 됩니다.',button:'OS로 강화해서 '+p.label+' 열기',ready:'한 번 누르면 OS가 강화하고 '+p.label+'를 엽니다.',after:p.label+' 새 탭에서 붙여넣기(Ctrl/⌘+V)만 하면 됩니다.'};
    return{mode:'copy',title:'범용 연결 · 강화 프롬프트 복사',hint:'특정 AI를 열지 않고 강화 프롬프트만 복사합니다. 평소 쓰는 AI에 붙여넣으세요.',button:'OS로 강화해서 복사하기',ready:'한 번 누르면 OS가 강화 프롬프트를 복사합니다.',after:'평소 쓰는 AI를 열고 붙여넣기만 하면 됩니다.'};
  }
  function updateProviderHint(){
    const p=selectedProvider(),hint=$('osProviderHint'),delivery=$('osDeliveryHint'),title=$('osDeliveryTitle'),sendLabel=$('osSendEnhancedLabel'),openAi=$('osOpenAi'),plan=deliveryPlan();
    if(hint)hint.textContent=p.id==='other'?'기타 AI 선택됨 · 다음에도 이 선택을 기본으로 기억합니다.':`${p.label} 선택됨 · 다음에도 이 AI를 기본으로 기억합니다.`;
    if(title)title.textContent=plan.title;
    if(delivery)delivery.textContent=plan.hint;
    if(sendLabel)sendLabel.textContent=plan.button;
    if(openAi){openAi.hidden=!p.launchUrl;openAi.textContent=p.launchUrl?`${p.label} 다시 열기`:'선택 AI 다시 열기';}
  }
  function routeSummary(pack){
    const names={BLOG:'블로그',INSTAGRAM:'인스타그램',YOUTUBE:'유튜브/쇼츠',PRODUCT:'제품/사업',GENERAL:'일반'};
    const d=pack.route.deliverables||[];
    return[
      `AI: ${pack.providerLabel||pack.provider}`,
      `분류: ${names[pack.route.channel]||pack.route.channel}`,
      `의도: ${pack.route.intent}`,
      `품질 모드: ${pack.route.workforceMode}${pack.route.contributions?` · ${pack.route.contributions}`:''}`,
      `출력 언어: ${pack.route.outputLanguage==='ko'?'한국어':pack.route.outputLanguage}`,
      d.length?`결과 형식: ${d.join(', ')}`:'',
      `컴파일 규칙: 공통 ${pack.compiler.commonRuleCount} + 채널 ${pack.compiler.channelRuleCount} + 품질 1`,
      '',
      `긴 OS 원문 전체를 붙이지 않고 이번 작업에 필요한 실행 규칙만 압축합니다.`
    ].filter(Boolean).join('\n');
  }
  function buildTaskPackSync(){
    const task=$('osTask')?.value.trim()||'';
    if(!task)throw new Error('원하는 작업을 먼저 적어주세요.');
    if(task.length>MAX_TASK_CHARS)throw new Error('20만 자가 넘는 요청은 브라우저가 느려질 수 있어 준비하지 않았습니다. 요청을 나눠서 사용해 주세요.');
    const route=routeTask(task,$('osMode')?.value||'auto'),p=selectedProvider(),profile=getProfile(),channel=selectedChannel(route),commonRules=[...(compiler.commonRules||[])],channelRules=[...(channel.rules||[])],effort=qualityRule(route);
    return{
      schemaVersion:2,createdAt:new Date().toISOString(),
      os:{name:manifest.name,version:manifest.version,compiler:compiler.name||'AI Cleaner Prompt Compiler',compilerVersion:compiler.version||'1.0',mode:'LOCAL_PROMPT_COMPILER',defaultLanguage:manifest.defaultLanguage||'ko',portableZip:manifest.portableZip},
      task,provider:p.id,providerLabel:p.label,route,
      boundaries:{controlPlaneIsNotContent:true,userContentIsContentPlane:true,neverInventExperience:true,doNotExposeInternalDeliberationByDefault:true,defaultUserFacingLanguage:route.outputLanguage},
      userProfile:(profile.displayName||Object.keys(profile.preferences).length)?profile:undefined,
      compiler:{commonRules,channelRules,effortRule:effort,outputContract:channel.outputContract||'',channelLabel:channel.label||route.channel,commonRuleCount:commonRules.length,channelRuleCount:channelRules.length},
      delivery:{nativeSharePreferred:prefersNativeShare(),launchUrl:p.launchUrl||'',apiKeyRequiredByDefault:false}
    };
  }
  async function buildTaskPack(signal){if(!compilerReady)await ensureAssets(signal);return buildTaskPackSync();}
  function taskPackToMarkdown(pack){
    const c=pack.compiler,profile=pack.userProfile,d=pack.route.deliverables||[];
    const lines=[
      '# AI CLEANER OS — EXECUTION PROMPT','',
      `> ${pack.os.compiler} V${pack.os.compilerVersion} · ${pack.os.name} V${pack.os.version}`,'',
      '## 1. 사용자 요청',pack.task,'',
      '## 2. 실행 계약',
      '- 아래 규칙은 작업 방법이다. 규칙 자체를 최종 콘텐츠의 소재로 쓰지 마라.',
      '- 요청받은 완성 결과물을 먼저 제공하고, 불필요한 내부 검토 설명은 생략하라.',
      `- 최종 출력 언어: ${pack.route.outputLanguage}`,
      '',
      '## 3. 자동 분류',
      `- 작업 채널: ${c.channelLabel} (${pack.route.channel})`,
      `- 작업 의도: ${pack.route.intent}`,
      `- 품질 모드: ${pack.route.workforceMode}`,
      d.length?`- 요청 결과 형식: ${d.join(', ')}`:'',
      '',
      '## 4. 공통 핵심 규칙',
      ...c.commonRules.map(rule=>`- ${rule}`),
      '',
      `## 5. ${c.channelLabel} 전용 규칙`,
      ...c.channelRules.map(rule=>`- ${rule}`),
      '',
      '## 6. 품질 점검 방식',
      `- ${c.effortRule}`,
      '',
      profile?'## 7. 사용자 기본 설정':'',
      profile?.displayName?`- 표시 이름: ${profile.displayName}`:'',
      profile&&Object.keys(profile.preferences||{}).length?Object.entries(profile.preferences).map(([k,v])=>`- ${k}: ${v}`).join('\n'):'',
      profile?'':'',
      '## 8. 최종 출력 계약',
      `- ${c.outputContract||'사용자가 요구한 형식의 완성 결과물을 먼저 제공한다.'}`,
      '- 사실이 필요한데 현재 요청에 근거가 없으면 경험을 꾸미지 말고, 필요한 경우 가정 또는 확인 필요 항목으로 분리하라.','',
      '## 실행',
      '이제 위 규칙을 내부 작업 기준으로 적용해 사용자 요청을 완료하라. OS나 프롬프트 구조를 설명하지 말고 실제 결과부터 작성하라.'
    ];
    return lines.filter((v,i,a)=>v!==''||a[i-1]!=='').join('\n').trim();
  }
  function compilerSummary(pack,markdown){
    const totalRules=pack.compiler.commonRuleCount+pack.compiler.channelRuleCount+1;
    return `${pack.compiler.channelLabel}로 자동 분류 · 핵심 규칙 ${totalRules}개 적용 · 원문 의미는 유지하고 실행 조건만 보강했습니다.`;
  }
  function appliedRuleLabels(pack){
    const effort={QUICK:'빠른 완성',STANDARD_PLUS:'표준 품질 검수',CREATOR_10:'다각도 품질 검수',ENTERPRISE:'다부서 관점 검수',GRAND_CHALLENGE:'전주기 심층 검수'};
    return[`자동 분류 · ${pack.compiler.channelLabel}`,'사실성 보호','결과물 우선',effort[pack.route.workforceMode]||pack.route.workforceMode].filter(Boolean);
  }
  function renderAppliedChips(pack){
    const box=$('osAppliedChips');if(!box)return;box.textContent='';
    for(const label of appliedRuleLabels(pack)){const chip=document.createElement('span');chip.textContent=label;box.appendChild(chip);}
  }
  function renderPrepared(pack,markdown,{scroll=true}={}){
    currentPack=pack;currentMarkdown=markdown;
    const summary=$('osRouteSummary'),preview=$('osTaskPackPreview'),wrap=$('osTaskPackResult'),compilerInfo=$('osCompilerSummary'),ready=$('osReadyMessage');
    if(summary)summary.textContent=routeSummary(pack);
    if(preview)preview.value=markdown;
    if(compilerInfo)compilerInfo.textContent=compilerSummary(pack,markdown);
    renderAppliedChips(pack);
    if(ready)ready.textContent='요청을 실행용 프롬프트로 강화했습니다.';
    const after=$('osAfterSend');if(after)after.textContent=deliveryPlan().after;
    if(wrap){wrap.hidden=false;if(scroll)requestAnimationFrame(()=>wrap.scrollIntoView({behavior:preferredScrollBehavior(),block:'nearest'}));}
    updateProviderHint();syncSimpleState();
  }
  function invalidatePreparedOutput(){
    if(busy){seq++;prepareAbort?.abort();prepareAbort=null;busy=false;}
    currentMarkdown='';currentPack=null;const wrap=$('osTaskPackResult');if(wrap)wrap.hidden=true;const preview=$('osTaskPackPreview');if(preview)preview.value='';const compilerInfo=$('osCompilerSummary');if(compilerInfo)compilerInfo.textContent='';const chips=$('osAppliedChips');if(chips)chips.textContent='';syncSimpleState();
  }
  function syncSimpleState(){
    const hasTask=!!$('osTask')?.value.trim(),status=$('osPrepareStatus');
    for(const id of ['osSendEnhanced','osSendRaw']){const b=$(id);if(b)b.disabled=busy||!hasTask;}
    for(const id of ['osCopyPack','osDownloadPack','osOpenAi']){const b=$(id);if(b)b.disabled=busy||!currentMarkdown;}
    if(status)status.textContent=busy?'OS가 요청을 실행용 프롬프트로 정리하고 있습니다…':hasTask?deliveryPlan().ready:'원하는 작업을 먼저 적어주세요.';
    $('writingTool')?.setAttribute('aria-busy',busy?'true':'false');
  }
  function setBusy(next){busy=!!next;syncSimpleState();}
  function preferredScrollBehavior(){try{return root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth';}catch(_){return'auto';}}
  async function prepare({scroll=true}={}){
    const token=++seq;prepareAbort?.abort();currentMarkdown='';currentPack=null;const controller=new AbortController();prepareAbort=controller;const lockName=`ai-writing-os-${token}`;workLock?.acquire?.(lockName,{kind:'compile'});setBusy(true);
    try{
      const pack=await buildTaskPack(controller.signal);if(token!==seq||!active||controller.signal.aborted)return null;
      const markdown=taskPackToMarkdown(pack);renderPrepared(pack,markdown,{scroll});showToast('OS 강화 프롬프트를 만들었습니다.');return pack;
    }catch(error){if(controller.signal.aborted||token!==seq||!active)return null;throw error;}
    finally{workLock?.release?.(lockName);if(prepareAbort===controller)prepareAbort=null;if(token===seq)setBusy(false);}
  }
  async function ensureMarkdown(){if(currentMarkdown&&$('osTaskPackPreview')?.value===currentMarkdown)return currentMarkdown;const pack=await prepare();return pack?currentMarkdown:'';}
  async function writeClipboard(text){const n=getNavigator();if(typeof n?.clipboard?.writeText!=='function')return false;try{await n.clipboard.writeText(text);return true;}catch(_){return false;}}
  async function copyMarkdown(){const md=await ensureMarkdown();if(!md)return;const copied=await writeClipboard(md);showToast(copied?'강화 프롬프트를 복사했습니다.':'클립보드 권한이 없어 복사하지 못했습니다. 아래 프롬프트를 직접 선택해 주세요.');}
  async function nativeShare(text,title){
    const n=getNavigator();if(!prefersNativeShare())return false;
    try{await n.share({title,text});return true;}catch(error){if(error?.name==='AbortError')return null;return false;}
  }
  function updateDeliveryResult(result){
    const p=selectedProvider(),ready=$('osReadyMessage'),after=$('osAfterSend'),plan=deliveryPlan();
    if(!ready||!after)return;
    if(result==='share'){ready.textContent='OS 강화 후 시스템 공유를 완료했습니다.';after.textContent=plan.after;return;}
    if(result==='cancel'){ready.textContent='OS 강화는 완료됐고, 공유는 취소되었습니다.';after.textContent='아래에서 프롬프트를 복사하거나 다시 보내면 됩니다.';return;}
    if(result==='copy-open'){ready.textContent=`${p.label}를 열고 강화 프롬프트를 복사했습니다.`;after.textContent=plan.after;return;}
    if(result==='open'){ready.textContent=`${p.label}를 열었습니다.`;after.textContent='클립보드 권한이 없어 자동 복사는 못 했습니다. 아래 복사 버튼을 사용하세요.';return;}
    if(result==='copy'){ready.textContent='강화 프롬프트를 복사했습니다.';after.textContent=plan.after;return;}
    ready.textContent='OS 강화는 완료됐지만 자동 전달은 막혔습니다.';after.textContent='아래 프롬프트 복사 버튼을 사용해 직접 붙여넣으세요.';
  }
  async function deliverText(text,{enhanced=true,allowNativeShare=true}={}){
    const p=selectedProvider();
    if(allowNativeShare&&prefersNativeShare()){
      const shared=await nativeShare(text,enhanced?'AI Cleaner OS 강화 요청':'AI 요청');
      if(shared===true){showToast('시스템 공유창으로 요청을 보냈습니다.');return'share';}
      if(shared===null){showToast('공유를 취소했습니다.');return'cancel';}
    }
    let opened=undefined;
    if(p?.launchUrl)opened=openWindow(p.launchUrl);
    const copied=await writeClipboard(text);
    if(p?.launchUrl&&opened===null){showToast(copied?'요청문은 복사했습니다. 새 탭이 차단되어 AI는 열지 못했습니다.':'새 탭과 클립보드가 모두 차단됐습니다.');return copied?'copy':'blocked';}
    if(p?.launchUrl){showToast(copied?`${p.label}를 열고 요청문을 복사했습니다. 붙여넣기만 하면 됩니다.`:`${p.label}를 열었습니다. 클립보드 권한이 없어 아래 요청문을 직접 복사해 주세요.`);return copied?'copy-open':'open';}
    showToast(copied?'요청문을 복사했습니다. 평소 사용하는 AI에 붙여넣으세요.':'클립보드 권한이 없어 요청문을 직접 선택해 복사해 주세요.');return copied?'copy':'blocked';
  }
  async function sendEnhanced(){
    if(!compilerReady)await ensureAssets();
    const pack=buildTaskPackSync(),markdown=taskPackToMarkdown(pack);renderPrepared(pack,markdown,{scroll:false});
    const result=await deliverText(markdown,{enhanced:true,allowNativeShare:true});
    updateDeliveryResult(result);
    requestAnimationFrame(()=>$('osTaskPackResult')?.scrollIntoView({behavior:preferredScrollBehavior(),block:'nearest'}));
    return result;
  }
  async function sendRaw(){
    const task=$('osTask')?.value.trim()||'';if(!task)throw new Error('원하는 작업을 먼저 적어주세요.');
    return deliverText(task,{enhanced:false,allowNativeShare:true});
  }
  function downloadText(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}}
  async function downloadMarkdown(){const md=await ensureMarkdown();if(md)downloadText('AI_CLEANER_OS_PROMPT.md',md,'text/markdown;charset=utf-8');}
  async function openSelectedAi(){
    const p=selectedProvider();if(!p?.launchUrl)return showToast('이 AI의 실행 주소가 없습니다. 강화 프롬프트를 복사해 원하는 AI에 붙여넣으세요.');
    const md=await ensureMarkdown();if(!md)return;const opened=openWindow(p.launchUrl),copied=await writeClipboard(md);if(opened===null)return showToast(copied?'요청문은 복사했지만 새 탭이 차단됐습니다.':'새 탭이 차단됐습니다.');showToast(copied?`${p.label}를 열고 강화 프롬프트를 복사했습니다.`:`${p.label}를 열었습니다.`);
  }
  function downloadOsZip(){const href=`${assetBase}/os/releases/${encodeURIComponent(manifest.portableZip||FALLBACK_MANIFEST.portableZip)}`,a=document.createElement('a');a.href=href;a.download=manifest.portableZip||FALLBACK_MANIFEST.portableZip;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();}}
  function clearTask(){seq++;prepareAbort?.abort();prepareAbort=null;currentMarkdown='';currentPack=null;if($('osTask'))$('osTask').value='';if($('osRouteSummary'))$('osRouteSummary').textContent='OS가 요청을 분석하면 자동 분류·적용 규칙을 여기에 표시합니다.';if($('osTaskPackPreview'))$('osTaskPackPreview').value='';if($('osTaskPackResult'))$('osTaskPackResult').hidden=true;if($('osCompilerSummary'))$('osCompilerSummary').textContent='';if($('osAppliedChips'))$('osAppliedChips').textContent='';setBusy(false);$('osTask')?.focus();}
  function bind(){
    $('osSendEnhanced')?.addEventListener('click',()=>sendEnhanced().catch(e=>showToast(e.message)));
    $('osSendRaw')?.addEventListener('click',()=>sendRaw().catch(e=>showToast(e.message)));
    $('osCopyPack')?.addEventListener('click',()=>copyMarkdown().catch(e=>showToast(e.message)));
    $('osDownloadPack')?.addEventListener('click',()=>downloadMarkdown().catch(e=>showToast(e.message)));
    $('osOpenAi')?.addEventListener('click',()=>openSelectedAi().catch(e=>showToast(e.message)));
    $('osDownloadZip')?.addEventListener('click',downloadOsZip);
    $('osSavePrefs')?.addEventListener('click',()=>{invalidatePreparedOutput();saveProfile();});
    $('osClearTask')?.addEventListener('click',clearTask);
    $('osTask')?.addEventListener('input',invalidatePreparedOutput);
    $('osTask')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!$('osSendEnhanced')?.disabled){e.preventDefault();void sendEnhanced().catch(err=>showToast(err.message));}});
    $('osMode')?.addEventListener('change',invalidatePreparedOutput);$('osDisplayName')?.addEventListener('input',invalidatePreparedOutput);$('osPreferences')?.addEventListener('input',invalidatePreparedOutput);
  }
  async function init(){
    if(initialized)return;initialized=true;bind();await ensureAssets();loadStoredProfile();if($('osStatus'))$('osStatus').textContent=`내 기기에서 준비됨 · OS V${manifest.version}`;renderProviders();if($('osStaticMode'))$('osStaticMode').textContent='GitHub Pages 정적 모드 · 로컬 Prompt Compiler';syncSimpleState();
  }
  function captureState(){return{provider,task:$('osTask')?.value||'',mode:$('osMode')?.value||'auto'};}
  function restoreState(value){if(!value||typeof value!=='object')return false;const requestedProvider=String(value.provider||'');if(requestedProvider)provider=requestedProvider;if($('osTask'))$('osTask').value=String(value.task||'');if($('osMode'))$('osMode').value=['auto','quick','creator_10','enterprise','grand_challenge'].includes(String(value.mode))?String(value.mode):'auto';invalidatePreparedOutput();if(initialized){renderProviders();updateProviderHint();syncSimpleState();}return true;}
  async function activate(){active=true;await init();updateProviderHint();syncSimpleState();}
  function deactivate(){active=false;seq++;prepareAbort?.abort();prepareAbort=null;setBusy(false);}
  return{init,activate,deactivate,captureState,restoreState,routeTask,buildTaskPack,buildTaskPackSync,taskPackToMarkdown,sendEnhanced,sendRaw,get provider(){return provider;},get manifest(){return manifest;},get compiler(){return compiler;},get currentPack(){return currentPack;}};
};
})();
