import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'js/core/event-bus.js','js/core/history-store.js','js/core/work-lock.js','js/core/text-utils.js',
  'js/core/state-store.js','js/core/text-engine.js','js/core/diff-engine.js','js/services/analysis-worker-adapter.js','js/services/analysis-performance-governor.js','js/services/analysis-coordinator.js','js/services/update-manager.js',
  'js/ui/panel-manager.js','js/ui/diff-view.js','js/features/file-import.js','js/features/typewriter-engine.js','js/features/result-checkpoint-store.js','js/features/ai-writing-os.js'
];
const queue=[];
const context={
  console,Intl,URL,
  window:{},
  requestAnimationFrame(fn){queue.push(fn);return queue.length;},
  cancelAnimationFrame(){},
  setTimeout,clearTimeout,setInterval,clearInterval,Date,Map,Set,JSON,String,Array,Math,Number,Object,Error,Promise
};
context.window.window=context.window;
vm.createContext(context);
for(const rel of files)vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});
const M=context.window.AICleanerModules;
function assert(ok,msg){if(!ok)throw new Error(msg);}

{
  const bus=M.createEventBus();let n=0;const off=bus.on('x',v=>n+=v);bus.emit('x',2);off();bus.emit('x',2);assert(n===2,'event bus on/off failed');
}
{
  const h=M.createHistoryStore({limit:3,signature:s=>s.value});h.reset({value:'a'});assert(!h.record({value:'a'}),'history duplicate should be ignored');h.record({value:'b'});h.record({value:'c'});h.record({value:'d'});assert(h.entries.length===3&&h.index===2,'history limit/index failed');const snap=h.beginRestore(1);assert(snap.value==='c'&&h.restoring,'history restore failed');h.endRestore();assert(!h.restoring,'history restore end failed');
}
{
  const lock=M.createWorkLock();lock.acquire('typewriter');assert(lock.isLocked()&&lock.isLocked('typewriter'),'work lock acquire failed');lock.release('typewriter');assert(!lock.isLocked(),'work lock release failed');
}
{
  const text='가🙂e\u0301';const parts=M.splitGraphemesExact(text);assert(parts.join('')===text,'grapheme reconstruction failed');assert(M.exactTextEqual(parts.join(''),text),'exact text equality failed');
  const prepared=M.sanitizeVisibleTypingSource('앞\u200B\u00AD\u061C뒤\u00A0끝👩‍💻');assert(prepared.text==='앞뒤 끝👩‍💻','visible typing sanitizer output failed');assert(prepared.removed.length===3,'safe hidden removal count failed');assert(prepared.normalizedSpaces.length===1,'special-space normalization failed');assert(prepared.preservedSensitive.length>=1,'meaning-sensitive Unicode must remain preserved');assert(prepared.policyVersion==='old-v6-layer-a-safe-1.2.2','text hygiene policy version failed');const policy=M.getTextHygienePolicy();assert(policy.legacyV6.length===31,'old-v6 Layer A inventory size failed');const legacyModes=policy.legacyV6.reduce((a,x)=>(a[x.policy]=(a[x.policy]||0)+1,a),{});assert(legacyModes.remove===13&&legacyModes.space===15&&legacyModes.preserve===3,'old-v6 safe policy split failed');assert(M.classifyTextCodePoint('\u200B').name==='ZERO WIDTH SPACE','old-v6 named marker failed');assert(M.classifyTextCodePoint('\u200D').policy==='preserve','ZWJ must be preserved despite legacy delete behavior');
}
{
  const store=M.createTextStateStore();const ref=store.state;store.replace({original:'abc',base:'abc',issueBase:'abc',working:'abc',chars:[],allChars:[],issues:[],applied:new Set(),manual:false,homoglyphs:[],reviews:[],reviewCount:2,reviewVisibleCount:1,reviewTotalSentences:3,reviewsDirty:true,score:99,focusCycles:Object.create(null),issueUnread:false,reviewUnread:false,techUnread:false,analyzeMs:1,reviewOverflow:0});assert(store.state===ref&&store.state.original==='abc','state store must keep stable object identity');const rev=store.revision;store.touch();assert(store.revision===rev+1,'state store revision touch failed');store.reset();assert(store.state===ref&&store.state.original===''&&store.state.score===100&&store.state.reviewVisibleCount===0&&store.state.reviewTotalSentences===0,'state store reset failed');
}
{
  const engine=M.createTextEngine();const meta=engine.reviewMeta(('짧은 문장입니다. '+('가'.repeat(80))+'. 결론적으로 테스트입니다.'),{length:true});assert(meta.candidateCount===2&&meta.visibleCandidateCount===2&&meta.totalSentences===3,'review metadata summary failed');const capped=engine.reviewMeta(('짧은 문장입니다. '+('가'.repeat(80))+'. 결론적으로 테스트입니다.'),{length:true,limit:1});assert(capped.candidateCount===2&&capped.visibleCandidateCount===0&&capped.overflow===2,'review metadata render-cap summary failed');const named=engine.scan('\u200B\u200C\u00A0',{profile:'standard'});assert(named.all[0].name==='ZERO WIDTH SPACE'&&named.all[1].name==='ZERO WIDTH NON-JOINER'&&named.all[2].name==='NO-BREAK SPACE','shared named inventory failed');assert(named.auto.length===2&&named.all[1].auto===false,'shared safe/preserve policy failed');const result=engine.analyze('앞\u200B\u00AD\u061C뒤\u00A0끝👩‍💻',{profile:'standard',repeat:true});assert(result.base==='앞뒤 끝👩‍💻','text engine standard sanitation failed');assert(result.scan.auto.length===4,'text engine auto action count failed');assert(result.scan.all.some(x=>x.type==='의미 민감 문자'),'meaning-sensitive Unicode should be reported');const inspect=engine.scan('A\u200BB',{profile:'inspect'});assert(inspect.clean==='A\u200BB'&&inspect.auto.length===0,'inspect profile should preserve hidden characters');const found=engine.issues('결론적으로 테스트입니다.\n\n\n다음',{repeat:false});assert(found.some(x=>x.cat==='정형 전환어')&&found.some(x=>x.cat==='연속 빈 줄'),'text issue rules failed');assert(engine.reviewSuggestion('결론적으로 **좋습니다**.')==='그래서 좋습니다.','review suggestion failed');assert(engine.codePointLength('가🙂')===2,'code point length failed');
}
{
  const importer=M.createFileImportService({maxBytes:10});assert(importer.rtfToText('{\\rtf1\\ansi 테스트\\par 다음}').includes('테스트\n다음'),'RTF import failed');assert(importer.looksBinary('abc\u0000def'),'binary text detection failed');assert(importer.parse('a.txt','plain')==='plain','plain import failed');let tooLarge=false;try{await importer.read({name:'a.txt',size:11,text:async()=> 'hello'});}catch(e){tooLarge=e.code==='FILE_TOO_LARGE';}assert(tooLarge,'file size guard failed');const ok=await importer.read({name:'a.txt',size:5,text:async()=> 'hello'});assert(ok.text==='hello','file read failed');
}
{
  const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};let replaced='',captured='';const manager=M.createUpdateManager({currentVersion:'1.3.0',storage,locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{replaced=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'1.3.1'})}),captureDraft:v=>(captured=v,{savedAt:100,targetVersion:v,input:'x'}),restoreDraft:()=>{},now:()=>100});const changed=await manager.check();assert(changed&&captured==='1.3.1'&&replaced.includes('__appv=1.3.1'),'update manager reload preparation failed');const draft=manager.takeDraft({maxAgeMs:1000});assert(draft?.input==='x','update draft take failed');assert(manager.compareVersions('1.3.1','1.3.0')===1&&manager.compareVersions('1.2.9','1.3.0')===-1,'semver comparison failed');assert(manager.compareVersions('1.4.0-beta.1','1.4.0')===-1,'prerelease ordering failed');
  let staleReplace='';const stale=M.createUpdateManager({currentVersion:'1.3.1',storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{staleReplace=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'1.2.2'})}),captureDraft:()=>({savedAt:100}),now:()=>100});assert(await stale.check()===false&&!staleReplace,'stale version.json must not trigger downgrade reload');
  let invalidReplace='';const invalid=M.createUpdateManager({currentVersion:'1.3.1',storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{invalidReplace=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'latest'})}),now:()=>100});assert(await invalid.check()===false&&!invalidReplace,'invalid remote version must be ignored');
  let blockedFetch=0;const blocked=M.createUpdateManager({currentVersion:'1.3.1',isBlocked:()=>true,fetchImpl:async()=>{blockedFetch++;return{ok:true,json:async()=>({version:'1.3.2'})};}});assert(await blocked.check()===false&&blockedFetch===0,'blocked update manager must not fetch during active/pending work');

  let storageReload='';const deniedStorage={getItem:()=>null,setItem(){throw new Error('storage blocked');},removeItem:()=>{}};const storageGuard=M.createUpdateManager({currentVersion:'1.3.1',storage:deniedStorage,locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{storageReload=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'1.3.2'})}),captureDraft:()=>({savedAt:100,input:'unsaved'}),now:()=>100});assert(await storageGuard.check()===false&&!storageReload,'update must not reload when draft persistence fails');

  class FakeAbortController{constructor(){this.signal={aborted:false};FakeAbortController.last=this;}abort(){this.signal.aborted=true;}}
  let resolveFetch,lateReplace='';const pendingUpdate=M.createUpdateManager({currentVersion:'1.3.1',AbortControllerCtor:FakeAbortController,storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{lateReplace=u;}},fetchImpl:(_url,options)=>new Promise(resolve=>{assert(options.signal===FakeAbortController.last.signal,'update fetch must receive abort signal');resolveFetch=resolve;}),captureDraft:()=>null,now:()=>100});const pendingCheck=pendingUpdate.check();pendingUpdate.stop();assert(FakeAbortController.last.signal.aborted,'update stop must abort in-flight fetch');resolveFetch({ok:true,json:async()=>({version:'1.3.2'})});assert(await pendingCheck===false&&!lateReplace,'stopped update check must not navigate after late response');

  let replaceAttempts=0;const retryMem=new Map(),retryStorage={getItem:k=>retryMem.get(k)||null,setItem:(k,v)=>retryMem.set(k,v),removeItem:k=>retryMem.delete(k)};const retry=M.createUpdateManager({currentVersion:'1.3.1',storage:retryStorage,locationObj:{href:'http://example.test/ai-cleaner/',replace:()=>{replaceAttempts++;throw new Error('navigation blocked');}},fetchImpl:async()=>({ok:true,json:async()=>({version:'1.3.2'})}),captureDraft:()=>null,now:()=>100});assert(await retry.check()===false&&await retry.check()===false&&replaceAttempts===2,'failed location.replace must clear reload guard so a later update can retry');

  let becameBlocked=false,resolveBlocked,midflightReplace='';const midflight=M.createUpdateManager({currentVersion:'1.3.1',isBlocked:()=>becameBlocked,storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{midflightReplace=u;}},fetchImpl:()=>new Promise(resolve=>{resolveBlocked=resolve;}),captureDraft:()=>null,now:()=>100});const midflightCheck=midflight.check();becameBlocked=true;resolveBlocked({ok:true,json:async()=>({version:'1.3.2'})});assert(await midflightCheck===false&&!midflightReplace,'update must re-check active work after fetch before navigation');
}
{
  const out=[];let completed=null,nextId=0;const frames=new Map();const raf=fn=>{const id=++nextId;frames.set(id,fn);return id;},caf=id=>frames.delete(id);const tick=ts=>{const item=frames.entries().next().value;if(!item)return false;const[id,fn]=item;frames.delete(id);fn(ts);return true;};
  const engine=M.createTypewriterEngine({split:M.splitGraphemesExact,raf,caf});engine.start('가🙂',{getDelay:()=>0,append:p=>out.push(p),onComplete:s=>completed=s});assert(frames.size===1,'typewriter should schedule one frame');engine.pause();assert(frames.size===0&&engine.paused,'paused typewriter must not keep an animation-frame loop');engine.resume();assert(frames.size===1&&!engine.paused,'resume should schedule exactly one frame');let ts=0,guard=0;while(frames.size&&engine.running&&guard++<20)tick(ts+=16);assert(out.join('')==='가🙂','typewriter incremental append failed');assert(completed&&completed.completed===true&&completed.index===completed.chars.length,'typewriter completion failed');
}

