'use strict';
const q=(typeof location!=='undefined'&&location.search)||'';
importScripts('../core/text-utils.js'+q,'../core/text-engine.js'+q);
const M=globalThis.AICleanerModules||{};
if(typeof M.createTextEngine!=='function')throw new Error('text analysis worker failed to load text engine');
const engine=M.createTextEngine();
self.onmessage=e=>{
  const msg=e?.data||{},id=msg.id;
  try{const result=engine.analyze(String(msg.text??''),msg.options||{});self.postMessage({id,ok:true,result});}
  catch(error){self.postMessage({id,ok:false,error:String(error?.message||error)});}
};
