import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const scope='https://example.test/ai-cleaner/';

async function installWithFailures(failedPaths=[]){
  let installPromise;
  const self={
    registration:{scope},
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
  return installPromise;
}

await installWithFailures();
await installWithFailures(['/vendor/app-core.bundle.js']);
await installWithFailures(['/js/app.js']);
for(const paths of [
  ['/vendor/app-core.bundle.js','/js/app.js'],
  ['/index.html'],
  ['/css/app.css']
]){
  let rejected=false;
  try{await installWithFailures(paths);}catch{rejected=true;}
  if(!rejected)throw new Error(`Incomplete offline shell activated: ${paths.join(', ')}`);
}
console.log('PASS offline shell install requires a complete executable runtime');