{
  const d=M.createDiffEngine({splitGraphemes:M.splitGraphemesExact,maxHunks:2});const same=d.build('가🙂','가🙂');assert(same.mode==='same'&&same.count===0,'diff same-state failed');const changed=d.build('가🙂\n둘','가😺\n둘\n셋');assert(changed.count>=1&&changed.displayHunks.length<=2,'diff hunk build failed');const parts=d.edgeParts('가🙂나다','가😺나다');assert(parts.before.change==='🙂'&&parts.after.change==='😺','grapheme-safe diff edge failed');
}
{
  class FakeWorker{
    static instances=[];
    constructor(url){this.url=url;this.messages=[];this.terminated=false;FakeWorker.instances.push(this);}
    postMessage(msg){this.messages.push(msg);}
    terminate(){this.terminated=true;}
    respond(index,result){const msg=this.messages[index];this.onmessage?.({data:{id:msg.id,ok:true,result}});}
    fail(index,message='boom'){const msg=this.messages[index];this.onmessage?.({data:{id:msg.id,ok:false,error:message}});}
    crash(){this.onerror?.({message:'worker crash'});}
    messageError(){this.onmessageerror?.({data:null});}
  }
  let fallbackCalls=0,clock=1000,timerSeq=0;const timers=new Map();
  const setFakeTimer=(fn,ms)=>{const id=++timerSeq;timers.set(id,{fn,ms});return id;};
  const clearFakeTimer=id=>timers.delete(id);
  const adapter=M.createAnalysisWorkerAdapter({workerUrl:'worker.js?v=141',WorkerCtor:FakeWorker,minChars:5,jobTimeoutMs:20,failureCooldownMs:50,setTimer:setFakeTimer,clearTimer:clearFakeTimer,now:()=>clock,fallbackExecutor:text=>{fallbackCalls++;return{text,from:'main'};}});
  const short=await adapter.analyze('abc');assert(short.from==='main'&&fallbackCalls===1,'short analysis should stay on main fallback path');
  const pending=adapter.analyze('12345');const fw=FakeWorker.instances[0];assert(fw&&fw.messages.length===1&&adapter.pendingCount===1,'threshold-length analysis should be posted to worker');fw.respond(0,{text:'12345',from:'worker'});const workerResult=await pending;assert(workerResult.from==='worker'&&adapter.getStats().workerSuccess===1,'worker result routing failed');assert(timers.size===0,'worker completion must clear timeout timer');
  const fallbackPending=adapter.analyze('abcdef');fw.fail(1);const fallbackResult=await fallbackPending;assert(fallbackResult.from==='main'&&adapter.getStats().workerErrors===1,'worker message failure should fall back to main executor');
  const timeoutPending=adapter.analyze('timeout');const timeoutJob=[...timers.values()][0];assert(timeoutJob?.ms===20,'worker timeout should be armed');timeoutJob.fn();const timeoutResult=await timeoutPending;assert(timeoutResult.from==='main'&&fw.terminated,'timed-out worker must terminate and fall back');let st=adapter.getStats();assert(st.workerTimeouts===1&&st.coolingDown,'timeout should enter worker cooldown');
  const startsBefore=FakeWorker.instances.length;const cooldownResult=await adapter.analyze('cooldn');assert(cooldownResult.from==='main'&&FakeWorker.instances.length===startsBefore,'cooldown should avoid immediate worker recreation');assert(adapter.getStats().cooldownFallbacks>=1,'cooldown fallback should be counted');
  clock+=60;const afterCooldown=adapter.analyze('resume');const fw2=FakeWorker.instances.at(-1);assert(fw2!==fw&&!fw2.terminated&&fw2.messages.length===1,'worker should recreate after cooldown');fw2.respond(0,{text:'resume',from:'worker'});assert((await afterCooldown).from==='worker','worker should recover after cooldown');
  const oldError=fw2.onerror;const cancelled=adapter.analyze('cancel').catch(e=>e.code);assert(adapter.cancelPending()===true,'pending worker job should be cancellable');assert(await cancelled==='ANALYSIS_CANCELLED'&&fw2.terminated,'worker cancel should terminate in-flight worker');
  const fresh=adapter.analyze('fresh!');const fw3=FakeWorker.instances.at(-1);oldError?.({message:'late old worker error'});assert(!fw3.terminated,'late event from old worker must not terminate replacement worker');fw3.respond(0,{text:'fresh!',from:'worker'});assert((await fresh).from==='worker','replacement worker should remain usable after stale event');
  const messagePending=adapter.analyze('msgerr');const fw4=FakeWorker.instances.at(-1);fw4.messageError();assert((await messagePending).from==='main','messageerror should fall back to main executor');assert(adapter.getStats().messageErrors===1,'messageerror should be tracked');
  const throwing=M.createAnalysisWorkerAdapter({WorkerCtor:null,minChars:5,fallbackExecutor:()=>{throw new Error('fallback boom');}});let rejected=false;try{await throwing.analyze('abc');}catch(e){rejected=e.message==='fallback boom';}assert(rejected,'sync fallback exceptions must become rejected analysis Promises');
}


