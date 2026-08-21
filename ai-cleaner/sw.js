'use strict';
const CACHE_NAME='ai-cleaner-shell-1.11.3';
const CORE_ASSETS=[
  './','./index.html','./version.json','./site.webmanifest','./css/app.css','./js/boot.js',
  './js/core/event-bus.js','./js/core/history-store.js','./js/core/work-lock.js','./js/core/text-utils.js',
  './js/core/state-store.js','./js/core/text-engine.js','./js/core/diff-engine.js','./js/services/analysis-worker-adapter.js',
  './js/services/analysis-performance-governor.js','./js/services/analysis-coordinator.js','./js/services/update-manager.js',
  './js/ui/panel-manager.js','./js/ui/diff-view.js','./js/features/file-import.js','./js/features/typewriter-engine.js',
  './js/features/result-checkpoint-store.js','./js/app.js','./vendor/app-core.bundle.js','./js/rewrite-studio.js','./js/features/ai-writing-os.js',
  './data/daily-topics.json','./ai-writing-os/prompt-compiler.json','./ai-writing-os/os-manifest.json',
  './assets/fox-logo.png','./assets/favicon-v66.png','./assets/apple-touch-icon-v66.png','./assets/icon-v66-192.png','./assets/icon-v66-512.png'
];
const FRESH_PATHS=new Set(['/version.json','/data/daily-topics.json']);
const normalizeKey=request=>{
  const url=new URL(request.url);
  return new Request(url.origin+url.pathname,{method:'GET',headers:{accept:request.headers.get('accept')||'*/*'},credentials:'same-origin'});
};
async function cacheResponse(cache,key,response){
  if(response&&response.ok&&response.type!=='opaque')await cache.put(key,response.clone());
  return response;
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const results=await Promise.allSettled(CORE_ASSETS.map(async relative=>{
      const request=new Request(new URL(relative,self.registration.scope),{cache:'reload'});
      const response=await fetch(request);
      if(!response.ok)throw new Error(`${relative}: ${response.status}`);
      await cache.put(normalizeKey(request),response);
    }));
    const critical=['./index.html','./css/app.css','./js/boot.js','./js/app.js'];
    const failedCritical=results.map((result,index)=>({result,asset:CORE_ASSETS[index]})).filter(x=>x.result.status==='rejected'&&critical.includes(x.asset));
    if(failedCritical.length)throw new Error('critical offline shell cache failed');
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const name of await caches.keys())if(name.startsWith('ai-cleaner-shell-')&&name!==CACHE_NAME)await caches.delete(name);
    await self.clients.claim();
  })());
});
async function networkFirst(request,key){
  const cache=await caches.open(CACHE_NAME);
  try{return await cacheResponse(cache,key,await fetch(request));}
  catch(error){const cached=await cache.match(key);if(cached)return cached;throw error;}
}
async function cacheFirst(request,key){
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(key);if(cached)return cached;
  return cacheResponse(cache,key,await fetch(request));
}
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  const scopePath=new URL(self.registration.scope).pathname;
  if(!url.pathname.startsWith(scopePath))return;
  const relativePath='/'+url.pathname.slice(scopePath.length);
  const key=normalizeKey(request);
  if(request.mode==='navigate'){event.respondWith(networkFirst(request,new Request(new URL('./index.html',self.registration.scope))));return;}
  if(FRESH_PATHS.has(relativePath)){event.respondWith(networkFirst(request,key));return;}
  event.respondWith(cacheFirst(request,key));
});
