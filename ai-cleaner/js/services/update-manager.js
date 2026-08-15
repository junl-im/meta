(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createUpdateManager=function createUpdateManager({currentVersion='local',draftKey='ai-cleaner-update-draft-v1',reloadKey='ai-cleaner-refresh-target',fetchImpl,storage,locationObj,isBlocked=()=>false,captureDraft=()=>null,restoreDraft=()=>{},now=()=>Date.now()}={}){
  let busy=false,initialTimer=0,intervalTimer=0,onlineTarget=null,visibilityTarget=null;
  const fetcher=fetchImpl||((...args)=>fetch(...args)),store=storage||(typeof sessionStorage!=='undefined'?sessionStorage:null),loc=locationObj||(typeof location!=='undefined'?location:null);
  const safeGet=k=>{try{return store?.getItem(k)||'';}catch(_){return'';}};const safeSet=(k,v)=>{try{store?.setItem(k,v);}catch(_){}};const safeRemove=k=>{try{store?.removeItem(k);}catch(_){}};
  async function check(){
    if(busy||currentVersion==='local'||isBlocked())return false;busy=true;
    try{const res=await fetcher(`version.json?ts=${now()}`,{cache:'no-store'});if(!res?.ok)return false;const data=await res.json(),latest=String(data?.version||'').trim();if(!latest)return false;if(latest===String(currentVersion)){safeRemove(reloadKey);return false;}if(safeGet(reloadKey)===latest)return false;const draft=captureDraft(latest);if(draft)safeSet(draftKey,JSON.stringify(draft));safeSet(reloadKey,latest);if(!loc)return false;const url=new URL(loc.href);url.searchParams.set('__appv',latest);url.searchParams.set('__fresh',String(now()));loc.replace(url.toString());return true;}catch(_){return false;}finally{busy=false;}
  }
  function takeDraft({maxAgeMs=30*60*1000}={}){let draft=null;try{draft=JSON.parse(safeGet(draftKey)||'null');}catch(_){}safeRemove(draftKey);if(!draft||now()-Number(draft.savedAt||0)>maxAgeMs)return null;return draft;}
  function restorePending(options){const draft=takeDraft(options);if(!draft)return false;restoreDraft(draft);return true;}
  const onOnline=()=>check(),onVisible=()=>{if(!visibilityTarget||visibilityTarget.visibilityState==='visible')check();};
  function start({initialDelay=5000,interval=120000,online=typeof window!=='undefined'?window:null,visibility=typeof document!=='undefined'?document:null}={}){stop();onlineTarget=online;visibilityTarget=visibility;if(initialDelay>=0)initialTimer=setTimeout(check,initialDelay);if(interval>0)intervalTimer=setInterval(check,interval);onlineTarget?.addEventListener?.('online',onOnline);visibilityTarget?.addEventListener?.('visibilitychange',onVisible);return true;}
  function stop(){if(initialTimer)clearTimeout(initialTimer);if(intervalTimer)clearInterval(intervalTimer);initialTimer=0;intervalTimer=0;onlineTarget?.removeEventListener?.('online',onOnline);visibilityTarget?.removeEventListener?.('visibilitychange',onVisible);onlineTarget=null;visibilityTarget=null;}
  return{check,takeDraft,restorePending,start,stop,get busy(){return busy;},get currentVersion(){return String(currentVersion);}};
};
})();