{
  let clock=1000;const g=M.createAnalysisPerformanceGovernor({now:()=>clock});
  const shortDelay=g.noteInput(1000);assert(shortDelay>=260&&shortDelay<600,'short analysis governor delay failed');
  clock+=40;const burstDelay=g.noteInput(7000);assert(burstDelay>430,'typing burst should increase live-analysis delay');
  g.noteCompleted(1200);const slowDelay=g.getDelay(7000);assert(slowDelay>burstDelay,'slow analysis should add adaptive backoff');
  const stats=g.getStats();assert(stats.completed===1&&stats.scheduled===2&&stats.emaMs===1200,'analysis governor telemetry failed');
  g.reset();assert(g.getStats().completed===0&&g.getStats().burst===0,'analysis governor reset failed');
}

{
  const scheduled=[];let now=0,results=[];
  const c=M.createAnalysisCoordinator({executor:async text=>text.toUpperCase(),syncExecutor:text=>text.toUpperCase(),setTimer:fn=>(scheduled.push(fn),scheduled.length),clearTimer:()=>{},idle:null,now:()=>++now});
  c.schedule('old',{}, {onResult:r=>results.push(r)});c.schedule('new',{}, {onResult:r=>results.push(r)});scheduled[0]?.();scheduled[1]?.();await new Promise(r=>setTimeout(r,0));assert(results.length===1&&results[0]==='NEW','async analysis coordinator must discard stale schedule');const sync=c.runNow('sync');assert(sync.result==='SYNC'&&!c.pending,'analysis coordinator runNow failed');
  const idleScheduled=[];let idleResult='';const idleFallback=M.createAnalysisCoordinator({executor:async t=>t+'!',syncExecutor:t=>t,setTimer:fn=>(idleScheduled.push(fn),1),clearTimer:()=>{},idle:()=>{throw new Error('idle unavailable');},now:()=>0});idleFallback.schedule('idle',{}, {onResult:r=>{idleResult=r;}});idleScheduled[0]();await new Promise(r=>setTimeout(r,0));assert(idleResult==='idle!'&&!idleFallback.pending,'idle scheduling failure should execute analysis immediately');
}

