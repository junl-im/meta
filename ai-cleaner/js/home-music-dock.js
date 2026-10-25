(() => {
  'use strict';
  const songs=[
    {title:'너라는 기적',id:'7tHDyufKgMGt3qnGnxt52V'},
    {title:'찬란한 너의 계절에',id:'6tGXxCzjM8ITzxPXRoWgcF'},
    {title:'밤꽃 산책',id:'6dZ4FEEqykrfAOoCcWT0BR'}
  ];
  const shuffle=document.getElementById('homeMusicShuffle');
  const close=document.getElementById('homeMusicClose');
  const player=document.getElementById('homeMusicPlayer');
  const frame=document.getElementById('homeMusicFrame');
  const status=document.getElementById('homeMusicStatus');
  if(!shuffle||!close||!player||!frame||!status)return;
  let last=-1;
  shuffle.addEventListener('click',()=>{
    const next=songs.length<2?0:(last+1+Math.floor(Math.random()*(songs.length-1)))%songs.length;
    last=next;
    const song=songs[next];
    frame.src=`https://open.spotify.com/embed/track/${song.id}?utm_source=generator`;
    frame.title=`Spotify ${song.title} 플레이어`;
    status.textContent=`선택된 곡 · ${song.title}`;
    player.hidden=false;
    shuffle.textContent='다른 곡';
    shuffle.setAttribute('aria-label','곰같은여우 다른 곡 고르기');
    shuffle.setAttribute('aria-expanded','true');
  });
  const stop=({restoreFocus=false}={})=>{
    frame.removeAttribute('src');
    player.hidden=true;
    status.textContent='노래 한 곡, 쉬어 가기';
    shuffle.textContent='랜덤 듣기';
    shuffle.setAttribute('aria-label','곰같은여우 무작위 곡 고르기');
    shuffle.setAttribute('aria-expanded','false');
    if(restoreFocus)shuffle.focus();
  };
  close.addEventListener('click',()=>stop({restoreFocus:true}));
  window.GomFoxHomeMusicDock={stop};
})();
