(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createWorkLock=function createWorkLock(){
  const active=new Map();
  return{
    acquire(name,meta={}){const key=String(name||'work');active.set(key,{name:key,meta,startedAt:Date.now()});return key;},
    release(name){return active.delete(String(name||'work'));},
    isLocked(name){return name==null?active.size>0:active.has(String(name));},
    get active(){return[...active.values()].map(x=>({...x}));},
    clear(){active.clear();}
  };
};
})();
