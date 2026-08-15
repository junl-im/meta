(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};
ns.createAnalysisWorkerAdapter=function createAnalysisWorkerAdapter({workerUrl,fallbackExecutor,WorkerCtor=typeof Worker!=='undefined'?Worker:null,minChars=6000}={}){
  if(typeof fallbackExecutor!=='function')throw new Error('analysis-worker-adapter requires fallbackExecutor');
  let worker=null,nextId=0,lastMode='idle';
  const pending=new Map();
  const stats={workerSuccess:0,workerErrors:0,fallbackRuns:0,cancelled:0};
  function rejectPending(error){for(const {reject} of pending.values())reject(error);pending.clear();}
  function destroy(reason='cancelled'){
    if(worker){try{worker.terminate();}catch(_){}worker=null;}
    if(pending.size){stats.cancelled+=pending.size;rejectPending(Object.assign(new Error(reason),{code:'ANALYSIS_CANCELLED'}));}
  }
  function ensureWorker(){
    if(worker)return worker;if(!WorkerCtor||!workerUrl)return null;
    try{
      worker=new WorkerCtor(workerUrl);
      worker.onmessage=e=>{const msg=e?.data||{},job=pending.get(msg.id);if(!job)return;pending.delete(msg.id);if(msg.ok){lastMode='worker';stats.workerSuccess++;job.resolve(msg.result);}else{lastMode='fallback';stats.workerErrors++;Promise.resolve().then(()=>fallbackExecutor(job.text,job.options)).then(job.resolve,job.reject);stats.fallbackRuns++;}};
      worker.onerror=()=>{lastMode='fallback';stats.workerErrors++;const jobs=[...pending.values()];pending.clear();try{worker?.terminate();}catch(_){}worker=null;for(const job of jobs){stats.fallbackRuns++;Promise.resolve().then(()=>fallbackExecutor(job.text,job.options)).then(job.resolve,job.reject);}};
      return worker;
    }catch(_){worker=null;return null;}
  }
  function analyze(text,options={}){
    const source=String(text??'');
    if(source.length<Math.max(0,Number(minChars)||0)){lastMode='main';stats.fallbackRuns++;return Promise.resolve(fallbackExecutor(source,options));}
    const w=ensureWorker();if(!w){lastMode='fallback';stats.fallbackRuns++;return Promise.resolve(fallbackExecutor(source,options));}
    const id=++nextId;lastMode='worker-pending';
    return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject,text:source,options});try{w.postMessage({id,text:source,options});}catch(error){pending.delete(id);lastMode='fallback';stats.workerErrors++;stats.fallbackRuns++;Promise.resolve().then(()=>fallbackExecutor(source,options)).then(resolve,reject);}});
  }
  function cancelPending(){if(!pending.size)return false;destroy('analysis superseded');return true;}
  function terminate(){destroy('analysis adapter terminated');}
  return{analyze,cancelPending,terminate,get lastMode(){return lastMode;},get workerSupported(){return !!WorkerCtor;},get pendingCount(){return pending.size;},getStats(){return{...stats,pending:pending.size,lastMode};}};
};
})();
