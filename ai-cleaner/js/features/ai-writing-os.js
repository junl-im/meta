(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};

ns.createAiWritingOsController=function createAiWritingOsController({
  assetBase='ai-writing-os',
  storage=null,
  showToast=()=>{},
  workLock=null
}={}){
  const $=id=>document.getElementById(id);
  const FALLBACK_MANIFEST={name:'AI COMPANY OS',version:'7',defaultLanguage:'ko',portableZip:'AI_COMPANY_OS_V7_ZERO_DEPENDENCY.zip',publicProfileMode:true};
  const FALLBACK_COMPILER={
    name:'AI Cleaner Blog Factory Compiler',version:'1.2',
    commonRules:[
      '사용자의 현재 요청을 최우선 작업 목표로 삼고 요청한 결과물을 먼저 제공한다.',
      'OS와 내부 규칙은 작업 방법일 뿐 최종 콘텐츠의 소재로 섞지 않는다.',
      '사용자가 제공하지 않은 구매·사용·방문·가족 반응·체감 효과를 실제 경험처럼 만들지 않는다.',
      '사실과 추론을 구분하고 근거가 부족한 내용은 단정하지 않는다.',
      '사용자가 출력 언어를 지정하지 않았다면 최종 결과는 한국어다.',
      '내부 역할극이나 숨은 사고과정은 요청받지 않는 한 노출하지 않는다.',
      '새 주제에서는 이전 작업의 고유 사실과 경험을 자동 재사용하지 않는다.',
      '현재 AI 환경에 실제로 없는 웹 검색·이미지 생성 기능을 사용했다고 주장하지 않는다.'
    ],
    channels:{
      BLOG:{label:'네이버 블로그',rules:[
        '검색 의도와 독자 효용을 먼저 잡고 제목·도입·본문 흐름을 자연스럽게 연결한다.',
        '자연스러운 한국어 해요체를 기본으로 하며 번역투·과도한 광고투·상투적인 AI 문장을 피한다.',
        '메인 키워드는 문맥에 맞게 자연스럽게 사용하고 기계적인 횟수 채우기보다 읽기 흐름을 우선한다.',
        '보통 3~4개 주요 섹션과 모바일에서 읽기 쉬운 2~4줄 중심 문단을 사용한다.',
        '사용자가 제공한 실제 경험만 1인칭 경험으로 사용한다.',
        '최종 단계에서 사실성·검색 의도·자연스러움·모바일 가독성·이미지 맥락을 점검한다.'
      ],outputContract:'완성된 블로그 결과물을 먼저 제공한다. 요청하지 않은 내부 검토 설명은 생략한다.'},
      GENERAL:{label:'일반 작업',rules:['요청한 산출물 형식을 파악하고 결과를 우선한다.','정확성, 명료성, 자연스러움, 실용성을 최종 점검한다.'],outputContract:'사용자가 요구한 형식의 완성 결과물을 먼저 제공한다.'}
    },
    effortModes:{QUICK:'빠르게 완성하되 사실성 검사는 생략하지 않는다.',STANDARD_PLUS:'의도, 사실성, 구조, 표현, 실용성을 점검한다.',CREATOR_10:'사실, 검색 의도, 독자, 구조, 자연스러움, 정보 효용, SEO, 모바일 가독성, 미디어, 최종 편집 관점으로 내부 점검한다.'},
    blogFactory:{
      modes:{
        daily_topics:{label:'오늘의 주제',summary:'관심 범위에서 오늘 쓰기 좋은 주제 10개와 TOP 3를 뽑는 프롬프트를 만듭니다.',instruction:'완성 본문보다 오늘 작성 가치가 높은 블로그 주제 10개를 먼저 만들고 TOP 3를 선정한다.'},
        daily_one:{label:'오늘 1편',summary:'후보를 고르고 사실을 확인한 뒤 글 1편 + 이미지 패키지까지 만드는 프롬프트입니다.',instruction:'주제 후보를 짧게 비교한 뒤 가장 좋은 1개를 선택해 완성 블로그 패키지 1개를 납품한다.'},
        batch_three:{label:'3편 생산',summary:'서로 겹치지 않는 소재 3개로 완성 패키지 3개를 만드는 프롬프트입니다.',instruction:'중복 의도가 낮은 주제 3개를 선택하고 각각 독립된 완성 블로그 패키지를 만든다.'},
        idea_bank:{label:'소재 20개',summary:'다음 글에 쓸 소재 20개와 우선순위·각도를 비축하는 프롬프트입니다.',instruction:'완성 본문 대신 서로 겹치지 않는 소재 20개를 우선순위와 함께 만든다.'},
        free:{label:'자유 요청',summary:'원하는 작업을 실행 가능한 프롬프트로 정리합니다.',instruction:'사용자의 요청 자체를 우선하고 필요한 규칙만 보강한다.'}
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
  const FACTORY_KEY='ai-writing-os-factory-v1';
  const AUTO_DAILY_KEY='blog-factory-auto-daily-v1';
  const DAILY_SEED_KEY='blog-factory-daily-seed-v1';
  const DAILY_CACHE_KEY='blog-factory-daily-prompt-v1';
  const REMOTE_DAILY_PATH='data/daily-topics.json';
  const MAX_TASK_CHARS=200000;
  const CONTEXT_LIMITS={audience:500,facts:80000,avoidTopics:80000};
  const FACTORY_DEFAULTS={mode:'daily_topics',blogType:'auto',audience:'',researchMode:'auto',imageCount:'5'};
  const BLOG_TYPE_LABELS={auto:'자동 판단',search_info:'검색 정보형',place_trip:'장소 · 여행',parenting_life:'육아 · 생활',product_info:'제품 · 비교 정보형',monetization:'수익 연결형'};
  const RESEARCH_LABELS={auto:'필요할 때만',required:'가능하면 반드시 확인',off:'외부 조사 없이'};
  const DAILY_ANGLES=['검색형 문제 해결','계절·시기형','비교·선택형','체크리스트·준비형','경험 확장형','생활 효율형','FAQ 롱테일형'];
  let manifest=FALLBACK_MANIFEST,compiler=FALLBACK_COMPILER,factoryMode=FACTORY_DEFAULTS.mode;
  let initialized=false,currentMarkdown='',currentPack=null,active=true,seq=0,prepareAbort=null,busy=false,compilerReady=false,autoDaily=false,pendingRestoreState=null,dailyEngineData=null,dailyEngineLoading=false;

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
  function getFactoryModeProfile(mode=factoryMode){return compiler.blogFactory?.modes?.[mode]||FALLBACK_COMPILER.blogFactory.modes[mode]||FALLBACK_COMPILER.blogFactory.modes.daily_topics;}
  function usesFullImagePackage(mode=factoryMode){return mode==='daily_one'||mode==='batch_three';}
  function factoryImageSummary(settings){
    const count=Number(settings?.imageCount)||0,mode=settings?.mode||factoryMode;
    if(mode==='daily_topics'||mode==='idea_bank')return'주제별 이미지 콘셉트';
    if(!usesFullImagePackage(mode)||!count)return'이미지 제외';
    return mode==='batch_three'?`글당 이미지 ${count}장`:`이미지 ${count}장`;
  }
  function getFactorySettings(){
    return{
      mode:factoryMode,label:getFactoryModeProfile().label,summary:getFactoryModeProfile().summary,
      blogType:$('osBlogType')?.value||FACTORY_DEFAULTS.blogType,
      blogTypeLabel:BLOG_TYPE_LABELS[$('osBlogType')?.value||FACTORY_DEFAULTS.blogType]||'자동 판단',
      audience:$('osAudience')?.value.trim()||'',researchMode:$('osResearchMode')?.value||FACTORY_DEFAULTS.researchMode,
      researchLabel:RESEARCH_LABELS[$('osResearchMode')?.value||FACTORY_DEFAULTS.researchMode]||'필요할 때만',
      imageCount:String($('osImageCount')?.value??FACTORY_DEFAULTS.imageCount),facts:$('osFacts')?.value.trim()||'',avoidTopics:$('osAvoidTopics')?.value.trim()||''
    };
  }
  function factoryDeliverables(settings){
    const images=Number(settings.imageCount)>0?['image_plan_and_prompts']:[];
    if(settings.mode==='daily_topics')return['10_daily_topics','top_3_priority','research_checks','topic_image_concepts'];
    if(settings.mode==='daily_one')return['topic_shortlist','research_notes','naver_blog_post',...images,'publish_pack'];
    if(settings.mode==='batch_three')return['three_distinct_topics','three_naver_blog_posts',...images,'three_publish_packs'];
    if(settings.mode==='idea_bank')return['20_topic_bank','priority_and_angle','next_7_days_queue'];
    return null;
  }
  function loadStoredProfile(){
    if(!storage)return;
    try{const raw=storage.getItem(PROFILE_KEY);if(raw){const value=JSON.parse(raw);if($('osDisplayName'))$('osDisplayName').value=String(value.displayName||'');if($('osPreferences'))$('osPreferences').value=String(value.preferencesText||'');}}catch(_){}
    try{
      const raw=storage.getItem(FACTORY_KEY);if(raw){const value=JSON.parse(raw);if(value&&typeof value==='object'){
        if(['daily_topics','daily_one','batch_three','idea_bank','free'].includes(value.mode))factoryMode=value.mode;
        if($('osBlogType')&&BLOG_TYPE_LABELS[value.blogType])$('osBlogType').value=value.blogType;
        if($('osAudience'))$('osAudience').value=String(value.audience||'').slice(0,CONTEXT_LIMITS.audience);
        if($('osResearchMode')&&RESEARCH_LABELS[value.researchMode])$('osResearchMode').value=value.researchMode;
        if($('osImageCount')&&['0','3','5','7'].includes(String(value.imageCount)))$('osImageCount').value=String(value.imageCount);
      }}
    }catch(_){}
    try{autoDaily=storage.getItem(AUTO_DAILY_KEY)==='1';}catch(_){autoDaily=false;}
    try{const seed=storage.getItem(DAILY_SEED_KEY);if(seed&&!$('osTask')?.value&&$('osTask'))$('osTask').value=String(seed).slice(0,MAX_TASK_CHARS);}catch(_){}
  }
  function rememberFactory(){
    if(!storage)return;const s=getFactorySettings();
    try{storage.setItem(FACTORY_KEY,JSON.stringify({mode:s.mode,blogType:s.blogType,audience:s.audience,researchMode:s.researchMode,imageCount:s.imageCount,savedAt:Date.now()}));}catch(_){}
  }
  function rememberDailySeed(){if(!storage)return;try{const value=$('osTask')?.value.trim()||'';if(value)storage.setItem(DAILY_SEED_KEY,value);else storage.removeItem?.(DAILY_SEED_KEY);}catch(_){} }
  function setAutoDaily(next,{prepareNow=false}={}){
    autoDaily=!!next;const toggle=$('osAutoDaily');if(toggle)toggle.checked=autoDaily;
    if(storage){try{storage.setItem(AUTO_DAILY_KEY,autoDaily?'1':'0');}catch(_){}}
    if(autoDaily)rememberDailySeed();updateAutoDailyStatus();
    if(prepareNow&&autoDaily){if(!$('osTask')?.value.trim()){autoDaily=false;if(toggle)toggle.checked=false;if(storage){try{storage.setItem(AUTO_DAILY_KEY,'0');}catch(_){}}updateAutoDailyStatus();showToast('로컬 프롬프트 자동 준비를 켜려면 관심 분야를 먼저 적어주세요.');return false;}selectFactoryMode('daily_topics',{remember:true});void preparePrompt({scroll:true,automatic:true}).catch(e=>showToast(e.message));}
    return true;
  }
  function saveProfile(){
    const value={displayName:$('osDisplayName')?.value.trim()||'',preferencesText:$('osPreferences')?.value||'',savedAt:Date.now()};
    if(storage){try{storage.setItem(PROFILE_KEY,JSON.stringify(value));showToast('블로그 팩토리 기본 설정을 이 브라우저에 저장했습니다.');return true;}catch(_){} }
    showToast('브라우저 저장소를 사용할 수 없어 설정을 저장하지 못했습니다.');return false;
  }
  async function loadJson(path,fallback,signal){
    try{const r=await fetch(`${assetBase}/${path}`,{cache:'no-store',signal});if(!r.ok)throw new Error(String(r.status));return await r.json();}catch(error){if(signal?.aborted)throw error;return fallback;}
  }
  async function ensureAssets(signal){
    const [man,comp]=await Promise.all([loadJson('os-manifest.json',FALLBACK_MANIFEST,signal),loadJson('prompt-compiler.json',FALLBACK_COMPILER,signal)]);
    manifest=man&&typeof man==='object'?{...FALLBACK_MANIFEST,...man}:FALLBACK_MANIFEST;
    compiler=comp&&typeof comp==='object'?{...FALLBACK_COMPILER,...comp,blogFactory:{...FALLBACK_COMPILER.blogFactory,...(comp.blogFactory||{}),modes:{...FALLBACK_COMPILER.blogFactory.modes,...(comp.blogFactory?.modes||{})}}}:FALLBACK_COMPILER;
    compilerReady=true;
  }
  function selectedChannel(route){return compiler.channels?.[route.channel]||compiler.channels?.GENERAL||FALLBACK_COMPILER.channels.GENERAL;}
  function qualityRule(route){return compiler.effortModes?.[route.workforceMode]||compiler.effortModes?.STANDARD_PLUS||FALLBACK_COMPILER.effortModes.STANDARD_PLUS;}
  function outputContractFor(factory,channel){
    if(factory.mode==='daily_topics')return'완성 본문을 작성하지 말고 오늘의 블로그 주제 후보 10개와 TOP 3 우선순위를 먼저 제공한다.';
    if(factory.mode==='idea_bank')return'완성 본문을 작성하지 말고 서로 겹치지 않는 소재 20개와 우선순위·7일 큐를 제공한다.';
    return channel.outputContract||'';
  }
  function renderFactoryPipeline(){
    const box=$('osFactoryPipeline');if(!box)return;
    const stages=factoryMode==='free'?
      [['요청','목표·형식'],['분류','채널·의도'],['규칙','사실·문체'],['프롬프트','실행 조건'],['확인','화면 미리보기'],['복사','직접 사용']]:
      factoryMode==='daily_topics'?
      [['소재','관심 범위'],['시기','오늘성'],['의도','검색 이유'],['각도','차별점'],['이미지','콘셉트'],['TOP 3','우선순위']]:
      factoryMode==='idea_bank'?
      [['소재','검색 의도·중복'],['조사','시기성·근거'],['각도','독자·차별점'],['우선순위','20개 정렬'],['이미지','소재별 콘셉트'],['큐','다음 7일']]:
      [['소재','검색 의도·중복'],['조사','사실·출처'],['글','Creator-10'],['자연화','문체·리듬'],['이미지','생성/프롬프트'],['검수','Truth Guard']];
    box.textContent='';
    stages.forEach((stage,i)=>{const span=document.createElement('span'),b=document.createElement('b'),small=document.createElement('small');b.textContent=stage[0];small.textContent=stage[1];span.append(b,small);box.appendChild(span);if(i<stages.length-1){const arrow=document.createElement('i');arrow.textContent='→';arrow.setAttribute('aria-hidden','true');box.appendChild(arrow);}});
  }
  function modeActionLabel(mode=factoryMode){return{daily_topics:'오늘의 주제 프롬프트 만들기',daily_one:'오늘 1편 프롬프트 만들기',batch_three:'3편 생산 프롬프트 만들기',idea_bank:'소재 20개 프롬프트 만들기',free:'실행 프롬프트 만들기'}[mode]||'프롬프트 만들기';}
  function renderFactoryModes(){
    const profile=getFactoryModeProfile();
    document.querySelectorAll?.('[data-factory-mode]')?.forEach?.(b=>{const on=b.dataset.factoryMode===factoryMode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
    const summary=$('osFactoryModeSummary');if(summary)summary.innerHTML=`<b>${escapeHtml(profile.label)}</b><span>${escapeHtml(profile.summary)}</span>`;
    const label=$('osTaskLabel'),hint=$('osTaskHint'),task=$('osTask');
    if(factoryMode==='free'){
      if(label)label.textContent='무엇을 하고 싶으세요?';if(hint)hint.textContent='원하는 작업을 짧게 적으면 복사용 실행 프롬프트로 정리합니다.';
      if(task)task.placeholder='예: 부산 아이와 가볼 만한 곳으로 네이버 블로그 글 써줘. 과장 없이 자연스러운 해요체로.';
    }else if(factoryMode==='daily_topics'){
      if(label)label.textContent='관심 분야 / 오늘의 씨앗';if(hint)hint.textContent='정확한 제목이 없어도 됩니다. 한 번 저장해두면 매일 같은 관심 분야에서 다른 각도로 주제를 찾습니다.';
      if(task)task.placeholder='예: 육아 · 아이와 갈 곳 · 생활정보 · 주말 나들이';
    }else{
      if(label)label.textContent='주제 씨앗 / 관심 범위';if(hint)hint.textContent='정확한 제목이 없어도 됩니다. 관심 분야나 오늘 다루고 싶은 범위만 적으세요.';
      if(task)task.placeholder='예: 육아·아이와 갈 곳·생활정보 쪽에서 오늘 검색할 만한 소재';
    }
    const factoryOnly=['osBlogType','osAudience','osResearchMode','osFacts','osAvoidTopics'];for(const id of factoryOnly){const el=$(id);if(el)el.disabled=factoryMode==='free';}
    const image=$('osImageCount');if(image){image.disabled=factoryMode==='free'||factoryMode==='idea_bank'||factoryMode==='daily_topics';image.title=(factoryMode==='idea_bank'||factoryMode==='daily_topics')?'주제 발굴 모드에서는 고정 장수 대신 각 주제별 이미지 콘셉트를 제안합니다.':'';}
    const buildLabel=$('osBuildPromptLabel');if(buildLabel)buildLabel.textContent=modeActionLabel();
    const auto=$('osAutoDaily');if(auto)auto.disabled=factoryMode==='free';
    renderFactoryPipeline();updateAutoDailyStatus();
  }
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function localDateKey(){const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;}
  function localDateLabel(){try{return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'short'}).format(new Date());}catch(_){return localDateKey();}}
  function stableHash(text){let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function dailyAngle(){const key=localDateKey(),seed=$('osTask')?.value.trim()||'';return DAILY_ANGLES[stableHash(key+'|'+seed)%DAILY_ANGLES.length];}
  function seoulDateKey(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(_){return localDateKey();}}
  function normalizeDailyEngineData(value){
    if(!value||typeof value!=='object')return null;
    const topics=Array.isArray(value.topics)?value.topics.slice(0,20).map((topic,index)=>({
      id:String(topic?.id||`topic-${index+1}`),rank:Number(topic?.rank)||index+1,top3:topic?.top3===true||(Number(topic?.rank)||index+1)<=3,
      title:String(topic?.title||'').trim().slice(0,160),category:String(topic?.category||'일반').trim().slice(0,60),
      whyNow:String(topic?.whyNow||'').trim().slice(0,320),searchIntent:String(topic?.searchIntent||'').trim().slice(0,260),
      angle:String(topic?.angle||'').trim().slice(0,320),researchNeed:String(topic?.researchNeed||'').trim().slice(0,360),
      imageConcept:String(topic?.imageConcept||'').trim().slice(0,320),priorityScore:Math.max(0,Math.min(100,Number(topic?.priorityScore)||0))
    })).filter(topic=>topic.title):[];
    return{schemaVersion:Number(value.schemaVersion)||1,status:String(value.status||''),date:String(value.date||''),timezone:String(value.timezone||'Asia/Seoul'),generatedAtLocal:String(value.generatedAtLocal||''),model:String(value.model||''),engine:String(value.engine||''),webSearchUsed:value.webSearchUsed===true,summary:String(value.summary||'').trim().slice(0,500),topics};
  }
  function dailyEngineGeneratedLabel(data){
    if(!data?.generatedAtLocal)return data?.date||'준비 시각 없음';
    const match=data.generatedAtLocal.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);return match?`${match[1].slice(5).replace('-', '월 ')}일 ${match[2]}:${match[3]} 준비`:data.generatedAtLocal;
  }
  function renderDailyEngine(){
    const box=$('osDailyTopics'),empty=$('osDailyEngineEmpty'),status=$('osDailyEngineStatus'),summary=$('osDailyEngineSummary'),meta=$('osDailyEngineMeta'),copy=$('osCopyDailyTopics');if(!box)return;
    box.textContent='';const data=dailyEngineData,topics=data?.topics||[],today=seoulDateKey(),isToday=!!data?.date&&data.date===today&&data.status==='ready'&&topics.length>0;
    if(copy)copy.disabled=!topics.length;
    if(!topics.length){if(empty)empty.hidden=false;if(status)status.textContent=dailyEngineLoading?'확인 중…':'준비 전';if(summary)summary.textContent=data?.summary||'오늘의 주제가 아직 준비되지 않았습니다.';if(meta)meta.textContent='잠시 후 다시 확인하거나 아래에서 직접 주제 프롬프트를 만들어 보세요.';return;}
    if(empty)empty.hidden=true;if(status)status.textContent=isToday?`오늘 ${topics.length}개 준비`:`지난 데이터 · ${data.date||'날짜 없음'}`;
    if(summary)summary.textContent=isToday?(data.summary||'오늘 작성할 주제를 우선순위대로 준비했습니다.'):`${data.date||'이전 날짜'}에 준비된 주제입니다. 오늘 새 주제가 준비되기 전까지 참고용으로 사용할 수 있습니다.`;
    if(meta)meta.textContent=`${dailyEngineGeneratedLabel(data)} · ${data.webSearchUsed?'최신 정보 확인 포함 · ':''}TOP 3 우선 추천`;
    topics.slice(0,10).forEach((topic,index)=>{
      const card=document.createElement('article');card.className=`osDailyTopic${topic.top3?' top3':''}`;card.dataset.dailyTopicIndex=String(index);
      const top=document.createElement('div');top.className='osDailyTopicTop';
      const rank=document.createElement('span');rank.className='osDailyTopicRank';rank.textContent=topic.top3?`TOP ${topic.rank}`:`${topic.rank}`;
      const category=document.createElement('span');category.className='osDailyTopicCategory';category.textContent=topic.category;
      const score=document.createElement('span');score.className='osDailyTopicScore';score.textContent=topic.priorityScore?`우선 ${topic.priorityScore}`:'';top.append(rank,category,score);
      const title=document.createElement('h3');title.textContent=topic.title;const why=document.createElement('p');why.textContent=topic.whyNow||'오늘 작성 이유는 본문 조사 단계에서 확인합니다.';
      const dl=document.createElement('dl');for(const [label,value] of [['검색 의도',topic.searchIntent],['각도',topic.angle],['확인',topic.researchNeed],['이미지',topic.imageConcept]]){if(!value)continue;const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;dl.append(dt,dd);}
      const actions=document.createElement('div');actions.className='osDailyTopicActions';const use=document.createElement('button');use.type='button';use.className='mini';use.dataset.dailyTopicUse=String(index);use.textContent='이 주제로 글 프롬프트';actions.appendChild(use);
      card.append(top,title,why,dl,actions);box.appendChild(card);
    });
  }
  async function loadDailyEngine(){
    if(dailyEngineLoading)return dailyEngineData;dailyEngineLoading=true;renderDailyEngine();
    try{const joiner=REMOTE_DAILY_PATH.includes('?')?'&':'?';const response=await fetch(`${REMOTE_DAILY_PATH}${joiner}v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(String(response.status));dailyEngineData=normalizeDailyEngineData(await response.json());}
    catch(_){dailyEngineData=null;}finally{dailyEngineLoading=false;renderDailyEngine();}return dailyEngineData;
  }
  function dailyTopicToTask(topic){return[topic.title,topic.angle?`작성 방향: ${topic.angle}`:'',topic.searchIntent?`검색 의도: ${topic.searchIntent}`:'',topic.whyNow?`오늘 추천 이유: ${topic.whyNow}`:'',topic.researchNeed?`본문 전에 확인할 항목: ${topic.researchNeed}`:''].filter(Boolean).join('\n');}
  function useDailyTopic(index){
    const topic=dailyEngineData?.topics?.[Number(index)];if(!topic)return false;selectFactoryMode('daily_one',{remember:true});const task=$('osTask');if(task)task.value=dailyTopicToTask(topic);if(autoDaily)rememberDailySeed();invalidatePreparedOutput();syncSimpleState();updateAutoDailyStatus();requestAnimationFrame(()=>{task?.scrollIntoView({behavior:preferredScrollBehavior(),block:'center'});try{task?.focus({preventScroll:true});}catch(_){task?.focus();}});showToast('자동 주제를 오늘 1편 생산 모드로 가져왔습니다.');return true;
  }
  async function copyDailyTopics(){
    const data=dailyEngineData,topics=data?.topics||[];if(!topics.length)return false;const lines=[`# ${data.date||seoulDateKey()} 블로그 팩토리 오늘의 주제`,'',...topics.slice(0,10).map((topic,index)=>`${topic.top3?'★ ':' '}${index+1}. ${topic.title}${topic.searchIntent?` — ${topic.searchIntent}`:''}`)];const copied=await writeClipboard(lines.join('\n'));showToast(copied?'오늘의 주제 10개를 복사했습니다.':'자동 복사가 차단되었습니다.');return copied;
  }
  function factoryStagesForMode(mode){
    if(mode==='daily_topics')return[
      '소재: 관심 범위 안에서 오늘 검색·저장·공유할 이유가 있는 후보를 폭넓게 만든다.',
      '시기성: 계절·요일·행사·생활 주기를 보되 억지로 최신 이슈에 끼워 맞추지 않는다.',
      '검색 의도: 정보 탐색·비교·준비·문제 해결 등 독자가 실제로 찾을 이유를 한 줄로 정의한다.',
      '차별화: 흔한 대주제라도 구체적 독자·상황·질문으로 좁혀 서로 다른 각도를 만든다.',
      '이미지: 각 주제에 대표 이미지 또는 본문 장면 콘셉트를 1개씩 제안한다.',
      '선정: 오늘 작성 가치가 높은 TOP 3를 우선순위와 이유와 함께 고른다.'
    ];
    if(mode==='idea_bank')return[
      '소재: 관심 범위와 이미 쓴 소재를 바탕으로 중복 가능성을 낮춘다.',
      '조사: 현재성 확인이 필요한 항목을 분리한다.',
      '각도: 독자와 검색 의도를 다르게 잡아 20개가 서로 겹치지 않게 한다.',
      '우선순위: 작성 가치와 준비 난이도를 기준으로 정렬한다.',
      '이미지: 각 소재에 대표 이미지 콘셉트를 한 줄씩 붙인다.',
      '큐: 상위 7개를 다음 7일 작성 큐로 정리한다.'
    ];
    return[...(compiler.blogFactory?.stages||FALLBACK_COMPILER.blogFactory.stages)];
  }
  function routeSummary(pack){
    const names={BLOG:'블로그',INSTAGRAM:'인스타그램',YOUTUBE:'유튜브/쇼츠',PRODUCT:'제품/사업',GENERAL:'일반'},d=pack.route.deliverables||[],f=pack.factory;
    return[
      `기준일: ${pack.localDate}`,
      f&&f.mode==='daily_topics'?`오늘 탐색 각도: ${pack.automation.dailyAngle}`:'',
      f&&f.mode!=='free'?`생산 모드: ${f.label}`:'',
      f&&f.mode!=='free'?`글 유형: ${f.blogTypeLabel} · 조사: ${f.researchLabel} · ${factoryImageSummary(f)}`:'',
      `분류: ${names[pack.route.channel]||pack.route.channel}`,
      `의도: ${pack.route.intent}`,
      `품질 모드: ${pack.route.workforceMode}${pack.route.contributions?` · ${pack.route.contributions}`:''}`,
      `출력 언어: ${pack.route.outputLanguage==='ko'?'한국어':pack.route.outputLanguage}`,
      d.length?`결과 형식: ${d.join(', ')}`:'',
      `컴파일 규칙: 공통 ${pack.compiler.commonRuleCount} + 채널 ${pack.compiler.channelRuleCount} + 품질 1${f&&f.mode!=='free'?` + Factory ${pack.compiler.factoryStageCount}`:''}`,
      '',`긴 OS 원문 전체를 붙이지 않고 이번 작업에 필요한 실행 규칙만 압축합니다.`
    ].filter(Boolean).join('\n');
  }
  function buildTaskPackSync(){
    const task=$('osTask')?.value.trim()||'';
    if(!task)throw new Error(factoryMode==='free'?'원하는 작업을 먼저 적어주세요.':'관심 분야나 주제 씨앗을 먼저 적어주세요.');
    if(task.length>MAX_TASK_CHARS)throw new Error('20만 자가 넘는 요청은 브라우저가 느려질 수 있어 준비하지 않았습니다. 요청을 나눠서 사용해 주세요.');
    let route=routeTask(task,$('osMode')?.value||'auto');const factory=getFactorySettings();
    if(factory.mode!=='free'){
      if(factory.audience.length>CONTEXT_LIMITS.audience)throw new Error(`독자 설명은 ${CONTEXT_LIMITS.audience}자 이하로 줄여주세요.`);
      if(factory.facts.length>CONTEXT_LIMITS.facts)throw new Error(`실제 경험/사실은 ${CONTEXT_LIMITS.facts.toLocaleString('ko-KR')}자 이하로 나눠서 사용해 주세요.`);
      if(factory.avoidTopics.length>CONTEXT_LIMITS.avoidTopics)throw new Error(`중복 방지 메모는 ${CONTEXT_LIMITS.avoidTopics.toLocaleString('ko-KR')}자 이하로 나눠서 사용해 주세요.`);
      const requestedMode=$('osMode')?.value||'auto';route={...route,channel:'BLOG',intent:'CREATE',deliverables:factoryDeliverables(factory)||['naver_blog_post']};
      if(requestedMode==='auto'&&route.workforceMode!=='QUICK'){route.workforceMode='CREATOR_10';route.contributions='10 perspectives';}
    }
    const profile=getProfile(),channel=selectedChannel(route),commonRules=[...(compiler.commonRules||[])],channelRules=[...(channel.rules||[])],effort=qualityRule(route),factoryStages=factory.mode==='free'?[]:factoryStagesForMode(factory.mode),naturalnessRules=[...(compiler.blogFactory?.naturalnessRules||FALLBACK_COMPILER.blogFactory.naturalnessRules)];
    return{
      schemaVersion:3,createdAt:new Date().toISOString(),localDate:localDateLabel(),dailyKey:localDateKey(),
      os:{name:manifest.name,version:manifest.version,compiler:compiler.name||'AI Cleaner Blog Factory Compiler',compilerVersion:compiler.version||'1.2',mode:'LOCAL_PROMPT_FACTORY',defaultLanguage:manifest.defaultLanguage||'ko',portableZip:manifest.portableZip},
      task,route,factory,automation:{autoDaily,dailyKey:localDateKey(),dailyAngle:dailyAngle(),method:'local-date prompt preparation'},
      boundaries:{controlPlaneIsNotContent:true,userContentIsContentPlane:true,neverInventExperience:true,doNotExposeInternalDeliberationByDefault:true,defaultUserFacingLanguage:route.outputLanguage,detectorEvasionOptimization:false},
      userProfile:(profile.displayName||Object.keys(profile.preferences).length)?profile:undefined,
      compiler:{commonRules,channelRules,effortRule:effort,outputContract:outputContractFor(factory,channel),channelLabel:channel.label||route.channel,commonRuleCount:commonRules.length,channelRuleCount:channelRules.length,factoryStages,naturalnessRules,factoryStageCount:factoryStages.length},
      delivery:{method:'copy_only',apiKeyRequiredByDefault:false,providerLaunch:false}
    };
  }
  async function buildTaskPack(signal){if(!compilerReady)await ensureAssets(signal);return buildTaskPackSync();}
  function factoryOutputContract(pack){
    const f=pack.factory,images=Number(f.imageCount)||0;
    if(f.mode==='daily_topics')return[
      '- 완성 본문은 쓰지 말고 오늘 작성 후보 10개를 만든다.',
      '- 각 후보는 번호, 제목 방향, 핵심 키워드, 검색 의도, 지금 쓸 이유, 차별화 각도, 확인이 필요한 사실, 이미지 콘셉트를 짧게 적는다.',
      '- 검색량이나 인기 수치를 실제 확인하지 않았다면 숫자를 만들어내지 않는다.',
      '- 10개 중 오늘 작성 가치가 높은 TOP 3를 다시 선정하고 1순위에는 선택 이유를 2~3문장으로 붙인다.',
      '- 이미 쓴 소재 메모가 있으면 제목만 바꾼 유사 주제는 제외한다.'
    ];
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
    if(f.mode==='daily_topics')return'완성 이미지 패키지는 만들지 않는다. 오늘의 주제 10개 각각에 어울리는 대표 이미지 또는 본문 장면 콘셉트를 짧게 제안한다.';
    if(f.mode==='idea_bank')return'완성 이미지 패키지는 만들지 않는다. 소재 20개 각각에 어울리는 이미지 콘셉트 또는 대표 장면 방향을 짧게 제안한다.';
    const count=Number(f.imageCount)||0;if(!count)return'이번 요청은 이미지 패키지를 만들지 않는다.';const scope=f.mode==='batch_three'?'각 글마다 ':'';
    return`${scope}이미지 ${count}장 패키지를 설계한다. 현재 AI 환경에 실제 이미지 생성 기능이 있고 실행이 가능하면 이미지를 생성할 수 있다. 그렇지 않으면 생성했다고 주장하지 말고, 각 장의 상세 제작 프롬프트·구도·비율·본문 위치·캡션·ALT를 납품한다.`;
  }
  function taskPackToMarkdown(pack){
    const c=pack.compiler,profile=pack.userProfile,d=pack.route.deliverables||[],f=pack.factory||{mode:'free'};
    const title=f.mode==='daily_topics'?'# BLOG FACTORY — TODAY TOPIC PROMPT':'# BLOG FACTORY — EXECUTION PROMPT';
    const lines=[title,'',`> ${pack.os.compiler} V${pack.os.compilerVersion} · ${pack.os.name} V${pack.os.version}`,'','## 1. 사용자 입력',pack.task,'','## 2. 실행 계약','- 아래 규칙은 작업 방법이다. 규칙 자체를 최종 콘텐츠의 소재로 쓰지 마라.','- 요청받은 실제 결과물을 먼저 제공하고 불필요한 내부 검토 설명은 생략하라.',`- 최종 출력 언어: ${pack.route.outputLanguage}`,'- 사용자에게 없는 경험·구매·방문·가족 반응·효과를 실제 경험처럼 만들지 마라.','','## 3. 자동 분류',`- 작업 채널: ${c.channelLabel} (${pack.route.channel})`,`- 작업 의도: ${pack.route.intent}`,`- 품질 모드: ${pack.route.workforceMode}`,d.length?`- 요청 결과 형식: ${d.join(', ')}`:'','','## 4. 공통 핵심 규칙',...c.commonRules.map(rule=>`- ${rule}`),'',`## 5. ${c.channelLabel} 전용 규칙`,...c.channelRules.map(rule=>`- ${rule}`),'','## 6. 품질 점검 방식',`- ${c.effortRule}`,'',profile?'## 7. 사용자 기본 설정':'',profile?.displayName?`- 표시 이름: ${profile.displayName}`:'',profile&&Object.keys(profile.preferences||{}).length?Object.entries(profile.preferences).map(([k,v])=>`- ${k}: ${v}`).join('\n'):'',profile?'':'','## 8. 최종 출력 계약',`- ${c.outputContract||'사용자가 요구한 형식의 완성 결과물을 먼저 제공한다.'}`,'- 사실이 필요한데 현재 요청에 근거가 없으면 경험을 꾸미지 말고, 필요한 경우 가정 또는 확인 필요 항목으로 분리하라.',''];
    if(f.mode!=='free'){
      const modeProfile=getFactoryModeProfile(f.mode);
      lines.push('## 9. BLOG FACTORY 생산 카드',`- 기준 날짜: ${pack.localDate}`,f.mode==='daily_topics'?`- 오늘의 탐색 각도: ${pack.automation.dailyAngle}`:'',`- 생산 모드: ${f.label}`,`- 모드 지시: ${modeProfile.instruction}`,`- 글 유형: ${f.blogTypeLabel}`,`- 목표 독자: ${f.audience||'요청 내용에서 합리적으로 추론하되 임의의 개인 사실은 만들지 않는다.'}`,`- 최신 정보 조사: ${f.researchLabel}`,`- ${factoryImageSummary(f)}`,f.facts?`- USER FACT / 실제 경험:\n${f.facts}`:'- USER FACT / 실제 경험: 별도 제공 없음. 1인칭 체험을 임의 생성하지 않는다.',f.avoidTopics?`- 중복 방지 / 피할 소재:\n${f.avoidTopics}`:'- 중복 방지 메모: 별도 제공 없음.','','## 10. BLOG FACTORY 생산 파이프라인',...c.factoryStages.map((rule,i)=>`${i+1}. ${rule}`),'','## 11. 조사 경계',`- ${researchRule(f)}`,'- 웹에서 찾은 정보가 있으면 사실과 출처 성격을 구분하고, 확인되지 않은 검색량·인기·효과를 숫자로 꾸미지 않는다.','','## 12. 자연스러움 편집',...c.naturalnessRules.map(rule=>`- ${rule}`),'','## 13. 이미지 제작 계약',`- ${imageRule(f)}`,'- 사진 속에 실제로 존재하지 않는 사용자 경험이나 제품 사용 장면을 사실 증거처럼 설명하지 않는다.','','## 14. 이번 모드의 납품 형식',...factoryOutputContract(pack),'');
    }
    lines.push('## 실행','이제 위 규칙을 내부 작업 기준으로 적용해 사용자 요청을 완료하라. OS나 프롬프트 구조를 설명하지 말고 실제 결과부터 작성하라.');
    return lines.filter((v,i,a)=>v!==''||a[i-1]!=='').join('\n').trim();
  }
  function compilerSummary(pack){
    if(pack.factory?.mode==='daily_topics')return`${pack.factory.label} · ${pack.automation.dailyAngle} · 주제 10개 + TOP 3 · ${pack.factory.researchLabel} 조사 경계 · Truth Guard`;
    if(pack.factory?.mode&&pack.factory.mode!=='free')return`${pack.factory.label} · ${pack.compiler.channelLabel} Creator-10 · ${pack.factory.researchLabel} 조사 · ${factoryImageSummary(pack.factory)} · Truth Guard`;
    const totalRules=pack.compiler.commonRuleCount+pack.compiler.channelRuleCount+1;return`${pack.compiler.channelLabel}로 자동 분류 · 핵심 규칙 ${totalRules}개 적용 · 복사용 실행 프롬프트로 정리했습니다.`;
  }
  function appliedRuleLabels(pack){
    const effort={QUICK:'빠른 완성',STANDARD_PLUS:'표준 품질 검수',CREATOR_10:'Creator-10',ENTERPRISE:'다부서 관점 검수',GRAND_CHALLENGE:'전주기 심층 검수'},labels=[];
    if(pack.factory?.mode==='daily_topics')labels.push('오늘의 주제','10개 후보 → TOP 3',pack.automation.dailyAngle);
    else if(pack.factory?.mode&&pack.factory.mode!=='free')labels.push(pack.factory.label,pack.factory.mode==='idea_bank'?'소재→우선순위→7일 큐':'소재→글→이미지');
    labels.push(`자동 분류 · ${pack.compiler.channelLabel}`,'사실성 보호','결과물 우선',effort[pack.route.workforceMode]||pack.route.workforceMode);return labels.filter(Boolean);
  }
  function renderAppliedChips(pack){const box=$('osAppliedChips');if(!box)return;box.textContent='';for(const label of appliedRuleLabels(pack)){const chip=document.createElement('span');chip.textContent=label;box.appendChild(chip);}}
  function dailySignature(){
    const f=getFactorySettings(),profile=getProfile();
    return String(stableHash(JSON.stringify({seed:$('osTask')?.value.trim()||'',blogType:f.blogType,audience:f.audience,researchMode:f.researchMode,profile})));
  }
  function rememberTodayCache(pack,markdown){
    if(!storage||!autoDaily||pack.factory?.mode!=='daily_topics'||pack.factory.facts||pack.factory.avoidTopics)return;
    try{storage.setItem(DAILY_CACHE_KEY,JSON.stringify({date:pack.dailyKey,seed:pack.task,signature:dailySignature(),markdown,createdAt:pack.createdAt}));}catch(_){}
  }
  function readTodayCache(){
    if(!storage||!autoDaily)return null;
    try{const raw=storage.getItem(DAILY_CACHE_KEY);if(!raw)return null;const value=JSON.parse(raw);if(value?.date!==localDateKey()||value?.signature!==dailySignature())return null;return value;}catch(_){return null;}
  }
  function renderPrepared(pack,markdown,{scroll=true,cache=true}={}){
    currentPack=pack;currentMarkdown=markdown;const summary=$('osRouteSummary'),preview=$('osTaskPackPreview'),wrap=$('osTaskPackResult'),compilerInfo=$('osCompilerSummary'),ready=$('osReadyMessage');
    if(summary)summary.textContent=routeSummary(pack);if(preview)preview.value=markdown;if(compilerInfo)compilerInfo.textContent=compilerSummary(pack);renderAppliedChips(pack);
    if(ready)ready.textContent=pack.factory?.mode==='daily_topics'?'오늘의 주제 발굴 프롬프트가 준비됐습니다.':pack.factory?.mode&&pack.factory.mode!=='free'?`${pack.factory.label}용 프롬프트가 준비됐습니다.`:'실행 프롬프트가 준비됐습니다.';
    const after=$('osAfterSend');if(after)after.textContent='아래 프롬프트를 확인한 뒤 복사하세요. 사용할 AI나 작성 도구는 직접 선택하면 됩니다.';
    if(wrap){wrap.hidden=false;if(scroll)requestAnimationFrame(()=>wrap.scrollIntoView({behavior:preferredScrollBehavior(),block:'nearest'}));}
    if(cache)rememberTodayCache(pack,markdown);syncSimpleState();updateAutoDailyStatus();
  }
  function invalidatePreparedOutput(){
    if(busy){seq++;prepareAbort?.abort();prepareAbort=null;busy=false;}currentMarkdown='';currentPack=null;const wrap=$('osTaskPackResult');if(wrap)wrap.hidden=true;const preview=$('osTaskPackPreview');if(preview)preview.value='';const compilerInfo=$('osCompilerSummary');if(compilerInfo)compilerInfo.textContent='';const chips=$('osAppliedChips');if(chips)chips.textContent='';syncSimpleState();
  }
  function updateAutoDailyStatus(){
    const toggle=$('osAutoDaily'),status=$('osAutoDailyStatus');if(toggle)toggle.checked=autoDaily;if(!status)return;
    if(!autoDaily){status.textContent='꺼짐 · 켜두면 새 날짜 첫 실행 때 복사용 주제 프롬프트를 자동으로 준비합니다.';return;}
    if(!$('osTask')?.value.trim()){status.textContent='켜짐 · 관심 분야를 입력하면 자동 준비가 시작됩니다.';return;}
    const cached=readTodayCache();status.textContent=cached?'켜짐 · 오늘 프롬프트가 이미 준비되어 있습니다. 날짜가 바뀌면 다음 프롬프트를 자동 준비합니다.':'켜짐 · 오늘 날짜 기준 프롬프트를 자동 준비합니다. 브라우저를 닫아둔 동안에는 실행되지 않습니다.';
  }
  function syncSimpleState(){
    const hasTask=!!$('osTask')?.value.trim(),status=$('osPrepareStatus'),build=$('osBuildPrompt');if(build)build.disabled=busy||!hasTask;
    for(const id of ['osCopyPack','osDownloadPack']){const b=$(id);if(b)b.disabled=busy||!currentMarkdown;}
    if(status)status.textContent=busy?'오늘 기준 실행 규칙과 프롬프트를 정리하고 있습니다…':hasTask?'버튼을 누르면 프롬프트를 이 화면에 바로 보여줍니다.':(factoryMode==='free'?'원하는 작업을 먼저 적어주세요.':'관심 분야나 주제 씨앗을 먼저 적어주세요.');
    $('writingTool')?.setAttribute('aria-busy',busy?'true':'false');
  }
  function setBusy(next){busy=!!next;syncSimpleState();}
  function preferredScrollBehavior(){try{return root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth';}catch(_){return'auto';}}
  async function preparePrompt({scroll=true,automatic=false}={}){
    const token=++seq;prepareAbort?.abort();currentMarkdown='';currentPack=null;const controller=new AbortController();prepareAbort=controller;const lockName=`blog-factory-${token}`;workLock?.acquire?.(lockName,{kind:'compile'});setBusy(true);
    try{const pack=await buildTaskPack(controller.signal);if(token!==seq||!active||controller.signal.aborted)return null;const markdown=taskPackToMarkdown(pack);renderPrepared(pack,markdown,{scroll,cache:true});if(autoDaily)rememberDailySeed();showToast(automatic?'오늘의 주제 프롬프트를 자동으로 준비했습니다.':'복사용 프롬프트를 만들었습니다.');return pack;}
    catch(error){if(controller.signal.aborted||token!==seq||!active)return null;throw error;}
    finally{workLock?.release?.(lockName);if(prepareAbort===controller)prepareAbort=null;if(token===seq)setBusy(false);}
  }
  async function ensureMarkdown(){if(currentMarkdown&&$('osTaskPackPreview')?.value===currentMarkdown)return currentMarkdown;const pack=await preparePrompt();return pack?currentMarkdown:'';}
  function legacyClipboardCopy(text){
    let area=null;try{if(!document?.body||typeof document.createElement!=='function'||typeof document.execCommand!=='function')return false;area=document.createElement('textarea');area.value=String(text??'');area.setAttribute('readonly','');area.setAttribute('aria-hidden','true');area.style.position='fixed';area.style.opacity='0';area.style.pointerEvents='none';area.style.left='-9999px';document.body.appendChild(area);area.focus();area.select();return document.execCommand('copy')===true;}catch(_){return false;}finally{try{area?.remove();}catch(_){}}}
  async function modernClipboardCopy(text){const n=root.navigator||(typeof navigator!=='undefined'?navigator:null);if(typeof n?.clipboard?.writeText!=='function')return false;try{await n.clipboard.writeText(text);return true;}catch(_){return false;}}
  async function writeClipboard(text){if(legacyClipboardCopy(text))return true;if(await modernClipboardCopy(text))return true;return false;}
  function focusManualCopy(){const target=$('osTaskPackPreview');if(!target)return;try{try{target.focus({preventScroll:true});}catch(_){target.focus();}target.select();}catch(_){} }
  async function copyMarkdown(){const md=await ensureMarkdown();if(!md)return false;const copied=await writeClipboard(md);if(!copied)focusManualCopy();showToast(copied?'프롬프트를 복사했습니다.':'자동 복사가 차단됐습니다. 프롬프트가 선택되어 있으니 직접 복사해 주세요.');return copied;}
  function downloadText(name,text,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}}
  async function downloadMarkdown(){const md=await ensureMarkdown();if(md)downloadText(factoryMode==='daily_topics'?`BLOG_FACTORY_TOPICS_${localDateKey()}.md`:factoryMode==='free'?'BLOG_FACTORY_PROMPT.md':'BLOG_FACTORY_PRODUCTION_PROMPT.md',md,'text/markdown;charset=utf-8');}
  function downloadOsZip(){const href=`${assetBase}/os/releases/${encodeURIComponent(manifest.portableZip||FALLBACK_MANIFEST.portableZip)}`,a=document.createElement('a');a.href=href;a.download=manifest.portableZip||FALLBACK_MANIFEST.portableZip;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();}}
  function clearTask(){
    seq++;prepareAbort?.abort();prepareAbort=null;currentMarkdown='';currentPack=null;for(const id of ['osTask','osFacts','osAvoidTopics'])if($(id))$(id).value='';
    if(storage){try{storage.removeItem?.(DAILY_SEED_KEY);storage.removeItem?.(DAILY_CACHE_KEY);}catch(_){}}
    if($('osRouteSummary'))$('osRouteSummary').textContent='블로그 팩토리가 요청을 분석하면 생산 모드·적용 규칙·출력 패키지를 여기에 표시합니다.';
    if($('osTaskPackPreview'))$('osTaskPackPreview').value='';if($('osTaskPackResult'))$('osTaskPackResult').hidden=true;if($('osCompilerSummary'))$('osCompilerSummary').textContent='';if($('osAppliedChips'))$('osAppliedChips').textContent='';setBusy(false);updateAutoDailyStatus();$('osTask')?.focus();
  }
  function selectFactoryMode(next,{remember=true}={}){
    if(!['daily_topics','daily_one','batch_three','idea_bank','free'].includes(next))return false;if(factoryMode===next){renderFactoryModes();return true;}factoryMode=next;if(remember)rememberFactory();invalidatePreparedOutput();renderFactoryModes();syncSimpleState();return true;
  }
  async function restoreOrPrepareToday(){
    if(!autoDaily||!active)return false;const seed=$('osTask')?.value.trim()||'';if(!seed){updateAutoDailyStatus();return false;}if(factoryMode==='free')factoryMode='daily_topics';renderFactoryModes();
    const cached=readTodayCache();if(cached&&cached.seed===seed&&cached.markdown){const pack=buildTaskPackSync();renderPrepared(pack,cached.markdown,{scroll:false,cache:false});showToast('오늘 준비해둔 주제 프롬프트를 불러왔습니다.');return true;}
    await preparePrompt({scroll:false,automatic:true});return true;
  }
  function bind(){
    $('osBuildPrompt')?.addEventListener('click',()=>preparePrompt().catch(e=>showToast(e.message)));
    $('osCopyPack')?.addEventListener('click',()=>copyMarkdown().catch(e=>showToast(e.message)));
    $('osDownloadPack')?.addEventListener('click',()=>downloadMarkdown().catch(e=>showToast(e.message)));
    $('osDownloadZip')?.addEventListener('click',downloadOsZip);
    $('osCopyDailyTopics')?.addEventListener('click',()=>copyDailyTopics().catch(e=>showToast(e.message)));
    $('osDailyTopics')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-daily-topic-use]');if(b)useDailyTopic(b.dataset.dailyTopicUse);});
    $('osSavePrefs')?.addEventListener('click',()=>{invalidatePreparedOutput();saveProfile();});
    $('osClearTask')?.addEventListener('click',clearTask);
    $('osTask')?.addEventListener('input',()=>{if(autoDaily)rememberDailySeed();invalidatePreparedOutput();updateAutoDailyStatus();});
    $('osTask')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!$('osBuildPrompt')?.disabled){e.preventDefault();void preparePrompt().catch(err=>showToast(err.message));}});
    $('osFactoryPresets')?.addEventListener('click',e=>{const b=e.target.closest?.('[data-factory-mode]');if(b)selectFactoryMode(b.dataset.factoryMode);});
    $('osAutoDaily')?.addEventListener('change',e=>setAutoDaily(!!e.target.checked,{prepareNow:!!e.target.checked}));
    for(const id of ['osBlogType','osAudience','osResearchMode','osImageCount'])$(id)?.addEventListener(id==='osAudience'?'input':'change',()=>{rememberFactory();invalidatePreparedOutput();});
    for(const id of ['osFacts','osAvoidTopics'])$(id)?.addEventListener('input',invalidatePreparedOutput);
    $('osMode')?.addEventListener('change',invalidatePreparedOutput);$('osDisplayName')?.addEventListener('input',invalidatePreparedOutput);$('osPreferences')?.addEventListener('input',invalidatePreparedOutput);
  }
  function applyRestoredState(value){
    if(!value||typeof value!=='object')return false;if($('osTask'))$('osTask').value=String(value.task||'');if($('osMode'))$('osMode').value=['auto','quick','creator_10','enterprise','grand_challenge'].includes(String(value.mode))?String(value.mode):'auto';
    if(['daily_topics','daily_one','batch_three','idea_bank','free'].includes(String(value.factoryMode)))factoryMode=String(value.factoryMode);
    if($('osBlogType')&&BLOG_TYPE_LABELS[String(value.blogType)])$('osBlogType').value=String(value.blogType);if($('osAudience'))$('osAudience').value=String(value.audience||'').slice(0,CONTEXT_LIMITS.audience);
    if($('osResearchMode')&&RESEARCH_LABELS[String(value.researchMode)])$('osResearchMode').value=String(value.researchMode);if($('osImageCount')&&['0','3','5','7'].includes(String(value.imageCount)))$('osImageCount').value=String(value.imageCount);
    if($('osFacts'))$('osFacts').value=String(value.facts||'').slice(0,CONTEXT_LIMITS.facts);if($('osAvoidTopics'))$('osAvoidTopics').value=String(value.avoidTopics||'').slice(0,CONTEXT_LIMITS.avoidTopics);if(typeof value.autoDaily==='boolean')autoDaily=value.autoDaily;
    invalidatePreparedOutput();if(initialized){renderFactoryModes();syncSimpleState();updateAutoDailyStatus();}return true;
  }
  async function init(){
    if(initialized)return;initialized=true;bind();await ensureAssets();loadStoredProfile();if(pendingRestoreState){const value=pendingRestoreState;pendingRestoreState=null;applyRestoredState(value);}renderFactoryModes();if($('osStatus'))$('osStatus').textContent='오늘 주제 + 프롬프트 준비 완료';
    if($('osStaticMode'))$('osStaticMode').textContent='오늘의 주제 자동 준비 · V7 Blog Factory';syncSimpleState();updateAutoDailyStatus();void loadDailyEngine();
  }
  function captureState(){const f=getFactorySettings();return{task:$('osTask')?.value||'',mode:$('osMode')?.value||'auto',factoryMode:f.mode,blogType:f.blogType,audience:f.audience,researchMode:f.researchMode,imageCount:f.imageCount,facts:f.facts,avoidTopics:f.avoidTopics,autoDaily};}
  function restoreState(value){if(!value||typeof value!=='object')return false;if(!initialized){pendingRestoreState={...value};return true;}return applyRestoredState(value);}
  async function activate(){active=true;await init();renderFactoryModes();syncSimpleState();updateAutoDailyStatus();await Promise.allSettled([loadDailyEngine(),restoreOrPrepareToday()]);}
  function deactivate(){active=false;seq++;prepareAbort?.abort();prepareAbort=null;setBusy(false);}
  return{init,activate,deactivate,captureState,restoreState,routeTask,buildTaskPack,buildTaskPackSync,taskPackToMarkdown,preparePrompt,copyMarkdown,copyDailyTopics,loadDailyEngine,useDailyTopic,selectFactoryMode,setAutoDaily,get factoryMode(){return factoryMode;},get autoDaily(){return autoDaily;},get dailyEngineData(){return dailyEngineData;},get manifest(){return manifest;},get compiler(){return compiler;},get currentPack(){return currentPack;}};
};
})();
