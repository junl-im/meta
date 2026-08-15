(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createPanelManager=function createPanelManager({ids=[],breakpoint=980,anchor=()=>null,offsets={},storagePrefix='ai-cleaner-panel-',legacyPrefix='v66-pos-',topMin=76}={}){
  let z=220;
  const get=id=>document.getElementById(id);
  function setMobileExpanded(panel,expanded){
    if(!panel)return;expanded=!!expanded;panel.classList.toggle('mobileExpanded',expanded);
    const b=panel.querySelector('[data-panel-size]');if(b){b.setAttribute('aria-expanded',String(expanded));b.setAttribute('aria-label',expanded?'작게 보기':'크게 보기');b.textContent=expanded?'⌄':'↕';}
  }
  function closeAll(except=''){
    for(const id of ids){if(id===except)continue;const panel=get(id);if(panel){panel.hidden=true;setMobileExpanded(panel,false);}}
  }
  function positionDefault(panel){
    if(!panel||innerWidth<=breakpoint)return;const a=anchor();if(!a)return;
    const ar=a.getBoundingClientRect(),r=panel.getBoundingClientRect(),[ox,oy]=offsets[panel.id]||[14,12];
    const left=Math.max(8,Math.min(innerWidth-r.width-8,ar.left+ox)),top=Math.max(topMin,Math.min(innerHeight-r.height-8,ar.top+oy));
    panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';panel.style.bottom='auto';
  }
  function clamp(panel){
    if(!panel||panel.hidden||innerWidth<=breakpoint)return;
    const r=panel.getBoundingClientRect(),maxW=Math.max(360,innerWidth-16),maxH=Math.max(260,innerHeight-16);
    if(r.width>maxW)panel.style.width=maxW+'px';if(r.height>maxH)panel.style.height=maxH+'px';
    const rr=panel.getBoundingClientRect(),left=Math.max(8,Math.min(innerWidth-rr.width-8,rr.left)),top=Math.max(topMin,Math.min(innerHeight-rr.height-8,rr.top));
    panel.style.left=left+'px';panel.style.top=top+'px';panel.style.right='auto';panel.style.bottom='auto';
  }
  function open(id){
    closeAll(id);const panel=get(id);if(!panel)return null;panel.hidden=false;if(innerWidth<=breakpoint)setMobileExpanded(panel,false);
    if(panel.dataset.defaultPosition==='pending'){positionDefault(panel);panel.dataset.defaultPosition='done';}
    panel.style.zIndex=String(++z);clamp(panel);return panel;
  }
  function closeTop(){
    const visible=ids.map(get).filter(p=>p&&!p.hidden).sort((a,b)=>(Number(b.style.zIndex)||0)-(Number(a.style.zIndex)||0));
    if(!visible[0])return false;visible[0].hidden=true;setMobileExpanded(visible[0],false);return true;
  }
  function makeDraggable(panel){
    if(!panel)return;const handle=panel.querySelector('[data-drag-handle]');if(!handle)return;let drag=null;
    const key=storagePrefix+panel.id,legacyKey=legacyPrefix+panel.id;
    try{const saved=JSON.parse(localStorage.getItem(key)||localStorage.getItem(legacyKey)||'null');if(saved&&innerWidth>breakpoint){panel.style.left=saved.left+'px';panel.style.top=saved.top+'px';panel.style.right='auto';panel.style.bottom='auto';if(saved.width)panel.style.width=saved.width+'px';if(saved.height)panel.style.height=saved.height+'px';panel.dataset.defaultPosition='done';setTimeout(()=>clamp(panel),0);}else panel.dataset.defaultPosition='pending';}catch(_){panel.dataset.defaultPosition='pending';}
    handle.addEventListener('pointerdown',e=>{if(e.button!==0||innerWidth<=breakpoint||e.target.closest('button'))return;const r=panel.getBoundingClientRect();drag={dx:e.clientX-r.left,dy:e.clientY-r.top,id:e.pointerId};handle.setPointerCapture(e.pointerId);panel.style.left=r.left+'px';panel.style.top=r.top+'px';panel.style.right='auto';panel.style.bottom='auto';panel.style.zIndex=String(++z);});
    handle.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const maxX=Math.max(8,innerWidth-panel.offsetWidth-8),maxY=Math.max(8,innerHeight-panel.offsetHeight-8);panel.style.left=Math.max(8,Math.min(maxX,e.clientX-drag.dx))+'px';panel.style.top=Math.max(8,Math.min(maxY,e.clientY-drag.dy))+'px';});
    const save=()=>{if(innerWidth<=breakpoint||panel.hidden)return;const r=panel.getBoundingClientRect();try{localStorage.setItem(key,JSON.stringify({left:r.left,top:r.top,width:r.width,height:r.height}));}catch(_){}};
    const end=()=>{if(!drag)return;save();drag=null;};handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    if('ResizeObserver' in window){let timer=0;new ResizeObserver(()=>{clearTimeout(timer);timer=setTimeout(save,140);}).observe(panel);}
  }
  function handleResize(){for(const id of ids)clamp(get(id));}
  return{open,closeAll,closeTop,clamp,positionDefault,setMobileExpanded,makeDraggable,handleResize,get breakpoint(){return breakpoint;}};
};
})();
