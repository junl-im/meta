import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const scope='https://example.test/ai-cleaner/';

async function installWithFailures(failedPaths=[]){
  let installPromise;
  let activationCount=0;
  const self={
    registration:{scope},
    skipWaiting:async()=>{activationCount++;},
    addEventListener(name,handler){
      if(name==='install')handler({waitUntil(promise){installPromise=promise;}});
    }
  };
  const context={
    self,URL,Request,Set,Promise,
    caches:{open:async()=>({put:async()=>{}})},
    fetch:async request=>({ok:!failedPaths.some(path=>request.url.endsWith(path)),status:404})
  };
  vm.runInNewContext(source,context,{filename:'sw.js'});
  if(!installPromise)throw new Error('Service Worker install handler missing');
  let rejected=false;
  try{await installPromise;}catch{rejected=true;}
  return{rejected,activationCount};
}

for(const paths of [[],['/vendor/app-core.bundle.js'],['/js/app.js']]){
  const result=await installWithFailures(paths);
  if(result.rejected||result.activationCount!==1)throw new Error(`Completed shell was not activated: ${paths.join(', ')}`);
}
for(const paths of [
  ['/vendor/app-core.bundle.js','/js/app.js'],
  ['/index.html'],
  ['/css/app.css']
]){
  const result=await installWithFailures(paths);
  if(!result.rejected||result.activationCount!==0)throw new Error(`Incomplete offline shell activated: ${paths.join(', ')}`);
}
console.log('PASS offline shell install requires a complete executable runtime');

{
  let fetchHandler,networkOnline=true,networkCalls=0;
  const stale={ok:true,body:'old'};
  const fresh={ok:true,body:'new',clone(){return this;}};
  const cache={match:async()=>stale,put:async()=>{}};
  const self={location:{origin:'https://example.test'},registration:{scope},addEventListener(name,handler){if(name==='fetch')fetchHandler=handler;}};
  const context={self,URL,Request,Set,Promise,caches:{open:async()=>cache},fetch:async()=>{networkCalls++;if(!networkOnline)throw new Error('offline');return fresh;}};
  vm.runInNewContext(source,context,{filename:'sw.js'});
  const run=async url=>{let response;fetchHandler({request:{url,method:'GET',mode:'cors',headers:new Headers()},respondWith(promise){response=promise;}});return response;};
  const requestUrl=scope+'vendor/app-core.bundle.js?v=1350';
  if((await run(requestUrl)).body!=='new'||networkCalls!==1)throw new Error('Versioned asset returned stale cached runtime');
  networkOnline=false;
  if((await run(requestUrl)).body!=='old')throw new Error('Versioned asset lost offline fallback');
}
console.log('PASS versioned assets refresh online and remain available offline');
