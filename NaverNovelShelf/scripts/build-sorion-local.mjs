import {build} from 'esbuild';
import {mkdir,copyFile} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const runtime=path.join(root,'NaverNovelShelf/site/voice-runtime');
await mkdir(runtime,{recursive:true});
await build({entryPoints:['NaverNovelShelf/voice-source/worker.ts'],outfile:'NaverNovelShelf/site/sorion-local-worker.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,logLevel:'warning'});
for(const file of ['ort-wasm-simd-threaded.mjs','ort-wasm-simd-threaded.wasm'])await copyFile(path.join(root,'node_modules/onnxruntime-web/dist',file),path.join(runtime,file));
console.log('SoriON local narration worker and WASM runtime built');
