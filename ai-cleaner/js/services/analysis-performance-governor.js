(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};
ns.createAnalysisPerformanceGovernor=function createAnalysisPerformanceGovernor({
  now=()=>Date.now(),
  minDelay=260,
  maxDelay=2200,
  alpha=0.28
}={}){
  let lastInputAt=0,burst=0,emaMs=0,completed=0,scheduled=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function baseDelay(length){
    const len=Math.max(0,Number(length)||0);
    if(len>100000)return 1250;
    if(len>50000)return 950;
    if(len>20000)return 650;
    if(len>=6000)return 430;
    return 320;
  }
  function getDelay(length){
    const perfPenalty=emaMs>140?Math.min(650,(emaMs-140)*0.42):0;
    const burstPenalty=Math.min(360,burst*45);
    return Math.round(clamp(baseDelay(length)+perfPenalty+burstPenalty,minDelay,maxDelay));
  }
  function noteInput(length,at=now()){
    const t=Number(at)||0,gap=lastInputAt?Math.max(0,t-lastInputAt):Infinity;
    if(gap<90)burst=Math.min(8,burst+2);
    else if(gap<220)burst=Math.min(8,burst+1);
    else if(gap>700)burst=Math.max(0,burst-3);
    else burst=Math.max(0,burst-1);
    lastInputAt=t;scheduled++;
    return getDelay(length);
  }
  function noteCompleted(durationMs){
    const d=Math.max(0,Number(durationMs)||0);
    emaMs=completed?emaMs*(1-alpha)+d*alpha:d;
    completed++;burst=Math.max(0,burst-1);
    return emaMs;
  }
  function reset(){lastInputAt=0;burst=0;emaMs=0;completed=0;scheduled=0;}
  return{
    noteInput,noteCompleted,getDelay,reset,
    getStats(){return{emaMs,burst,completed,scheduled,lastInputAt};}
  };
};
})();
