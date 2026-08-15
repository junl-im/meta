import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const files=[
  'js/core/event-bus.js','js/core/history-store.js','js/core/work-lock.js','js/core/text-utils.js','js/features/typewriter-engine.js'
];
const queue=[];
const context={
  console,Intl,
  window:{},
  requestAnimationFrame(fn){queue.push(fn);return queue.length;},
  cancelAnimationFrame(){},
  setTimeout,clearTimeout,Date,Map,Set,JSON,String,Array,Math
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
}
{
  const prepared=M.sanitizeVisibleTypingSource('앞\u200B뒤\u00A0끝👩‍💻');assert(prepared.text==='앞뒤 끝👩‍💻','visible typing sanitizer output failed');assert(prepared.removed.length===1,'safe hidden removal count failed');assert(prepared.normalizedSpaces.length===1,'special-space normalization failed');assert(prepared.preservedSensitive.length>=1,'meaning-sensitive Unicode must remain preserved');
}
{
  const out=[];let completed=null;const engine=M.createTypewriterEngine({split:M.splitGraphemesExact,raf:fn=>{queue.push(fn);return queue.length;},caf:()=>{}});
  engine.start('가🙂',{getDelay:()=>0,append:p=>out.push(p),onComplete:s=>completed=s});
  let ts=0,guard=0;while(queue.length&&engine.running&&guard++<20){const fn=queue.shift();fn(ts+=16);}
  assert(out.join('')==='가🙂','typewriter incremental append failed');assert(completed&&completed.completed===true&&completed.index===completed.chars.length,'typewriter completion failed');
}
console.log('PASS modular core unit checks');
