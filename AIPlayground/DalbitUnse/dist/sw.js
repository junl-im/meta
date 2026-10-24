/* 달빛운세 오프라인 지원. 범위는 설치된 달빛운세 경로로 제한됩니다. */
const CACHE_NAME='dalbit-ritual-v2.1.0';
const CORE_FILES=[
  './','./index.html','./style.css','./art.css','./app.js',
  './manifest.webmanifest','./data/tarot-artwork.json',
  './assets/lunar.js','./assets/favicon.png',
  './assets/pwa-192.png','./assets/pwa-512.png',
  './assets/tarot-face.webp','./assets/tarot-back.webp',
  './assets/hero-desktop.webp','./assets/hero-mobile.webp',
  './assets/newyear-gate.webp','./assets/saju-celestial.webp','./assets/zodiac-atlas.webp',
  ...['a','b','c','d'].flatMap(sheet=>Array.from({length:6},(_,i)=>`./assets/tarot-major-${sheet}-${i}.webp`)),
  ...Array.from({length:6},(_,i)=>`./assets/tarot-minor-e-${i}.webp`)
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache=>cache.addAll(CORE_FILES.map(path=>new URL(path,self.registration.scope).href)))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('dalbit-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||!request.url.startsWith(self.registration.scope))return;
  const url=new URL(request.url);
  const networkFirst=request.mode==='navigate'||/\.(?:css|js|json|webmanifest)$/.test(url.pathname);
  const respond=async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(networkFirst){
      try{
        const response=await fetch(request);
        if(response.ok)await cache.put(request,response.clone());
        return response;
      }catch{
        return await cache.match(request)||(request.mode==='navigate'?await cache.match(new URL('./index.html',self.registration.scope).href):Response.error());
      }
    }
    const cached=await cache.match(request);
    if(cached)return cached;
    try{
      const response=await fetch(request);
      if(response.ok)await cache.put(request,response.clone());
      return response;
    }catch{return Response.error();}
  };
  event.respondWith(respond());
});
