(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createHistoryStore=function createHistoryStore({limit=60,signature=JSON.stringify}={}){
  let entries=[],index=-1,restoring=false;
  const api={
    get entries(){return entries;},
    get index(){return index;},
    get restoring(){return restoring;},
    get canUndo(){return index>0;},
    get canRedo(){return index>=0&&index<entries.length-1;},
    reset(snapshot){entries=[snapshot];index=0;restoring=false;return snapshot;},
    record(snapshot){
      if(restoring)return false;
      const current=entries[index];if(current&&signature(current)===signature(snapshot))return false;
      entries=entries.slice(0,index+1);entries.push(snapshot);
      if(entries.length>limit)entries.shift();index=entries.length-1;return true;
    },
    beginRestore(nextIndex){
      if(nextIndex<0||nextIndex>=entries.length)return null;
      restoring=true;index=nextIndex;return entries[nextIndex];
    },
    endRestore(){restoring=false;},
    clear(){entries=[];index=-1;restoring=false;},
    snapshot(){return{entries:[...entries],index,restoring};}
  };
  return api;
};
})();
