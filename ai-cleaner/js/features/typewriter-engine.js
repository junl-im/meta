(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createTypewriterEngine=function createTypewriterEngine({split=Array.from,raf=requestAnimationFrame,caf=cancelAnimationFrame}={}){
  let state={running:false,paused:false,completed:false,chars:[],index:0,frame:0,last:0,source:''},hooks={};
  const snapshot=()=>({...state,chars:[...state.chars]});
  function schedule(){state.frame=raf(step);}
  function step(ts){
    if(!state.running)return;
    if(state.paused){schedule();return;}
    const delay=Math.max(0,Number(hooks.getDelay?.())||0);
    if(!state.last||ts-state.last>=delay){
      const piece=state.chars[state.index];
      if(piece!==undefined){hooks.append?.(piece,state.index);state.index++;state.last=ts;}
      const total=Math.max(1,state.chars.length),pct=Math.round((state.index/total)*100);hooks.onProgress?.({index:state.index,total:state.chars.length,pct,piece});
    }
    if(state.index>=state.chars.length){state.running=false;state.completed=true;state.frame=0;hooks.onComplete?.(snapshot());return;}
    schedule();
  }
  function start(source,nextHooks={}){
    if(state.running)return false;caf(state.frame);hooks=nextHooks;const value=String(source??'');
    state={running:true,paused:false,completed:false,chars:split(value),index:0,frame:0,last:0,source:value};hooks.onStart?.(snapshot());
    if(!state.chars.length){state.running=false;state.completed=true;hooks.onComplete?.(snapshot());return true;}schedule();return true;
  }
  function stop(){const wasRunning=state.running;state.running=false;state.paused=false;caf(state.frame);state.frame=0;hooks.onStop?.(snapshot());return wasRunning;}
  function togglePause(){if(!state.running)return state.paused;state.paused=!state.paused;hooks.onPause?.(state.paused,snapshot());return state.paused;}
  function pause(){if(state.running&&!state.paused)togglePause();return state.paused;}
  function resume(){if(state.running&&state.paused)togglePause();return state.paused;}
  return{start,stop,togglePause,pause,resume,snapshot,get running(){return state.running;},get paused(){return state.paused;}};
};
})();
