(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};
ns.createAnalysisWorkerAdapter=function createAnalysisWorkerAdapter({
  workerUrl,
  fallbackExecutor,
  WorkerCtor=typeof Worker!=='undefined'?Worker:null,
  minChars=6000,
  jobTimeoutMs=20000,
  failureCooldownMs=15000,
  setTimer=setTimeout,
  clearTimer=clearTimeout,
  now=()=>Date.now()
}={}){
  if(typeof fallbackExecutor!=='function')throw new Error('analysis-worker-adapter requires fallbackExecutor');
  let worker=null,nextId=0,lastMode='idle',cooldownUntil=0;
  const pending=new Map();
  const stats={workerSuccess:0,workerErrors:0,workerTimeouts:0,messageErrors:0,fallbackRuns:0,cancelled:0,workerStarts:0,cooldownFallbacks:0};
  const timeoutMs=Math.max(0,Number(jobTimeoutMs)||0);
  const cooldownMs=Math.max(0,Number(failureCooldownMs)||0);

  function clearJobTimer(job){if(job?.timer!==null&&job?.timer!==undefined){try{clearTimer(job.timer);}catch(_){}job.timer=null;}}
  function runFallback(job,mode='fallback'){
    if(!job)return Promise.resolve();
    clearJobTimer(job);lastMode=mode;stats.fallbackRuns++;
    return Promise.resolve().then(()=>fallbackExecutor(job.text,job.options)).then(job.resolve,job.reject);
  }
  function detachAndTerminate(instance){
    if(!instance)return;
    try{instance.onmessage=null;instance.onerror=null;instance.onmessageerror=null;}catch(_){}
    try{instance.terminate();}catch(_){}
    if(worker===instance)worker=null;
  }
  function enterCooldown(){if(cooldownMs>0)cooldownUntil=Math.max(cooldownUntil,now()+cooldownMs);}
  function fallbackAllForWorker(instance,{kind='error'}={}){
    if(worker!==instance)return false;
    if(kind==='timeout')stats.workerTimeouts++;
    else if(kind==='messageerror')stats.messageErrors++;
    stats.workerErrors++;
    enterCooldown();
    const jobs=[...pending.values()];pending.clear();detachAndTerminate(instance);
    for(const job of jobs)void runFallback(job,kind==='timeout'?'timeout-fallback':'fallback');
    return true;
  }
  function rejectPending(error){
    for(const job of pending.values()){clearJobTimer(job);job.reject(error);}
    pending.clear();
  }
  function destroy(reason='cancelled'){
    const instance=worker;if(instance)detachAndTerminate(instance);
    if(pending.size){stats.cancelled+=pending.size;rejectPending(Object.assign(new Error(reason),{code:'ANALYSIS_CANCELLED'}));}
    lastMode='idle';
  }
  function ensureWorker(){
    if(worker)return worker;
    if(!WorkerCtor||!workerUrl)return null;
    if(now()<cooldownUntil)return null;
    try{
      const instance=new WorkerCtor(workerUrl);worker=instance;stats.workerStarts++;
      instance.onmessage=e=>{
        if(worker!==instance)return;
        const msg=e?.data||{},job=pending.get(msg.id);if(!job)return;
        pending.delete(msg.id);clearJobTimer(job);
        if(msg.ok){lastMode='worker';stats.workerSuccess++;job.resolve(msg.result);}
        else{stats.workerErrors++;void runFallback(job,'fallback');}
      };
      instance.onerror=e=>{try{e?.preventDefault?.();}catch(_){}fallbackAllForWorker(instance,{kind:'error'});return true;};
      instance.onmessageerror=()=>{fallbackAllForWorker(instance,{kind:'messageerror'});};
      return instance;
    }catch(_){
      worker=null;stats.workerErrors++;enterCooldown();return null;
    }
  }
  function analyze(text,options={}){
    const source=String(text??''),threshold=Math.max(0,Number(minChars)||0);
    if(source.length<threshold){lastMode='main';stats.fallbackRuns++;return Promise.resolve().then(()=>fallbackExecutor(source,options));}
    if(now()<cooldownUntil){lastMode='cooldown-fallback';stats.cooldownFallbacks++;stats.fallbackRuns++;return Promise.resolve().then(()=>fallbackExecutor(source,options));}
    const instance=ensureWorker();
    if(!instance){
      const cooling=now()<cooldownUntil;lastMode=cooling?'cooldown-fallback':'fallback';if(cooling)stats.cooldownFallbacks++;stats.fallbackRuns++;
      return Promise.resolve().then(()=>fallbackExecutor(source,options));
    }
    const id=++nextId;lastMode='worker-pending';
    return new Promise((resolve,reject)=>{
      const job={id,resolve,reject,text:source,options,timer:null,worker:instance};pending.set(id,job);
      try{
        instance.postMessage({id,text:source,options});
        if(timeoutMs>0){job.timer=setTimer(()=>{if(!pending.has(id)||worker!==instance)return;fallbackAllForWorker(instance,{kind:'timeout'});},timeoutMs);}
      }catch(error){
        if(pending.has(id))fallbackAllForWorker(instance,{kind:'error'});
      }
    });
  }
  function cancelPending(){if(!pending.size)return false;destroy('analysis superseded');return true;}
  function terminate(){destroy('analysis adapter terminated');cooldownUntil=0;}
  return{
    analyze,cancelPending,terminate,
    get lastMode(){return lastMode;},
    get workerSupported(){return !!WorkerCtor;},
    get pendingCount(){return pending.size;},
    get coolingDown(){return now()<cooldownUntil;},
    getStats(){return{...stats,pending:pending.size,lastMode,coolingDown:now()<cooldownUntil,cooldownRemainingMs:Math.max(0,cooldownUntil-now())};}
  };
};
})();
