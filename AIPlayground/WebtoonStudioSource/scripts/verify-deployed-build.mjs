import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const source=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(source,'..');
const build=path.join(root,'dist-web');
const deployed=path.resolve(root,'../WebtoonStudio');
const index=await fs.readFile(path.join(build,'index.html'),'utf8');
const deployedIndex=await fs.readFile(path.join(deployed,'index.html'),'utf8');
const assets=[...index.matchAll(/(?:src|href)="\.\/assets\/([^"?]+)"/g)].map(match=>match[1]);
if(assets.length<2)throw Error('Vite JS/CSS assets missing from built index');
for(const name of assets){
  if(!deployedIndex.includes(`./assets/${name}`))throw Error(`Deployed index does not reference ${name}`);
  const a=await fs.readFile(path.join(build,'assets',name));
  const b=await fs.readFile(path.join(deployed,'assets',name));
  if(!a.equals(b))throw Error(`Deployed asset differs from source build: ${name}`);
}
const css=assets.find(name=>name.endsWith('.css'));
if(css){
  const style=await fs.readFile(path.join(build,'assets',css),'utf8');
  for(const [,name] of style.matchAll(/url\(\.?\/?([^()]+\.(?:png|webp|jpg))\)/g)){
    const built=await fs.readFile(path.join(build,'assets',name));
    const live=await fs.readFile(path.join(deployed,'assets',name));
    if(!built.equals(live))throw Error(`Deployed CSS asset differs: ${name}`);
  }
}
console.log(`Webtoon deployed build matches ${assets.join(', ')}`);