{
  const classes=new Set(['mobileExpanded']),style={},button={attrs:{},setAttribute(k,v){this.attrs[k]=v;},textContent:''};
  const panel={id:'panel',hidden:false,dataset:{defaultPosition:'done'},style,offsetWidth:300,offsetHeight:300,classList:{toggle(n,on){if(on)classes.add(n);else classes.delete(n);}},querySelector(sel){return sel==='[data-panel-size]'?button:null;},getBoundingClientRect(){return{left:8,top:80,width:300,height:300,right:308,bottom:380};}};
  context.document={getElementById:id=>id==='panel'?panel:null};context.innerWidth=390;context.innerHeight=844;
  const pm=M.createPanelManager({ids:['panel'],breakpoint:980,anchor:()=>panel});pm.setMobileExpanded(panel,true);assert(classes.has('mobileExpanded'),'mobile panel expansion setup failed');
  context.innerWidth=1100;context.innerHeight=700;pm.handleResize();assert(!classes.has('mobileExpanded'),'breakpoint transition must clear stale mobile expansion');assert(button.attrs['aria-expanded']==='false','panel size aria state must reset with breakpoint transition');
}

{
  const os=M.createAiWritingOsController({storage:null,showToast:()=>{}});
  const blog=os.routeTask('Apple Vision Pro 배터리 팁 네이버 블로그 써줘');assert(blog.channel==='BLOG'&&blog.workforceMode==='CREATOR_10'&&blog.outputLanguage==='ko','Blog Factory blog routing/default language failed');
  const instagram=os.routeTask('이 제품 인스타 콘텐츠 만들어줘');assert(instagram.channel==='INSTAGRAM'&&instagram.deliverables.length===3,'Blog Factory Instagram deliverables failed');
  const reels=os.routeTask('이 제품 릴스 자막만 만들어줘');assert(reels.channel==='INSTAGRAM'&&reels.deliverables.length===1&&reels.deliverables[0]==='reels_subtitles','Blog Factory narrow Instagram deliverable failed');
  const quick=os.routeTask('블로그 빠른 초안만 써줘');assert(quick.workforceMode==='QUICK','Blog Factory quick routing failed');
  const enterprise=os.routeTask('대기업 모드로 이 사업 검토해');assert(enterprise.workforceMode==='ENTERPRISE','Blog Factory enterprise routing failed');
  const grand=os.routeTask('이 제품 기획 생산부터 출시 판매까지 전부 검토해');assert(grand.workforceMode==='GRAND_CHALLENGE','Blog Factory product lifecycle escalation failed');
  const english=os.routeTask('Apple Vision Pro 블로그를 영어로 써줘');assert(english.outputLanguage==='en','Blog Factory explicit language routing failed');
  const fields={osTask:{value:'육아 · 아이와 갈 곳 · 생활정보'},osMode:{value:'auto'},osDisplayName:{value:'테스트 사용자'},osPreferences:{value:'문체: 자연스럽게'},osBlogType:{value:'auto'},osAudience:{value:''},osResearchMode:{value:'auto'},osImageCount:{value:'5'},osFacts:{value:''},osAvoidTopics:{value:''},osAutoDaily:{checked:false}};context.document={getElementById:id=>fields[id]||null};
  context.fetch=async url=>{
    const u=String(url),base=path.join(root,'ai-writing-os');
    if(u==='ai-writing-os/prompt-compiler.json'){const text=fs.readFileSync(path.join(base,'prompt-compiler.json'),'utf8');return{ok:true,status:200,json:async()=>JSON.parse(text),text:async()=>text};}
    if(u==='ai-writing-os/os-manifest.json'){const text=fs.readFileSync(path.join(base,'os-manifest.json'),'utf8');return{ok:true,status:200,json:async()=>JSON.parse(text),text:async()=>text};}
    return{ok:false,status:404,text:async()=>'',json:async()=>({})};
  };
  const pack=await os.buildTaskPack();const md=os.taskPackToMarkdown(pack);
  assert(pack.schemaVersion===3&&pack.route.channel==='BLOG'&&pack.userProfile.displayName==='테스트 사용자'&&pack.factory.mode==='daily_topics','Blog Factory compiled pack profile/routing/default mode failed');
  assert(pack.delivery.method==='copy_only'&&pack.delivery.providerLaunch===false,'Blog Factory must compile to copy-only delivery');
  assert(pack.compiler.channelLabel==='네이버 블로그'&&pack.compiler.channelRuleCount>=5&&pack.compiler.commonRuleCount>=6,'Blog Factory prompt compiler rule selection failed');
  assert(md.includes('# BLOG FACTORY — TODAY TOPIC PROMPT')&&md.includes('오늘의 탐색 각도')&&md.includes('완성 본문은 쓰지 말고 오늘 작성 후보 10개')&&md.includes('TOP 3')&&md.includes('OS나 프롬프트 구조를 설명하지 말고'),'Blog Factory today-topic execution prompt failed');
  assert(md.includes('완성 본문을 작성하지 말고 오늘의 블로그 주제 후보 10개와 TOP 3 우선순위를 먼저 제공한다.')&&!md.includes('- 완성된 블로그 글을 먼저 제공한다.'),'daily topics output contract must not conflict with full-article channel defaults');
  assert(!md.includes('===== 00_OPEN_FIRST.md =====')&&!md.includes('===== 07_STATE_AND_UPDATE.md ====='),'Blog Factory default compiler must not dump full OS files');
  fields.osTask.value='육아 주말 나들이 소재 20개';os.selectFactoryMode('idea_bank',{remember:false});const ideaPack=await os.buildTaskPack();const ideaMd=os.taskPackToMarkdown(ideaPack);
  assert(ideaPack.factory.mode==='idea_bank'&&!ideaPack.route.deliverables.includes('image_plan_and_prompts'),'idea bank must not request a fixed image package');
  assert(ideaMd.includes('주제별 이미지 콘셉트')&&ideaMd.includes('완성 이미지 패키지는 만들지 않는다')&&!ideaMd.includes('- 이미지 5장 패키지'),'idea bank image contract must stay concept-only');
  fields.osTask.value='서로 겹치지 않는 육아 글 3편';os.selectFactoryMode('batch_three',{remember:false});const batchMd=os.taskPackToMarkdown(await os.buildTaskPack());assert(batchMd.includes('글당 이미지 5장')&&batchMd.includes('각 글마다 이미지 5장 패키지'),'batch mode image count must be explicitly per article');
  fields.osFacts.value='x'.repeat(80001);let contextBounded=false;try{os.buildTaskPackSync();}catch(e){contextBounded=/80,000자/.test(e.message);}assert(contextBounded,'Blog Factory oversized context must be bounded');
  fields.osTask.value='회의 내용을 한 페이지로 정리해줘';os.selectFactoryMode('free',{remember:false});fields.osFacts.value='x'.repeat(80001);const freePack=os.buildTaskPackSync(),freeMd=os.taskPackToMarkdown(freePack);assert(freePack.factory.mode==='free'&&!freeMd.includes('BLOG FACTORY 생산 카드'),'free mode must ignore stale factory context and keep general prompt flow');fields.osFacts.value='';
  fields.osTask.value='육아 · 아이와 갈 곳';os.selectFactoryMode('daily_topics',{remember:false});os.setAutoDaily(true);const todayPack=os.buildTaskPackSync();assert(todayPack.automation.autoDaily===true&&todayPack.automation.dailyAngle&&todayPack.factory.mode==='daily_topics','daily local automation metadata must be present');
}

