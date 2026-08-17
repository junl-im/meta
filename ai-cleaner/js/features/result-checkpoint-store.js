(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};

function textStamp(text){
  text=String(text??'');let a=2166136261,b=5381;
  for(let i=0;i<text.length;i++){
    const c=text.charCodeAt(i);a^=c;a=Math.imul(a,16777619);b=((b<<5)+b)^c;b>>>=0;
  }
  return `${text.length}:${(a>>>0).toString(16)}:${(b>>>0).toString(16)}`;
}

ns.createResultCheckpointStore=function createResultCheckpointStore({storage=null,key='ai-cleaner-result-checkpoints-v1',limit=8,maxChars=300000,maxTotalChars=600000,now=()=>Date.now()}={}){
  limit=Math.max(1,Math.min(24,Number(limit)||8));maxChars=Math.max(1000,Number(maxChars)||300000);maxTotalChars=Math.max(maxChars,Number(maxTotalChars)||600000);
  let entries=[],seq=0,persistenceAvailable=!!storage;
  const cleanEntry=(x)=>{
    if(!x||typeof x!=='object'||typeof x.text!=='string'||!x.text||x.text.length>maxChars)return null;
    return{id:String(x.id||''),text:x.text,label:String(x.label||'보관한 결과').slice(0,80),sourceStamp:String(x.sourceStamp||''),sourceChars:Math.max(0,Number(x.sourceChars)||0),savedAt:Math.max(0,Number(x.savedAt)||0)};
  };
  function trimBudget(){entries=entries.slice(0,limit);let total=entries.reduce((n,x)=>n+x.text.length,0);while(entries.length>1&&total>maxTotalChars){const old=entries.pop();total-=old.text.length;}return entries;}
  function load(){
    if(!storage)return entries;
    try{
      const raw=storage.getItem(key);if(!raw){entries=[];return entries;}
      const parsed=JSON.parse(raw);entries=(Array.isArray(parsed)?parsed:[]).map(cleanEntry).filter(Boolean);trimBudget();return entries;
    }catch(_){persistenceAvailable=false;entries=[];return entries;}
  }
  function persist(){
    if(!storage)return false;
    try{storage.setItem(key,JSON.stringify(entries));persistenceAvailable=true;return true;}
    catch(_){persistenceAvailable=false;return false;}
  }
  function list(){return entries.map(x=>({...x}));}
  function add({text,label='보관한 결과',sourceStamp='',sourceChars=0}={}){
    text=String(text??'');if(!text)return{ok:false,reason:'empty',persisted:persistenceAvailable};
    if(text.length>maxChars)return{ok:false,reason:'too-large',maxChars,persisted:persistenceAvailable};
    const savedAt=now(),same=entries.findIndex(x=>x.text===text&&x.sourceStamp===String(sourceStamp||''));
    if(same>=0){const current=entries.splice(same,1)[0],entry={...current,label:String(label||current.label||'보관한 결과').slice(0,80),savedAt};entries.unshift(entry);return{ok:true,created:false,entry:{...entry},persisted:persist()};}
    const entry={id:`cp-${savedAt.toString(36)}-${(++seq).toString(36)}`,text,label:String(label||'보관한 결과').slice(0,80),sourceStamp:String(sourceStamp||''),sourceChars:Math.max(0,Number(sourceChars)||0),savedAt};
    entries.unshift(entry);trimBudget();return{ok:true,created:true,entry:{...entry},persisted:persist()};
  }
  function remove(id){const before=entries.length;entries=entries.filter(x=>x.id!==String(id));if(entries.length===before)return false;persist();return true;}
  function clear(){const had=entries.length>0;entries=[];if(storage){try{storage.removeItem(key);persistenceAvailable=true;}catch(_){persistenceAvailable=false;}}return had;}
  function get(id){const x=entries.find(v=>v.id===String(id));return x?{...x}:null;}
  load();
  return{list,add,remove,clear,get,stamp:textStamp,get size(){return entries.length;},get limit(){return limit;},get maxChars(){return maxChars;},get maxTotalChars(){return maxTotalChars;},get persistenceAvailable(){return persistenceAvailable;}};
};
})();
