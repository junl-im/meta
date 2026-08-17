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
  const FALLBACK_MANIFEST={name:'AI COMPANY OS',version:'7',defaultLanguage:'ko',portableZip:'AI_COMPANY_OS_V7_ZERO_DEPENDENCY.zip',publicProfileMode:true};
  const FALLBACK_COMPILER={
    name:'AI Cleaner Blog Factory Compiler',version:'1.1',
    commonRules:[
      '사용자의 현재 요청을 최우선 작업 목표로 삼고 요청한 결과물을 먼저 제공한다.',
      'OS와 내부 규칙은 작업 방법일 뿐 최종 콘텐츠의 소재로 섞지 않는다.',
      '사용자가 제공하지 않은 구매·사용·방문·가족 반응·체감 효과를 실제 경험처럼 만들지 않는다.',
      '사실과 추론을 구분하고 근거가 부족한 내용은 단정하지 않는다.',
      '사용자가 출력 언어를 지정하지 않았다면 최종 결과는 한국어다.',
      '내부 역할극이나 숨은 사고과정은 요청받지 않는 한 노출하지 않는다.',
      '새 주제에서는 이전 작업의 고유 사실과 경험을 자동 재사용하지 않는다.'
    ],
    channels:{
      BLOG:{label:'네이버 블로그',rules:[
        '검색 의도와 독자 효용을 먼저 잡고 제목·도입·본문 흐름을 자연스럽게 연결한다.',
        '자연스러운 한국어 해요체를 기본으로 하며 번역투·과도한 광고투·상투적인 AI 문장을 피한다.',
        '메인 키워드는 문맥에 맞게 보통 4~6회 범위에서 자연스럽게 사용하되 정확한 횟수보다 읽기 흐름을 우선한다.',
        '보통 3~4개 주요 섹션과 모바일에서 읽기 쉬운 2~4줄 중심 문단을 사용한다.',
        '사용자가 제공한 실제 경험만 1인칭 경험으로 사용한다.',
        '최종 단계에서 사실성·검색 의도·자연스러움·모바일 가독성·이미지 맥락을 점검한다.'
      ],outputContract:'완성된 블로그 글을 먼저 제공한다. 요청하지 않은 내부 검토 설명은 생략한다.'},
      GENERAL:{label:'일반 작업',rules:['요청한 산출물 형식을 파악하고 결과를 우선한다.','정확성, 명료성, 자연스러움, 실용성을 최종 점검한다.'],outputContract:'사용자가 요구한 형식의 완성 결과물을 먼저 제공한다.'}
    },
    effortModes:{QUICK:'빠르게 완성하되 사실성 검사는 생략하지 않는다.',STANDARD_PLUS:'의도, 사실성, 구조, 표현, 실용성을 점검한다.',CREATOR_10:'사실, 검색 의도, 독자, 구조, 자연스러움, 정보 효용, SEO, 모바일 가독성, 미디어, 최종 편집 관점으로 내부 점검한다.'},
    blogFactory:{
      modes:{
        daily_one:{label:'오늘 1편',summary:'후보를 고르고 사실을 확인한 뒤 글 1편 + 이미지 패키지까지 만든다.',instruction:'주제 후보를 짧게 비교한 뒤 가장 좋은 1개를 선택해 완성 블로그 패키지 1개를 납품한다.'},
        batch_three:{label:'3편 생산',summary:'서로 겹치지 않는 소재 3개를 골라 완성 패키지 3개를 만든다.',instruction:'중복 의도가 낮은 주제 3개를 선택하고 각각 독립된 완성 블로그 패키지를 만든다.'},
        idea_bank:{label:'소재 20개',summary:'다음 글에 쓸 소재 20개와 우선순위·각도를 비축한다.',instruction:'완성 본문 대신 서로 겹치지 않는 소재 20개를 우선순위와 함께 만든다.'},
        free:{label:'자유 요청',summary:'기존 AI 글쓰기 OS처럼 사용자의 요청을 실행 프롬프트로 강화한다.',instruction:'사용자의 요청 자체를 우선하고 필요한 규칙만 보강한다.'}
      },
      stages:[
        '소재: 관심 범위와 이미 쓴 소재를 바탕으로 검색 의도·시기성·중복 가능성을 점검한다.',
        '조사: 가격·운영시간·정책·제품사양처럼 변할 수 있는 정보는 사용 가능한 웹 기능이 있을 때 확인하고, 확인하지 못하면 확인 필요로 표시한다.',
        '글: BLOG Creator-10 관점으로 사실·구조·자연스러움·정보 효용·SEO·모바일 흐름을 점검해 하나의 목소리로 합친다.',
        '자연화: 상투적인 도입, 반복 종결, 과도한 요약체·불릿, 번역투·광고투를 줄이고 실제 독자가 읽기 좋은 리듬으로 편집한다.',
        '이미지: 이미지 도구가 실제로 있으면 생성할 수 있고, 없으면 각 장의 제작 프롬프트·구도·비율·본문 위치·캡션·ALT를 제공한다.',
        '최종 검수: 사용자에게 없는 경험을 만들지 않았는지, 최신 사실을 확인했는지, 글과 이미지가 같은 메시지를 전달하는지 점검한다.'
      ],
      naturalnessRules:[
        'AI 판별기 우회 점수나 기만을 목표로 하지 말고 사람이 읽기 자연스러운 글을 목표로 한다.',
        '문장 길이와 호흡을 필요에 따라 섞고 같은 종결어미와 연결어를 연속 반복하지 않는다.',
        '“결론적으로”, “알아보겠습니다”, “도움이 되셨길 바랍니다” 같은 상투 문구는 맥락상 꼭 필요하지 않으면 사용하지 않는다.'
      ]
    }
  };
  const PROFILE_KEY='ai-writing-os-profile-v1';
  const PROVIDER_KEY='ai-writing-os-provider-v1';
  const FACTORY_KEY='ai-writing-os-factory-v1';
  const MAX_TASK_CHARS=200000;
  const FACTORY_DEFAULTS={mode:'daily_one',blogType:'auto',audience:'',researchMode:'auto',imageCount:'5'};
  const BLOG_TYPE_LABELS={auto:'자동 판단',search_info:'검색 정보형',place_trip:'장소 · 여행',parenting_life:'육아 · 생활',product_info:'제품 · 비교 정보형',monetization:'수익 연결형'};
  const RESEARCH_LABELS={auto:'필요할 때만',required:'가능하면 반드시 확인',off:'외부 조사 없이'};
  let providers=FALLBACK_PROVIDERS,manifest=FALLBACK_MANIFEST,compiler=FALLBACK_COMPILER,provider='chatgpt';
  let factoryMode=FACTORY_DEFAULTS.mode;
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
  function getFactoryModeProfile(mode=factoryMode){return compiler.blogFactory?.modes?.[mode]||FALLBACK_COMPILER.blogFactory.modes[mode]||FALLBACK_COMPILER.blogFactory.modes.daily_one;}
  function getFactorySettings(){
    return{
      mode:factoryMode,
      label:getFactoryModeProfile().label,
      summary:getFactoryModeProfile().summary,
      blogType:$('osBlogType')?.value||FACTORY_DEFAULTS.blogType,
      blogTypeLabel:BLOG_TYPE_LABELS[$('osBlogType')?.value||FACTORY_DEFAULTS.blogType]||'자동 판단',
      audience:$('osAudience')?.value.trim()||'',
      researchMode:$('osResearchMode')?.value||FACTORY_DEFAULTS.researchMode,
      researchLabel:RESEARCH_LABELS[$('osResearchMode')?.value||FACTORY_DEFAULTS.researchMode]||'필요할 때만',
      imageCount:String($('osImageCount')?.value??FACTORY_DEFAULTS.imageCount),
      facts:$('osFacts')?.value.trim()||'',
      avoidTopics:$('osAvoidTopics')?.value.trim()||''
    };
  }
  function factoryDeliverables(settings){
    const images=Number(settings.imageCount)>0?['image_plan_and_prompts']:[];
    if(settings.mode==='daily_one')return['topic_shortlist','research_notes','naver_blog_post',...images,'publish_pack'];
    if(settings.mode==='batch_three')return['three_distinct_topics','three_naver_blog_posts',...images,'three_publish_packs'];
    if(settings.mode==='idea_bank')return['20_topic_bank','priority_and_angle','next_7_days_queue'];
    return null;
  }
  function loadStoredProfile(){
    if(!storage)return;
    try{const raw=storage.getItem(PROFILE_KEY);if(raw){const value=JSON.parse(raw);if($('osDisplayName'))$('osDisplayName').value=String(value.displayName||'');if($('osPreferences'))$('osPreferences').value=String(value.preferencesText||'');}}catch(_){}
    try{const saved=storage.getItem(PROVIDER_KEY);if(saved&&providers.some(p=>p.id===saved))provider=saved;}catch(_){}
    try{
      const raw=storage.getItem(FACTORY_KEY);if(raw){const value=JSON.parse(raw);if(value&&typeof value==='object'){
        if(['daily_one','batch_three','idea_bank','free'].includes(value.mode))factoryMode=value.mode;
        if($('osBlogType')&&BLOG_TYPE_LABELS[value.blogType])$('osBlogType').value=value.blogType;
        if($('osAudience'))$('osAudience').value=String(value.audience||'');
        if($('osResearchMode')&&RESEARCH_LABELS[value.researchMode])$('osResearchMode').value=value.researchMode;
        if($('osImageCount')&&['0','3','5','7'].includes(String(value.imageCount)))$('osImageCount').value=String(value.imageCount);
      }}
    }catch(_){}
  }
  function rememberProvider(){if(!storage)return;try{storage.setItem(PROVIDER_KEY,provider);}catch(_){} }
  function rememberFactory(){
    if(!storage)return;
    const s=getFactorySettings();
    try{storage.setItem(FACTORY_KEY,JSON.stringify({mode:s.mode,blogType:s.blogType,audience:s.audience,researchMode:s.researchMode,imageCount:s.imageCount,savedAt:Date.now()}));}catch(_){}
  }
  function saveProfile(){
    const value={displayName:$('osDisplayName')?.value.trim()||'',preferencesText:$('osPreferences')?.value||'',savedAt:Date.now()};
    if(storage){try{storage.setItem(PROFILE_KEY,JSON.stringify(value));showToast('AI 글쓰기 OS 기본 설정을 이 브라우저에 저장했습니다.');return true;}catch(_){} }
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
  function renderFactoryModes(){
    const profile=getFactoryModeProfile();
    document.querySelectorAll?.('[data-factory-mode]')?.forEach?.(b=>{const on=b.dataset.factoryMode===factoryMode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    const summary=$('osFactoryModeSummary');if(summary)summary.innerHTML=`<b>${escapeHtml(profile.label)}</b><span>${escapeHtml(profile.summary)}</span>`;
    const label=$('osTaskLabel'),hint=$('osTaskHint'),task=$('osTask');
    if(factoryMode==='free'){
      if(label)label.textContent='무엇을 하고 싶으세요?';if(hint)hint.textContent='기존 AI 글쓰기 OS처럼 짧게 적어도 됩니다.';
      if(task)task.placeholder='예: 부산 아이와 가볼 만한 곳으로 네이버 블로그 글 써줘. 과장 없이 자연스러운 해요체로.';
    }else{
      if(label)label.textContent='주제 씨앗 / 관심 범위';if(hint)hint.textContent='정확한 제목이 없어도 됩니다. 관심 분야나 오늘 다루고 싶은 범위만 적으세요.';
      if(task)task.placeholder='예: 육아·아이와 갈 곳·생활정보 쪽에서 오늘 검색할 만한 소재를 찾아서 만들어줘.';
    }
    const factoryOnly=['osBlogType','osAudience','osResearchMode','osImageCount','osFacts','osAvoidTopics'];
    for(const id of factoryOnly){const el=$(id);if(el)el.disabled=factoryMode==='free';}
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function getNavigator(){return root.navigator||(typeof navigator!=='undefined'?navigator:null);}
  function isRestrictedInAppBrowser(){
    const ua=String(getNavigator()?.userAgent||'');
    return /(KAKAOTALK|; wv\)|\bwv\b|FBAN|FBAV|Instagram|Line\/)/i.test(ua);
  }
  function prefersNativeShare(){
    const n=getNavigator();if(typeof n?.share!=='function'||isRestrictedInAppBrowser())return false;
    let coarse=false;try{coarse=!!root.matchMedia?.('(pointer: coarse)')?.matches;}catch(_){}
    const touchPoints=Number(n.maxTouchPoints||0),width=Number(root.innerWidth||0);
    return coarse||(touchPoints>0&&width>0&&width<=900);
  }
  function deliveryPlan(){
    const p=selectedProvider();
    if(prefersNativeShare())return{mode:'share',title:'모바일 연결 · 시스템 공유창',hint:p.id==='other'?'공유창이 열리면 평소 쓰는 AI 앱을 선택하세요.':'공유창이 열리면 '+p.label+' 앱을 선택하세요. 브라우저가 특정 앱을 강제로 열지는 않습니다.',button:'OS로 강화해서 공유하기',ready:'버튼 한 번으로 강화한 뒤 시스템 공유창을 엽니다.',after:p.id==='other'?'공유창에서 사용할 AI 앱을 선택해 이어가세요.':'공유창에서 '+p.label+'을 선택해 이어가세요.'};
    if(isRestrictedInAppBrowser()&&p.launchUrl)return{mode:'safe-copy-open',title:'인앱 브라우저 안전 연결 · 복사 확인 후 '+p.label+' 열기',hint:'카카오톡 같은 인앱 브라우저에서는 먼저 프롬프트 복사를 확인한 뒤 '+p.label+'를 엽니다. 복사가 막히면 AI를 열지 않고 이 화면에 머뭅니다.',button:'OS로 강화해서 복사 후 '+p.label+' 열기',ready:'복사가 확인되면 '+p.label+'를 엽니다. 복사가 막히면 이 화면에서 바로 알려드립니다.',after:p.label+'에서 붙여넣기만 하면 됩니다.'};
    if(p.launchUrl)return{mode:'copy-open',title:'PC 연결 · 복사 확인 후 '+p.label+' 열기',hint:'버튼을 누르면 강화 프롬프트 복사를 먼저 확인한 뒤 '+p.label+' 새 탭을 엽니다. 새 탭에서 붙여넣기만 하면 됩니다.',button:'OS로 강화해서 '+p.label+' 열기',ready:'한 번 누르면 OS가 강화하고 복사를 확인한 뒤 '+p.label+'를 엽니다.',after:p.label+' 새 탭에서 붙여넣기(Ctrl/⌘+V)만 하면 됩니다.'};
    return{mode:'copy',title:'범용 연결 · 강화 프롬프트 복사',hint:'특정 AI를 열지 않고 강화 프롬프트만 복사합니다. 평소 쓰는 AI에 붙여넣으세요.',button:'OS로 강화해서 복사하기',ready:'한 번 누르면 OS가 강화 프롬프트를 복사합니다.',after:'평소 쓰는 AI를 열고 붙여넣기만 하면 됩니다.'};
  }
  function updateProviderHint(){
    const p=selectedProvider(),hint=$('osProviderHint'),delivery=$('osDeliveryHint'),title=$('osDeliveryTitle'),sendLabel=$('osSendEnhancedLabel'),openAi=$('osOpenAi'),plan=deliveryPlan();
    if(hint)hint.textContent=p.id==='other'?'기타 AI 선택됨 · 다음에도 이 선택을 기본으로 기억합니다.':`${p.label} 선택됨 · 다음에도 이 AI를 기본으로 기억합니다.`;
    if(title)title.textContent=plan.title;
    if(delivery)delivery.textContent=plan.hint;
    if(sendLabel)sendLabel.textContent=plan.button;
    if(openAi){openAi.hidden=!p.launchUrl;openAi.textContent=p.launchUrl?`${p.label} 열기`:'선택 AI 열기';}
  }
  function localDateLabel(){try{return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).format(new Date());}catch(_){return new Date().toISOString().slice(0,10);} }
  function routeSummary(pack){
    const names={BLOG:'블로그',INSTAGRAM:'인스타그램',YOUTUBE:'유튜브/쇼츠',PRODUCT:'제품/사업',GENERAL:'일반'};
    const d=pack.route.deliverables||[],f=pack.factory;
    return[
      `AI: ${pack.providerLabel||pack.provider}`,
      f&&f.mode!=='free'?`생산 모드: ${f.label}`:'',
      f&&f.mode!=='free'?`글 유형: ${f.blogTypeLabel} · 조사: ${f.researchLabel} · 이미지: ${Number(f.imageCount)>0?`${f.imageCount}장`:'제외'}`:'',
      `분류: ${names[pack.route.channel]||pack.route.channel}`,
      `의도: ${pack.route.intent}`,
      `품질 모드: ${pack.route.workforceMode}${pack.route.contributions?` · ${pack.route.contributions}`:''}`,
      `출력 언어: ${pack.route.outputLanguage==='ko'?'한국어':pack.route.outputLanguage}`,
      d.length?`결과 형식: ${d.join(', ')}`:'',
      `컴파일 규칙: 공통 ${pack.compiler.commonRuleCount} + 채널 ${pack.compiler.channelRuleCount} + 품질 1${f&&f.mode!=='free'?` + Factory ${pack.compiler.factoryStageCount}`:''}`,
      '',
      `긴 OS 원문 전체를 붙이지 않고 이번 작업에 필요한 실행 규칙만 압축합니다.`
    ].filter(Boolean).join('\n');
  }
  function buildTaskPackSync(){
    const task=$('osTask')?.value.trim()||'';
    if(!task)throw new Error(factoryMode==='free'?'원하는 작업을 먼저 적어주세요.':'주제 씨앗이나 관심 범위를 먼저 적어주세요.');
    if(task.length>MAX_TASK_CHARS)throw new Error('20만 자가 넘는 요청은 브라우저가 느려질 수 있어 준비하지 않았습니다. 요청을 나눠서 사용해 주세요.');
    let route=routeTask(task,$('osMode')?.value||'auto');
    const factory=getFactorySettings();
    if(factory.mode!=='free'){
      const requestedMode=$('osMode')?.value||'auto';
      route={...route,channel:'BLOG',intent:'CREATE',deliverables:factoryDeliverables(factory)||['naver_blog_post']};
      if(requestedMode==='auto'&&route.workforceMode!=='QUICK'){route.workforceMode='CREATOR_10';route.contributions='10 perspectives';}
    }
    const p=selectedProvider(),profile=getProfile(),channel=selectedChannel(route),commonRules=[...(compiler.commonRules||[])],channelRules=[...(channel.rules||[])],effort=qualityRule(route),factoryStages=[...(compiler.blogFactory?.stages||FALLBACK_COMPILER.blogFactory.stages)],naturalnessRules=[...(compiler.blogFactory?.naturalnessRules||FALLBACK_COMPILER.blogFactory.naturalnessRules)];
    return{
      schemaVersion:2,createdAt:new Date().toISOString(),localDate:localDateLabel(),
      os:{name:manifest.name,version:manifest.version,compiler:compiler.name||'AI Cleaner Blog Factory Compiler',compilerVersion:compiler.version||'1.1',mode:'LOCAL_PROMPT_COMPILER',defaultLanguage:manifest.defaultLanguage||'ko',portableZip:manifest.portableZip},
      task,provider:p.id,providerLabel:p.label,route,factory,
      boundaries:{controlPlaneIsNotContent:true,userContentIsContentPlane:true,neverInventExperience:true,doNotExposeInternalDeliberationByDefault:true,defaultUserFacingLanguage:route.outputLanguage,detectorEvasionOptimization:false},
      userProfile:(profile.displayName||Object.keys(profile.preferences).length)?profile:undefined,
      compiler:{commonRules,channelRules,effortRule:effort,outputContract:channel.outputContract||'',channelLabel:channel.label||route.channel,commonRuleCount:commonRules.length,channelRuleCount:channelRules.length,factoryStages,naturalnessRules,factoryStageCount:factory.mode==='free'?0:factoryStages.length},
      delivery:{nativeSharePreferred:prefersNativeShare(),launchUrl:p.launchUrl||'',apiKeyRequiredByDefault:false}
    };
  }
  async function buildTaskPack(signal){if(!compilerReady)await ensureAssets(signal);return buildTaskPackSync();}
  function factoryOutputContract(pack){
    const f=pack.factory,images=Number(f.imageCount)||0;
    if(f.mode==='daily_one')return[
      '- 소재가 넓으면 후보 5~7개를 짧게 비교하고 오늘 작성 가치가 가장 높은 1개를 선택한다. 사용자가 정확한 주제를 지정했다면 그 주제를 우선한다.',
      '- 선택 주제에 대해 제목 후보 → 핵심 사실/확인 필요 항목 → 최종 네이버 블로그 글 1편 순서로 납품한다.',
      images?`- 이미지 ${images}장 패키지: 대표 이미지 1장 + 본문 이미지 ${Math.max(0,images-1)}장. 각 이미지마다 생성 프롬프트, 권장 비율, 구도, 본문 삽입 위치, 캡션, ALT를 제공한다.`:'- 이번 작업에서는 이미지 패키지를 제외한다.',
      '- 마지막에 태그와 발행 전 확인사항을 짧게 붙인다.'
    ];
    if(f.mode==='batch_three')return[
      '- 검색 의도와 소재 각도가 겹치지 않는 주제 3개를 선택한다.',
      '- 각 주제마다 제목·핵심 근거·완성 네이버 블로그 글을 독립적으로 작성한다.',
      images?`- 각 글마다 이미지 ${images}장 패키지를 별도로 설계한다.`:'- 이번 작업에서는 이미지 패키지를 제외한다.',
      '- 세 글 사이에 같은 도입, 같은 소제목 패턴, 같은 결론 문구를 복제하지 않는다.'
    ];
    if(f.mode==='idea_bank')return[
      '- 서로 겹치지 않는 소재 20개를 만든다.',
      '- 각 소재마다 추천 제목 방향, 검색 의도, 지금 쓸 이유, 필요한 사실 확인, 이미지 콘셉트, 난이도를 1~2줄로 정리한다.',
      '- 상위 7개를 다음 7일 큐로 다시 정렬하고 1순위를 명확히 표시한다.',
      '- 완성 본문은 작성하지 않는다.'
    ];
    return[];
  }
  function researchRule(f){
    if(f.researchMode==='off')return'외부 웹 조사를 사용하지 않는다. 현재 요청에 없는 최신 사실은 추정하지 말고 확인 필요 항목으로 분리한다.';
    if(f.researchMode==='required')return'현재 AI 환경에 웹 검색/브라우징 기능이 실제로 있으면 최신성 있는 사실을 가능한 한 확인하고 공식·신뢰 가능한 출처를 우선한다. 웹 기능이 없으면 조사했다고 가장하지 말고 확인 필요로 표시한다.';
    return'가격·운영시간·정책·제품사양·최근 이슈처럼 변할 수 있는 정보가 결과 품질에 중요할 때만, 현재 AI 환경에 웹 기능이 실제로 있으면 확인한다. 기능이 없으면 확인했다고 가장하지 않는다.';
  }
  function imageRule(f){
    const count=Number(f.imageCount)||0;if(!count)return'이번 요청은 이미지 패키지를 만들지 않는다.';
    return`이미지 ${count}장 패키지를 설계한다. 현재 AI 환경에 실제 이미지 생성 기능이 있고 실행이 가능하면 이미지를 생성할 수 있다. 그렇지 않으면 생성했다고 주장하지 말고, 각 장의 상세 제작 프롬프트·구도·비율·본문 위치·캡션·ALT를 납품한다.`;
  }
  function taskPackToMarkdown(pack){
    const c=pack.compiler,profile=pack.userProfile,d=pack.route.deliverables||[],f=pack.factory||{mode:'free'};
    const lines=[
      '# AI CLEANER OS — EXECUTION PROMPT','',
      `> ${pack.os.compiler} V${pack.os.compilerVersion} · ${pack.os.name} V${pack.os.version}${f.mode!=='free'?' · BLOG FACTORY':''}`,'',
      '## 1. 사용자 요청',pack.task,'',
      '## 2. 실행 계약',
      '- 아래 규칙은 작업 방법이다. 규칙 자체를 최종 콘텐츠의 소재로 쓰지 마라.',
      '- 요청받은 완성 결과물을 먼저 제공하고, 불필요한 내부 검토 설명은 생략하라.',
      `- 최종 출력 언어: ${pack.route.outputLanguage}`,
      '- 사용자에게 없는 경험·구매·방문·가족 반응·효과를 실제 경험처럼 만들지 마라.',
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
      '- 사실이 필요한데 현재 요청에 근거가 없으면 경험을 꾸미지 말고, 필요한 경우 가정 또는 확인 필요 항목으로 분리하라.',''
    ];
    if(f.mode!=='free'){
      const modeProfile=getFactoryModeProfile(f.mode);
      lines.push(
        '## 9. BLOG FACTORY 생산 카드',
        `- 기준 날짜: ${pack.localDate}`,
        `- 생산 모드: ${f.label}`,
        `- 모드 지시: ${modeProfile.instruction}`,
        `- 글 유형: ${f.blogTypeLabel}`,
        `- 목표 독자: ${f.audience||'요청 내용에서 합리적으로 추론하되 임의의 개인 사실은 만들지 않는다.'}`,
        `- 최신 정보 조사: ${f.researchLabel}`,
        `- 이미지: ${Number(f.imageCount)>0?`${f.imageCount}장 패키지`:'제외'}`,
        f.facts?`- USER FACT / 실제 경험:\n${f.facts}`:'- USER FACT / 실제 경험: 별도 제공 없음. 1인칭 체험을 임의 생성하지 않는다.',
        f.avoidTopics?`- 중복 방지 / 피할 소재:\n${f.avoidTopics}`:'- 중복 방지 메모: 별도 제공 없음.',
        '',
        '## 10. BLOG FACTORY 생산 파이프라인',
        ...c.factoryStages.map((rule,i)=>`${i+1}. ${rule}`),
        '',
        '## 11. 조사 경계',
        `- ${researchRule(f)}`,
        '- 웹에서 찾은 정보가 있으면 사실과 출처 성격을 구분하고, 확인되지 않은 검색량·인기·효과를 숫자로 꾸미지 않는다.',
        '',
        '## 12. 자연스러움 편집',
        ...c.naturalnessRules.map(rule=>`- ${rule}`),
        '',
        '## 13. 이미지 제작 계약',
        `- ${imageRule(f)}`,
        '- 사진 속에 실제로 존재하지 않는 사용자 경험이나 제품 사용 장면을 사실 증거처럼 설명하지 않는다.',
        '',
        '## 14. 이번 모드의 납품 형식',
        ...factoryOutputContract(pack),
        ''
      );
    }
    lines.push('## 실행','이제 위 규칙을 내부 작업 기준으로 적용해 사용자 요청을 완료하라. OS나 프롬프트 구조를 설명하지 말고 실제 결과부터 작성하라.');
    return lines.filter((v,i,a)=>v!==''||a[i-1]!=='').join('\n').trim();
  }
  function compilerSummary(pack){
    if(pack.factory?.mode&&pack.factory.mode!=='free'){
      const images=Number(pack.factory.imageCount)||0;
      return `${pack.factory.label} · ${pack.compiler.channelLabel} Creator-10 · ${pack.factory.researchLabel} 조사 · ${images?`이미지 ${images}장 패키지`:'이미지 제외'} · Truth Guard 적용`;
    }
    const totalRules=pack.compiler.commonRuleCount+pack.compiler.channelRuleCount+1;
    return `${pack.compiler.channelLabel}로 자동 분류 · 핵심 규칙 ${totalRules}개 적용 · 원문 의미는 유지하고 실행 조건만 보강했습니다.`;
  }
  function appliedRuleLabels(pack){
    const effort={QUICK:'빠른 완성',STANDARD_PLUS:'표준 품질 검수',CREATOR_10:'Creator-10',ENTERPRISE:'다부서 관점 검수',GRAND_CHALLENGE:'전주기 심층 검수'};
    const labels=[];
    if(pack.factory?.mode&&pack.factory.mode!=='free')labels.push(pack.factory.label,'소재→글→이미지');
    labels.push(`자동 분류 · ${pack.compiler.channelLabel}`,'사실성 보호','결과물 우선',effort[pack.route.workforceMode]||pack.route.workforceMode);
    return labels.filter(Boolean);
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
    if(compilerInfo)compilerInfo.textContent=compilerSummary(pack);
    renderAppliedChips(pack);
    if(ready)ready.textContent=pack.factory?.mode&&pack.factory.mode!=='free'?`${pack.factory.label} 생산용 프롬프트를 준비했습니다.`:'요청을 실행용 프롬프트로 강화했습니다.';
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
    if(status)status.textContent=busy?'OS가 생산 흐름과 실행 규칙을 정리하고 있습니다…':hasTask?deliveryPlan().ready:(factoryMode==='free'?'원하는 작업을 먼저 적어주세요.':'주제 씨앗이나 관심 범위를 먼저 적어주세요.');
    $('writingTool')?.setAttribute('aria-busy',busy?'true':'false');
  }
  function setBusy(next){busy=!!next;syncSimpleState();}
  function preferredScrollBehavior(){try{return root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth';}catch(_){return'auto';}}
  async function prepare({scroll=true}={}){
    const token=++seq;prepareAbort?.abort();currentMarkdown='';currentPack=null;const controller=new AbortController();prepareAbort=controller;const lockName=`ai-writing-os-${token}`;workLock?.acquire?.(lockName,{kind:'compile'});setBusy(true);
    try{
      const pack=await buildTaskPack(controller.signal);if(token!==seq||!active||controller.signal.aborted)return null;
      const markdown=taskPackToMarkdown(pack);renderPrepared(pack,markdown,{scroll});showToast(pack.factory?.mode&&pack.factory.mode!=='free'?'Blog Factory 생산 프롬프트를 만들었습니다.':'OS 강화 프롬프트를 만들었습니다.');return pack;
    }catch(error){if(controller.signal.aborted||token!==seq||!active)return null;throw error;}
    finally{workLock?.release?.(lockName);if(prepareAbort===controller)prepareAbort=null;if(token===seq)setBusy(false);}
  }
  async function ensureMarkdown(){if(currentMarkdown&&$('osTaskPackPreview')?.value===currentMarkdown)return currentMarkdown;const pack=await prepare();return pack?currentMarkdown:'';}
  function legacyClipboardCopy(text){
    let area=null;
    try{
      if(!document?.body||typeof document.createElement!=='function'||typeof document.execCommand!=='function')return false;
      area=document.createElement('textarea');area.value=String(text??'');area.setAttribute('readonly','');area.setAttribute('aria-hidden','true');
      area.style.position='fixed';area.style.left='-9999px';area.style.top='0';area.style.opacity='0';area.style.pointerEvents='none';
      document.body.appendChild(area);try{area.focus({preventScroll:true});}catch(_){area.focus();}area.select();area.setSelectionRange(0,area.value.length);
      return document.execCommand('copy')===true;
    }catch(_){return false;}finally{try{area?.remove();}catch(_){} }
  }
  async function modernClipboardCopy(text){const n=getNavigator();if(typeof n?.clipboard?.writeText!=='function')return false;try{await n.clipboard.writeText(text);return true;}catch(_){return false;}}
  async function writeClipboard(text,{legacyFirst=false}={}){
    if(legacyFirst&&legacyClipboardCopy(text))return true;
    if(await modernClipboardCopy(text))return true;
    return legacyFirst?false:legacyClipboardCopy(text);
  }
  function focusManualCopy(enhanced=true){const target=$(enhanced?'osTaskPackPreview':'osTask');if(!target)return;try{try{target.focus({preventScroll:true});}catch(_){target.focus();}target.select();}catch(_){} }
  async function copyMarkdown(){const md=await ensureMarkdown();if(!md)return;const copied=await writeClipboard(md,{legacyFirst:true});if(!copied)focusManualCopy();showToast(copied?'강화 프롬프트를 복사했습니다.':'자동 복사가 차단됐습니다. 아래 프롬프트가 선택되어 있으니 직접 복사해 주세요.');return copied;}
  async function nativeShare(text,title){
    const n=getNavigator();if(!prefersNativeShare())return false;
    try{await n.share({title,text});return true;}catch(error){if(error?.name==='AbortError')return null;return false;}
  }
  function updateDeliveryResult(result){
    const p=selectedProvider(),ready=$('osReadyMessage'),after=$('osAfterSend'),plan=deliveryPlan();
    if(!ready||!after)return;
    if(result==='share'){ready.textContent='OS 강화 후 시스템 공유를 완료했습니다.';after.textContent=plan.after;return;}
    if(result==='cancel'){ready.textContent='OS 강화는 완료됐고, 공유는 취소되었습니다.';after.textContent='아래에서 프롬프트를 복사하거나 다시 보내면 됩니다.';return;}
    if(result==='copy-open'){ready.textContent=`강화 프롬프트를 복사한 뒤 ${p.label}를 열었습니다.`;after.textContent=plan.after;return;}
    if(result==='copy'){ready.textContent='강화 프롬프트를 복사했습니다.';after.textContent=p.launchUrl?`복사는 완료됐습니다. 아래 ${p.label} 열기 버튼을 눌러 이어가세요.`:plan.after;return;}
    if(result==='copy-failed'){ready.textContent='자동 복사가 차단되어 AI를 열지 않았습니다.';after.textContent='아래 프롬프트가 선택되어 있습니다. 직접 복사한 뒤 AI 열기 버튼을 눌러주세요.';return;}
    ready.textContent='OS 강화는 완료됐지만 자동 전달은 막혔습니다.';after.textContent='아래 프롬프트 복사 버튼을 사용해 직접 붙여넣으세요.';
  }
  async function deliverText(text,{enhanced=true,allowNativeShare=true}={}){
    const p=selectedProvider();
    if(allowNativeShare&&prefersNativeShare()){
      const shared=await nativeShare(text,enhanced?'AI Cleaner OS 강화 요청':'AI 요청');
      if(shared===true){showToast('시스템 공유창으로 요청을 보냈습니다.');return'share';}
      if(shared===null){showToast('공유를 취소했습니다.');return'cancel';}
    }
    const copied=await writeClipboard(text,{legacyFirst:true});
    if(!copied){focusManualCopy(enhanced);showToast('자동 복사가 차단되어 AI를 열지 않았습니다. 아래 내용을 직접 복사해 주세요.');return'copy-failed';}
    if(!p?.launchUrl){showToast('요청문을 복사했습니다. 평소 사용하는 AI에 붙여넣으세요.');return'copy';}
    const opened=openWindow(p.launchUrl);
    if(opened===null){showToast('요청문은 복사했습니다. 새 탭이 차단되어 AI는 열지 못했습니다. 아래 AI 열기 버튼을 눌러주세요.');return'copy';}
    showToast(`${p.label}를 열기 전에 요청문 복사를 확인했습니다. 새 탭에서 붙여넣기만 하면 됩니다.`);return'copy-open';
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
  async function downloadMarkdown(){const md=await ensureMarkdown();if(md)downloadText(factoryMode==='free'?'AI_CLEANER_OS_PROMPT.md':'AI_CLEANER_BLOG_FACTORY_PROMPT.md',md,'text/markdown;charset=utf-8');}
  async function openSelectedAi(){
    const p=selectedProvider();if(!p?.launchUrl)return showToast('이 AI의 실행 주소가 없습니다. 강화 프롬프트를 복사해 원하는 AI에 붙여넣으세요.');
    const md=await ensureMarkdown();if(!md)return;const opened=openWindow(p.launchUrl);if(opened===null)return showToast('새 탭이 차단됐습니다. 브라우저의 팝업 허용 후 다시 눌러주세요.');showToast(`${p.label}를 열었습니다. 복사한 강화 프롬프트를 붙여넣으세요.`);
  }
  function downloadOsZip(){const href=`${assetBase}/os/releases/${encodeURIComponent(manifest.portableZip||FALLBACK_MANIFEST.portableZip)}`,a=document.createElement('a');a.href=href;a.download=manifest.portableZip||FALLBACK_MANIFEST.portableZip;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();}}
  function clearTask(){
    seq++;prepareAbort?.abort();prepareAbort=null;currentMarkdown='';currentPack=null;
    for(const id of ['osTask','osFacts','osAvoidTopics'])if($(id))$(id).value='';
    if($('osRouteSummary'))$('osRouteSummary').textContent='OS가 요청을 분석하면 생산 모드·적용 규칙·출력 패키지를 여기에 표시합니다.';
    if($('osTaskPackPreview'))$('osTaskPackPreview').value='';if($('osTaskPackResult'))$('osTaskPackResult').hidden=true;if($('osCompilerSummary'))$('osCompilerSummary').textContent='';if($('osAppliedChips'))$('osAppliedChips').textContent='';setBusy(false);$('osTask')?.focus();
  }
  function selectFactoryMode(next,{remember=true}={}){
    if(!['daily_one','batch_three','idea_bank','free'].includes(next))return false;
    if(factoryMode===next){renderFactoryModes();return true;}
    factoryMode=next;if(remember)rememberFactory();invalidatePreparedOutput();renderFactoryModes();syncSimpleState();return true;
  }
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
    $('osFactoryPresets')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-factory-mode]');if(b)selectFactoryMode(b.dataset.factoryMode);});
    for(const id of ['osBlogType','osAudience','osResearchMode','osImageCount'])$(id)?.addEventListener(id==='osAudience'?'input':'change',()=>{rememberFactory();invalidatePreparedOutput();});
    for(const id of ['osFacts','osAvoidTopics'])$(id)?.addEventListener('input',invalidatePreparedOutput);
    $('osMode')?.addEventListener('change',invalidatePreparedOutput);$('osDisplayName')?.addEventListener('input',invalidatePreparedOutput);$('osPreferences')?.addEventListener('input',invalidatePreparedOutput);
  }
  async function init(){
    if(initialized)return;initialized=true;bind();await ensureAssets();loadStoredProfile();renderFactoryModes();if($('osStatus'))$('osStatus').textContent=`내 기기에서 준비됨 · OS V${manifest.version} · Factory`;
    renderProviders();if($('osStaticMode'))$('osStaticMode').textContent='GitHub Pages 정적 모드 · V7 Blog Factory Compiler';syncSimpleState();
  }
  function captureState(){
    const f=getFactorySettings();
    return{provider,task:$('osTask')?.value||'',mode:$('osMode')?.value||'auto',factoryMode:f.mode,blogType:f.blogType,audience:f.audience,researchMode:f.researchMode,imageCount:f.imageCount,facts:f.facts,avoidTopics:f.avoidTopics};
  }
  function restoreState(value){
    if(!value||typeof value!=='object')return false;const requestedProvider=String(value.provider||'');if(requestedProvider)provider=requestedProvider;
    if($('osTask'))$('osTask').value=String(value.task||'');if($('osMode'))$('osMode').value=['auto','quick','creator_10','enterprise','grand_challenge'].includes(String(value.mode))?String(value.mode):'auto';
    if(['daily_one','batch_three','idea_bank','free'].includes(String(value.factoryMode)))factoryMode=String(value.factoryMode);
    if($('osBlogType')&&BLOG_TYPE_LABELS[String(value.blogType)])$('osBlogType').value=String(value.blogType);if($('osAudience'))$('osAudience').value=String(value.audience||'');
    if($('osResearchMode')&&RESEARCH_LABELS[String(value.researchMode)])$('osResearchMode').value=String(value.researchMode);if($('osImageCount')&&['0','3','5','7'].includes(String(value.imageCount)))$('osImageCount').value=String(value.imageCount);
    if($('osFacts'))$('osFacts').value=String(value.facts||'');if($('osAvoidTopics'))$('osAvoidTopics').value=String(value.avoidTopics||'');
    invalidatePreparedOutput();if(initialized){renderFactoryModes();renderProviders();updateProviderHint();syncSimpleState();}return true;
  }
  async function activate(){active=true;await init();renderFactoryModes();updateProviderHint();syncSimpleState();}
  function deactivate(){active=false;seq++;prepareAbort?.abort();prepareAbort=null;setBusy(false);}
  return{init,activate,deactivate,captureState,restoreState,routeTask,buildTaskPack,buildTaskPackSync,taskPackToMarkdown,sendEnhanced,sendRaw,selectFactoryMode,get provider(){return provider;},get factoryMode(){return factoryMode;},get manifest(){return manifest;},get compiler(){return compiler;},get currentPack(){return currentPack;}};
};
})();
