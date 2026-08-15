import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'js/core/event-bus.js','js/core/history-store.js','js/core/work-lock.js','js/core/text-utils.js',
  'js/core/state-store.js','js/core/text-engine.js','js/core/diff-engine.js','js/services/analysis-coordinator.js','js/services/update-manager.js',
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
  const mem=new Map(),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};let replaced='',captured='';const manager=M.createUpdateManager({currentVersion:'1.3.0',storage,locationObj:{href:'http://example.test/ai-cleaner/',replace:u=>{replaced=u;}},fetchImpl:async()=>({ok:true,json:async()=>({version:'1.3.1'})}),captureDraft:v=>(captured=v,{savedAt:100,targetVersion:v,input:'x'}),restoreDraft:()=>{},now:()=>100});const changed=await manager.check();assert(changed&&captured==='1.3.1'&&replaced.includes('__appv=1.3.1'),'update manager reload preparation failed');const draft=manager.takeDraft({maxAgeMs:1000});assert(draft?.input==='x','update draft take failed');
}
{
  const out=[];let completed=null;const engine=M.createTypewriterEngine({split:M.splitGraphemesExact,raf:fn=>{queue.push(fn);return queue.length;},caf:()=>{}});engine.start('가🙂',{getDelay:()=>0,append:p=>out.push(p),onComplete:s=>completed=s});let ts=0,guard=0;while(queue.length&&engine.running&&guard++<20){const fn=queue.shift();fn(ts+=16);}assert(out.join('')==='가🙂','typewriter incremental append failed');assert(completed&&completed.completed===true&&completed.index===completed.chars.length,'typewriter completion failed');
}

{
  const d=M.createDiffEngine({splitGraphemes:M.splitGraphemesExact,maxHunks:2});const same=d.build('가🙂','가🙂');assert(same.mode==='same'&&same.count===0,'diff same-state failed');const changed=d.build('가🙂\n둘','가😺\n둘\n셋');assert(changed.count>=1&&changed.displayHunks.length<=2,'diff hunk build failed');const parts=d.edgeParts('가🙂나다','가😺나다');assert(parts.before.change==='🙂'&&parts.after.change==='😺','grapheme-safe diff edge failed');
}
{
  const scheduled=[];const cleared=[];let now=0,results=[];const c=M.createAnalysisCoordinator({executor:(text)=>text.toUpperCase(),setTimer:fn=>(scheduled.push(fn),scheduled.length),clearTimer:id=>cleared.push(id),idle:null,now:()=>++now});c.schedule('old',{}, {onResult:r=>results.push(r)});c.schedule('new',{}, {onResult:r=>results.push(r)});scheduled[0]?.();scheduled[1]?.();assert(results.length===1&&results[0]==='NEW','analysis coordinator must discard stale schedule');const sync=c.runNow('sync');assert(sync.result==='SYNC'&&!c.pending,'analysis coordinator runNow failed');
}
console.log('PASS modular core phase 3 + text hygiene inventory unit checks');
