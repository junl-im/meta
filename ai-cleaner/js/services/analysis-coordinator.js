(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createAnalysisCoordinator=function createAnalysisCoordinator({executor,setTimer=setTimeout,clearTimer=clearTimeout,idle=typeof requestIdleCallback==='function'?requestIdleCallback:null,cancelIdle=typeof cancelIdleCallback==='function'?cancelIdleCallback:null,now=()=>performance.now()}={}){
  if(typeof executor!=='function')throw new Error('analysis-coordinator requires executor');
  let sequence=0,timerId=null,idleId=null,pending=false;
  function clearHandles(){if(timerId!==null){clearTimer(timerId);timerId=null;}if(idleId!==null&&cancelIdle){cancelIdle(idleId);idleId=null;}}
  function cancel(){sequence++;pending=false;clearHandles();}
  function execute(token,text,options,onResult,onError){
    idleId=null;if(token!==sequence)return false;const started=now();
    try{const result=executor(text,options);if(token!==sequence)return false;pending=false;onResult?.(result,{token,durationMs:Math.max(0,now()-started)});return true;}
    catch(error){if(token===sequence){pending=false;onError?.(error,{token});}return false;}
  }
  function schedule(text,options={},config={}){
    cancel();const token=sequence;pending=true;const delay=Math.max(0,Number(config.delay)||0);
    timerId=setTimer(()=>{timerId=null;if(token!==sequence)return;const run=()=>execute(token,text,options,config.onResult,config.onError);if(idle){idleId=idle(run,{timeout:Math.max(80,Number(config.idleTimeout)||500)});}else run();},delay);
    return token;
  }
  function runNow(text,options={}){cancel();const token=sequence,started=now();const result=executor(text,options);return{result,token,durationMs:Math.max(0,now()-started)};}
  return{schedule,runNow,cancel,get pending(){return pending;},get sequence(){return sequence;}};
};
})();