{
  const memory=new Map(),storage={getItem:k=>memory.has(k)?memory.get(k):null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
  let t=1000;const checkpoints=M.createResultCheckpointStore({storage,limit:2,maxChars:1000,now:()=>++t});
  const stampA=checkpoints.stamp('원본 A'),stampB=checkpoints.stamp('원본 B');assert(stampA!==stampB,'checkpoint source stamp should distinguish source text');
  const a=checkpoints.add({text:'결과 하나',label:'첫 결과',sourceStamp:stampA,sourceChars:4});assert(a.ok&&a.created&&checkpoints.size===1&&a.persisted,'checkpoint add/persist failed');
  const duplicate=checkpoints.add({text:'결과 하나',label:'첫 결과 갱신',sourceStamp:stampA,sourceChars:4});assert(duplicate.ok&&!duplicate.created&&checkpoints.size===1&&checkpoints.list()[0].label==='첫 결과 갱신','checkpoint duplicate should refresh instead of duplicate');
  checkpoints.add({text:'결과 둘',label:'둘',sourceStamp:stampA});checkpoints.add({text:'결과 셋',label:'셋',sourceStamp:stampB});assert(checkpoints.size===2&&!checkpoints.list().some(x=>x.text==='결과 하나'),'checkpoint limit should evict oldest');
  const tooLarge=checkpoints.add({text:'x'.repeat(1001),sourceStamp:stampA});assert(!tooLarge.ok&&tooLarge.reason==='too-large','checkpoint size guard failed');
  const restored=M.createResultCheckpointStore({storage,limit:2,maxChars:1000,now:()=>++t});assert(restored.size===2&&restored.list()[0].text==='결과 셋','checkpoint session reload failed');
  const id=restored.list()[0].id;assert(restored.remove(id)&&restored.size===1,'checkpoint remove failed');restored.clear();assert(restored.size===0,'checkpoint clear failed');
  const budget=M.createResultCheckpointStore({storage:null,limit:8,maxChars:1000,maxTotalChars:1500,now:()=>++t});budget.add({text:'a'.repeat(800),sourceStamp:stampA});budget.add({text:'b'.repeat(800),sourceStamp:stampA});assert(budget.size===1&&budget.list()[0].text.startsWith('b'),'checkpoint total text budget should evict oldest entries');
}
console.log('PASS 1.8.8 Blog Factory GitHub Actions Daily Engine + local prompt builder unit checks');
