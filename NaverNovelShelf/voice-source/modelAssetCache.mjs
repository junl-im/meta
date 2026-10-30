// Cache only the pinned public model revision. Manuscripts never enter this cache.
export function installModelAssetCache(scope, modelBase) {
  if (!scope.caches || typeof scope.fetch !== 'function') return;
  const networkFetch=scope.fetch.bind(scope);
  const allowed=new URL(modelBase);
  const prefix=allowed.pathname.endsWith('/')?allowed.pathname:allowed.pathname+'/';
  scope.fetch=async function(input,options){
    let request,url;
    try { request=new Request(input,options);url=new URL(request.url); } catch { return networkFetch(input,options); }
    if(request.method!=='GET'||url.origin!==allowed.origin||!url.pathname.startsWith(prefix)) return networkFetch(input,options);
    let cache;
    try { cache=await scope.caches.open('gomfox-listening-model-aafc6e32-v1');const saved=await cache.match(request);if(saved?.ok)return saved; } catch { /* Storage can be blocked or full. */ }
    const response=await networkFetch(input,options);
    if(cache && response.ok && response.type!=='opaque') {
      // Cache while the engine consumes the response; do not buffer a whole
      // large model in memory before the engine can begin reading it.
      try { void cache.put(request,response.clone()).catch(()=>{}); } catch { /* Playback still works without storage. */ }
    }
    return response;
  };
}
