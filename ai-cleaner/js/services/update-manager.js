(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createUpdateManager=function createUpdateManager({currentVersion='local',draftKey='ai-cleaner-update-draft-v1',reloadKey='ai-cleaner-refresh-target',fetchImpl,storage,locationObj,isBlocked=()=>false,captureDraft=()=>null,restoreDraft=()=>{},now=()=>Date.now(),AbortControllerCtor=typeof AbortController!=='undefined'?AbortController:null}={}){
  let busy=false,initialTimer=0,intervalTimer=0,onlineTarget=null,visibilityTarget=null,runSeq=0,activeController=null;
  const fetcher=fetchImpl||((...args)=>fetch(...args)),store=storage||(typeof sessionStorage!=='undefined'?sessionStorage:null),loc=locationObj||(typeof location!=='undefined'?location:null);
  const safeGet=k=>{try{return store?.getItem(k)||'';}catch(_){return'';}};const safeSet=(k,v)=>{try{if(!store)return false;store.setItem(k,v);return true;}catch(_){return false;}};const safeRemove=k=>{try{store?.removeItem(k);}catch(_){};};
  function parseVersion(value){
    const m=String(value??'').trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);if(!m)return null;
    return{parts:[Number(m[1]),Number(m[2]),Number(m[3])],pre:m[4]?m[4].split('.'):[]};
  }
  function comparePre(a,b){
    if(!a.length&&!b.length)return 0;if(!a.length)return 1;if(!b.length)return-1;
    const n=Math.max(a.length,b.length);for(let i=0;i<n;i++){if(a[i]===undefined)return-1;if(b[i]===undefined)return 1;const x=a[i],y=b[i],xn=/^\d+$/.test(x),yn=/^\d+$/.test(y);if(xn&&yn){const d=Number(x)-Number(y);if(d)return d>0?1:-1;}else if(xn!==yn)return xn?-1:1;else if(x!==y)return x>y?1:-1;}return 0;
  }
  function compareVersions(a,b){const pa=parseVersion(a),pb=parseVersion(b);if(!pa||!pb)return null;for(let i=0;i<3;i++){if(pa.parts[i]!==pb.parts[i])return pa.parts[i]>pb.parts[i]?1:-1;}return comparePre(pa.pre,pb.pre);}
  function isNewerVersion(latest,current=currentVersion){return compareVersions(latest,current)===1;}
  async function check(){
    if(busy||currentVersion==='local'||isBlocked())return false;
    const run=++runSeq,controller=AbortControllerCtor?new AbortControllerCtor():null;activeController=controller;busy=true;let armedLatest='';
    try{
      const fetchOptions={cache:'no-store'};if(controller?.signal)fetchOptions.signal=controller.signal;
      const res=await fetcher(`version.json?ts=${now()}`,fetchOptions);if(run!==runSeq||!res?.ok)return false;
      const data=await res.json();if(run!==runSeq||isBlocked())return false;const latest=String(data?.version||'').trim();if(!latest)return false;
      const cmp=compareVersions(latest,currentVersion);if(cmp===0){safeRemove(reloadKey);return false;}if(cmp!==1)return false;if(safeGet(reloadKey)===latest)return false;
      const draft=captureDraft(latest);if(draft&&!safeSet(draftKey,JSON.stringify(draft)))return false;if(run!==runSeq||isBlocked())return false;
      if(!loc)return false;safeSet(reloadKey,latest);armedLatest=latest;const url=new URL(loc.href);url.searchParams.set('__appv',latest);url.searchParams.set('__fresh',String(now()));loc.replace(url.toString());return true;
    }catch(_){if(run===runSeq&&armedLatest)safeRemove(reloadKey);return false;}
    finally{if(activeController===controller)activeController=null;if(run===runSeq)busy=false;}
  }
  function takeDraft({maxAgeMs=30*60*1000}={}){let draft=null;try{draft=JSON.parse(safeGet(draftKey)||'null');}catch(_){}safeRemove(draftKey);if(!draft||now()-Number(draft.savedAt||0)>maxAgeMs)return null;return draft;}
  function restorePending(options){const draft=takeDraft(options);if(!draft)return false;restoreDraft(draft);return true;}
  const onOnline=()=>check(),onVisible=()=>{if(!visibilityTarget||visibilityTarget.visibilityState==='visible')check();};
  function start({initialDelay=5000,interval=120000,online=typeof window!=='undefined'?window:null,visibility=typeof document!=='undefined'?document:null}={}){stop();onlineTarget=online;visibilityTarget=visibility;if(initialDelay>=0)initialTimer=setTimeout(check,initialDelay);if(interval>0)intervalTimer=setInterval(check,interval);onlineTarget?.addEventListener?.('online',onOnline);visibilityTarget?.addEventListener?.('visibilitychange',onVisible);return true;}
  function stop(){runSeq++;busy=false;if(activeController){try{activeController.abort();}catch(_){}activeController=null;}if(initialTimer)clearTimeout(initialTimer);if(intervalTimer)clearInterval(intervalTimer);initialTimer=0;intervalTimer=0;onlineTarget?.removeEventListener?.('online',onOnline);visibilityTarget?.removeEventListener?.('visibilitychange',onVisible);onlineTarget=null;visibilityTarget=null;}
  return{check,takeDraft,restorePending,start,stop,compareVersions,isNewerVersion,get busy(){return busy;},get currentVersion(){return String(currentVersion);}};
};
})();
