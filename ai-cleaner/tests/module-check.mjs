import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'js/core/event-bus.js','js/core/history-store.js','js/core/work-lock.js','js/core/text-utils.js',
  'js/core/state-store.js','js/core/text-engine.js','js/core/diff-engine.js','js/services/analysis-worker-adapter.js','js/services/analysis-coordinator.js','js/services/update-manager.js',
  'js/ui/panel-manager.js','js/ui/diff-view.js','js/features/file-import.js','js/features/typewriter-engine.js'
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
  const store=M.createTextStateStore();const ref=store.state;store.replace({original:'abc',base:'abc',issueBase:'abc',working:'abc',chars:[],allChars:[],issues:[],applied:new Set(),manual:false,homoglyphs:[],reviews:[],score:99,focusCycles:Object.create(null),issueUnread:false,reviewUnread:false,techUnread:false,analyzeMs:1,reviewOverflow:0});assert(store.state===ref&&store.state.original==='abc','state store must keep stable object identity');const rev=store.revision;store.touch();assert(store.revision===rev+1,'state store revision touch failed');store.reset();assert(store.state===ref&&store.state.original===''&&store.state.score===100,'state store reset failed');
}
{
  const engine=M.createTextEngine();const named=engine.scan('\u200B\u200C\u00A0',{profile:'standard'});assert(named.all[0].name==='ZERO WIDTH SPACE'&&named.all[1].name==='ZERO WIDTH NON-JOINER'&&named.all[2].name==='NO-BREAK SPACE','shared named inventory failed');assert(named.auto.length===2&&named.all[1].auto===false,'shared safe/preserve policy failed');const result=engine.analyze('앞\u200B\u00AD\u061C뒤\u00A0끝👩‍💻',{profile:'standard',repeat:true});assert(result.base==='앞뒤 끝👩‍💻','text engine standard sanitation failed');assert(result.scan.auto.length===4,'text engine auto action count failed');assert(result.scan.all.some(x=>x.type==='의미 민감 문자'),'meaning-sensitive Unicode should be reported');const inspect=engine.scan('A\u200BB',{profile:'inspect'});assert(inspect.clean==='A\u200BB'&&inspect.auto.length===0,'inspect profile should preserve hidden characters');const found=engine.issues('결론적으로 테스트입니다.\n\n\n다음',{repeat:false});assert(found.some(x=>x.cat==='정형 전환어')&&found.some(x=>x.cat==='연속 빈 줄'),'text issue rules failed');assert(engine.reviewSuggestion('결론적으로 **좋습니다**.')==='그래서 좋습니다.','review suggestion failed');assert(engine.codePointLength('가🙂')===2,'code point length failed');
}
{
  const importer=M.createFileImportService({maxBytes:10});assert(importer.rtfToText('{\\rtf1\\ansi 테스트\\par 다음}').includes('테스트\n다음'),'RTF import failed');assert(importer.looksBinary('abc\u0000def'),'binary text detection failed');assert(importer.parse('a.txt','plain')==='plain','plain import failed');let tooLarge=false;try{await importer.read({name:'a.txt',size:11,text:async()=> 'hello'});}catch(e){tooLarge=e.code==='FILE_TOO_LARGE';}assert(tooLarge,'file size guard failed');const ok=await importer.read({name:'a.txt',size:5,text:async()=> 'hello'});assert(ok.text==='hello','file read failed');
}
{
  const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};let replaced='',captured='';const manager=M.createUpdateManager({currentVersion:'1.3.0',storage,locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{replaced=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'1.3.1'})}),captureDraft:v=>(captured=v,{savedAt:100,targetVersion:v,input:'x'}),restoreDraft:()=>{},now:()=>100});const changed=await manager.check();assert(changed&&captured==='1.3.1'&&replaced.includes('__appv=1.3.1'),'update manager reload preparation failed');const draft=manager.takeDraft({maxAgeMs:1000});assert(draft?.input==='x','update draft take failed');assert(manager.compareVersions('1.3.1','1.3.0')===1&&manager.compareVersions('1.2.9','1.3.0')===-1,'semver comparison failed');assert(manager.compareVersions('1.4.0-beta.1','1.4.0')===-1,'prerelease ordering failed');
  let staleReplace='';const stale=M.createUpdateManager({currentVersion:'1.3.1',storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{staleReplace=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'1.2.2'})}),captureDraft:()=>({savedAt:100}),now:()=>100});assert(await stale.check()===false&&!staleReplace,'stale version.json must not trigger downgrade reload');
  let invalidReplace='';const invalid=M.createUpdateManager({currentVersion:'1.3.1',storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{invalidReplace=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'latest'})}),now:()=>100});assert(await invalid.check()===false&&!invalidReplace,'invalid remote version must be ignored');
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
  }
  let fallbackCalls=0;
  const adapter=M.createAnalysisWorkerAdapter({workerUrl:'worker.js?v=140',WorkerCtor:FakeWorker,minChars:5,fallbackExecutor:text=>{fallbackCalls++;return{text,from:'main'};}});
  const short=await adapter.analyze('abc');assert(short.from==='main'&&fallbackCalls===1,'short analysis should stay on main fallback path');
  const pending=adapter.analyze('123456');const fw=FakeWorker.instances[0];assert(fw&&fw.messages.length===1&&adapter.pendingCount===1,'long analysis should be posted to worker');fw.respond(0,{text:'123456',from:'worker'});const workerResult=await pending;assert(workerResult.from==='worker'&&adapter.getStats().workerSuccess===1,'worker result routing failed');
  const fallbackPending=adapter.analyze('abcdef');fw.fail(1);const fallbackResult=await fallbackPending;assert(fallbackResult.from==='main'&&adapter.getStats().workerErrors===1,'worker message failure should fall back to main executor');
  const cancelled=adapter.analyze('ghijkl').catch(e=>e.code);assert(adapter.cancelPending()===true,'pending worker job should be cancellable');assert(await cancelled==='ANALYSIS_CANCELLED'&&fw.terminated,'worker cancel should terminate in-flight worker');
}
{
  const scheduled=[];let now=0,results=[];
  const c=M.createAnalysisCoordinator({executor:async text=>text.toUpperCase(),syncExecutor:text=>text.toUpperCase(),setTimer:fn=>(scheduled.push(fn),scheduled.length),clearTimer:()=>{},idle:null,now:()=>++now});
  c.schedule('old',{}, {onResult:r=>results.push(r)});c.schedule('new',{}, {onResult:r=>results.push(r)});scheduled[0]?.();scheduled[1]?.();await new Promise(r=>setTimeout(r,0));assert(results.length===1&&results[0]==='NEW','async analysis coordinator must discard stale schedule');const sync=c.runNow('sync');assert(sync.result==='SYNC'&&!c.pending,'analysis coordinator runNow failed');
}
console.log('PASS modular core phase 4 worker-safe analysis + stability + text hygiene unit checks');
