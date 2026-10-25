import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),electron=require('electron')
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--config','vite.web.config.ts','--host','127.0.0.1','--port','45173','--strictPort'],{stdio:'ignore',windowsHide:true})
try{
  let ready=false
  for(let i=0;i<50;i++){try{const response=await fetch('http://127.0.0.1:45173/');if(response.ok&&(await response.text()).includes('WEBTOON STUDIO')){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,100))}
  if(!ready)throw Error('웹 미리보기 서버를 시작하지 못했습니다.')
  const code=await new Promise((resolve,reject)=>{const child=spawn(electron,['tests/webAcceptance.cjs'],{stdio:'inherit',windowsHide:true,env:{...process.env,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});child.on('error',reject);child.on('exit',resolve)})
  if(code)process.exitCode=code||1
}finally{server.kill()}
