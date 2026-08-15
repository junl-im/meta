(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createEventBus=function createEventBus(){
  const listeners=new Map();
  function on(type,handler){
    if(typeof handler!=='function')return()=>{};
    let set=listeners.get(type);if(!set){set=new Set();listeners.set(type,set);}set.add(handler);
    return()=>off(type,handler);
  }
  function off(type,handler){const set=listeners.get(type);if(!set)return;set.delete(handler);if(!set.size)listeners.delete(type);}
  function emit(type,detail){const set=listeners.get(type);if(!set)return;for(const handler of [...set]){try{handler(detail);}catch(err){console.error('[AI Cleaner event]',type,err);}}}
  function clear(){listeners.clear();}
  return{on,off,emit,clear};
};
})();
