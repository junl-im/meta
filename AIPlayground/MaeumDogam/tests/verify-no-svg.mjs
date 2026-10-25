import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const root=fileURLToPath(new URL("../",import.meta.url));
const blockedFiles=[];
const blockedReferences=[];
const textTypes=new Set([".html",".css",".js",".mjs",".json"]);
const ownFile=path.basename(fileURLToPath(import.meta.url));
async function scan(directory){
  const entries=await readdir(directory,{withFileTypes:true});
  for(const entry of entries){
    const full=path.join(directory,entry.name);
    const relative=path.relative(root,full);
    if(entry.isDirectory()){await scan(full);continue;}
    if(!entry.isFile())continue;
    const ext=path.extname(entry.name).toLowerCase();
    if(ext===".svg"||ext===".svgz"){blockedFiles.push(relative);continue;}
    if(!textTypes.has(ext)||entry.name===ownFile)continue;
    const text=await readFile(full,"utf8");
    const patterns=[
      /<svg\b/i,
      /image\/svg\+xml/i,
      /w3\.org\/2000\/svg/i,
      /\.(?:svg|svgz)(?:[\s"'\x60)?#]|$)/i
    ];
    if(patterns.some(rule=>rule.test(text)))blockedReferences.push(relative);
  }
}
await scan(root);
assert.deepEqual(blockedFiles,[],"SVG 이미지 파일 사용 금지");
assert.deepEqual(blockedReferences,[],"코드 내 SVG 삽입·참조 금지");
console.log("PASS: SVG 이미지·인라인·data URI·외부 참조 없음");
