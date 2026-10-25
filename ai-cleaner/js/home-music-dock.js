(() => {
  'use strict';
  const songs=[
    {title:'너라는 기적',id:'7tHDyufKgMGt3qnGnxt52V'},
    {title:'찬란한 너의 계절에',id:'6tGXxCzjM8ITzxPXRoWgcF'},
    {title:'밤꽃 산책',id:'6dZ4FEEqykrfAOoCcWT0BR'},
    {title:'곰같은여우와 여우같은곰',id:'2BwbGZpj9cN20N4T94B2AW'},
    {title:'별동별',id:'46Jyixc5S41aS8ivzhE0OA'},
    {title:'유통기한 지난 사랑',id:'40f3q3Gnw7s0Vl7LxfuAqd'},
    {title:'모든 순간이 이별이었다',id:'6acQRifnKihYz6ADstRjx3'},
    {title:'오직 너를 위해',id:'67fZar2nbB2aZElT4med8W'},
    {title:'첫눈이 내리면',id:'1LugoliyiInISgC8bEpvz4'},
    {title:'Butter',id:'1c9gRsbdYEXWMGTtOGGDVe'},
    {title:'공허함',id:'0XG0pagGR4H4MsoPEOQ4zO'},
    {title:'행복 주문',id:'5Q1FQUxag4EvI1BiFifzle'}
  ];
  const shuffle=document.getElementById('homeMusicShuffle');
  const shuffleLabel=shuffle?.querySelector('.homeMusicShuffleLabel');
  const close=document.getElementById('homeMusicClose');
  const player=document.getElementById('homeMusicPlayer');
  const frame=document.getElementById('homeMusicFrame');
  const status=document.getElementById('homeMusicStatus');
  if(!shuffle||!shuffleLabel||!close||!player||!frame||!status)return;
  let last=-1;
  shuffle.addEventListener('click',()=>{
    const next=songs.length<2?0:(last+1+Math.floor(Math.random()*(songs.length-1)))%songs.length;
    last=next;
    const song=songs[next];
    frame.src=`https://open.spotify.com/embed/track/${song.id}?utm_source=generator`;
    frame.title=`Spotify ${song.title} 플레이어`;
    status.textContent=`선택된 곡 · ${song.title}`;
    player.hidden=false;
    shuffleLabel.textContent='다른 곡';
    shuffle.setAttribute('aria-label','곰같은여우 다른 곡 고르기');
    shuffle.setAttribute('aria-expanded','true');
  });
  const stop=({restoreFocus=false}={})=>{
    frame.removeAttribute('src');
    player.hidden=true;
    status.textContent='노래 한 곡, 쉬어 가기';
    shuffleLabel.textContent='랜덤 듣기';
    shuffle.setAttribute('aria-label','곰같은여우 무작위 곡 고르기');
    shuffle.setAttribute('aria-expanded','false');
    if(restoreFocus)shuffle.focus();
  };
  close.addEventListener('click',()=>stop({restoreFocus:true}));
  window.GomFoxHomeMusicDock={stop};
})();
