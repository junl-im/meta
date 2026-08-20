import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'ai-cleaner','vendor');

const APP_CORE_SOURCES=[
  'ai-cleaner/js/core/event-bus.js','ai-cleaner/js/core/history-store.js','ai-cleaner/js/core/work-lock.js','ai-cleaner/js/core/text-utils.js',
  'ai-cleaner/js/core/state-store.js','ai-cleaner/js/core/text-engine.js','ai-cleaner/js/core/diff-engine.js','ai-cleaner/js/services/analysis-worker-adapter.js',
  'ai-cleaner/js/services/analysis-performance-governor.js','ai-cleaner/js/services/analysis-coordinator.js','ai-cleaner/js/services/update-manager.js',
  'ai-cleaner/js/ui/panel-manager.js','ai-cleaner/js/ui/diff-view.js','ai-cleaner/js/features/file-import.js','ai-cleaner/js/features/typewriter-engine.js',
  'ai-cleaner/js/features/result-checkpoint-store.js','ai-cleaner/js/app.js'
];
async function buildAppCoreBundle(){
  const chunks=[];
  for(const relative of APP_CORE_SOURCES){
    const source=await fs.readFile(path.join(ROOT,relative),'utf8');
    chunks.push(`/* ${relative} */\n${source.trim()}\n`);
  }
  const banner='/* AI Cleaner app core bundle. Generated from first-party sources; edit source files, not this output. */\n';
  await fs.writeFile(path.join(OUT,'app-core.bundle.js'),banner+chunks.join('\n;\n')+'\n');
}

async function packageRootFrom(entry,expectedName){
  let dir=path.dirname(entry);
  for(let i=0;i<12;i++){
    const packageJson=path.join(dir,'package.json');
    try{const meta=JSON.parse(await fs.readFile(packageJson,'utf8'));if(meta.name===expectedName)return dir;}catch(_){}
    const parent=path.dirname(dir);if(parent===dir)break;dir=parent;
  }
  throw new Error(`package root not found: ${expectedName}`);
}
async function copyLicense(packageRoot,outName){
  const names=(await fs.readdir(packageRoot)).filter(name=>/^licen[sc]e(?:\.|$)/i.test(name));
  if(!names.length)throw new Error(`license file missing: ${packageRoot}`);
  await fs.mkdir(path.join(OUT,'licenses'),{recursive:true});
  await fs.copyFile(path.join(packageRoot,names[0]),path.join(OUT,'licenses',outName));
}
async function resolveFile(specifier){return fileURLToPath(import.meta.resolve(specifier));}

async function main(){
  await fs.rm(OUT,{recursive:true,force:true});await fs.mkdir(OUT,{recursive:true});
  await build({stdin:{contents:"import ExifReader from 'exifreader';globalThis.ExifReader=ExifReader;",resolveDir:ROOT,sourcefile:'exifreader-entry.js'},bundle:true,format:'iife',platform:'browser',target:['es2020'],minify:true,legalComments:'none',outfile:path.join(OUT,'exif-reader.js')});
  await build({stdin:{contents:"export { createC2pa } from '@contentauth/c2pa-web';",resolveDir:ROOT,sourcefile:'c2pa-web-entry.js'},bundle:true,format:'esm',platform:'browser',target:['es2020'],minify:true,legalComments:'none',outfile:path.join(OUT,'c2pa-web.js')});
  await buildAppCoreBundle();

  const c2paWasm=await resolveFile('@contentauth/c2pa-web/resources/c2pa.wasm');
  await fs.copyFile(c2paWasm,path.join(OUT,'c2pa_bg.wasm'));
  const exifEntry=await resolveFile('exifreader'),c2paEntry=await resolveFile('@contentauth/c2pa-web');
  const exifRoot=await packageRootFrom(exifEntry,'exifreader'),c2paRoot=await packageRootFrom(c2paEntry,'@contentauth/c2pa-web');
  await copyLicense(exifRoot,'ExifReader-MPL-2.0.txt');await copyLicense(c2paRoot,'c2pa-web-MIT.txt');
  const versions={generatedAt:new Date().toISOString(),packages:{exifreader:'4.42.0','@contentauth/c2pa-web':'0.13.4'},appCore:{files:APP_CORE_SOURCES.length,output:'app-core.bundle.js'}};
  await fs.writeFile(path.join(OUT,'versions.json'),JSON.stringify(versions,null,2)+'\n');
  await fs.writeFile(path.join(OUT,'THIRD_PARTY_NOTICES.txt'),'Runtime image-analysis dependencies are bundled locally for the deployed site.\nExifReader 4.42.0 — MPL-2.0 — https://github.com/mattiasw/ExifReader\n@contentauth/c2pa-web 0.13.4 — MIT — https://github.com/contentauth/c2pa-js\nSee vendor/licenses for license texts.\n');
  const files=await fs.readdir(OUT);console.log(`Runtime vendor ready: ${files.join(', ')}`);
}
main().catch(error=>{console.error(`Runtime vendor build failed: ${error?.message||error}`);process.exitCode=1;});
