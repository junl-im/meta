(() => {
  'use strict';
  const RADIO_URL='https://gomfox-ai-music-radio.mcwoogi.workers.dev/';
  const openButton=document.getElementById('radioDockOpen');
  const panel=document.getElementById('radioDockPanel');
  const frame=document.getElementById('radioDockFrame');
  const minimizeButton=document.getElementById('radioDockMinimize');
  const stopButton=document.getElementById('radioDockStop');
  if(!openButton||!panel||!frame||!minimizeButton||!stopButton)return;

  const open=()=>{
    // Never start the remote radio without an explicit user gesture.
    window.GomFoxHomeMusicDock?.stop?.();
    if(!frame.hasAttribute('src'))frame.setAttribute('src',RADIO_URL);
    panel.hidden=false;
    panel.classList.remove('is-minimized');
    openButton.setAttribute('aria-expanded','true');
    minimizeButton.textContent='접기';
    minimizeButton.setAttribute('aria-label','라디오 창 접기, 재생은 유지');
    minimizeButton.focus();
  };
  const minimize=()=>{
    const collapsed=panel.classList.toggle('is-minimized');
    minimizeButton.textContent=collapsed?'펼치기':'접기';
    minimizeButton.setAttribute('aria-label',collapsed?'라디오 창 다시 펼치기':'라디오 창 접기, 재생은 유지');
    if(!collapsed)minimizeButton.focus();
  };
  const stop=()=>{
    // Unloading the frame is the only reliable way to stop this external player.
    frame.removeAttribute('src');
    panel.classList.remove('is-minimized');
    panel.hidden=true;
    openButton.setAttribute('aria-expanded','false');
    minimizeButton.textContent='접기';
    minimizeButton.setAttribute('aria-label','라디오 창 접기, 재생은 유지');
  };
  openButton.addEventListener('click',open);
  document.getElementById('radioDockHomeOpen')?.addEventListener('click',open);
  minimizeButton.addEventListener('click',minimize);
  stopButton.addEventListener('click',()=>{
    stop();
    if(openButton.getClientRects().length)openButton.focus();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!panel.hidden&&!panel.classList.contains('is-minimized')){
      minimize();event.preventDefault();
    }
  });
  window.GomFoxRadioDock={open,stop};
})();
