import {strFromU8,strToU8,unzipSync,zipSync} from 'fflate'
import {migrateProject} from '@core/migrate'
import type {ProjectV4} from '@core/types'

export const MAX_PACKAGE=100*1024*1024
const MAX_ASSETS=300*1024*1024
const imageMimes:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif'}
const extension:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}
const bytesFromData=(data:string)=>Uint8Array.from(atob(data),char=>char.charCodeAt(0))
const dataFromBytes=(bytes:Uint8Array,mime:string)=>{let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return `data:${mime};base64,${btoa(binary)}`}
const sha=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource)),byte=>byte.toString(16).padStart(2,'0')).join('')

export async function encodeBrowserProject(input:ProjectV4):Promise<Uint8Array>{
  const project:ProjectV4=structuredClone(input),files:Record<string,Uint8Array>={},dedupe=new Map<string,string>()
  let sequence=0
  const externalize=async(src?:string):Promise<string|undefined>=>{
    if(!src)return src
    const match=/^data:([^;,]+);base64,(.+)$/s.exec(src)
    if(!match)return src
    const bytes=bytesFromData(match[2]),digest=await sha(bytes)
    let path=dedupe.get(digest)
    if(!path){path=`assets/${String(++sequence).padStart(4,'0')}.${extension[match[1]]||'bin'}`;files[path]=bytes;dedupe.set(digest,path)}
    return `asset://${path}`
  }
  for(const asset of project.assets)asset.src=(await externalize(asset.src))||''
  for(const element of project.elements)if(element.type==='panel'&&element.image)element.image=await externalize(element.image)
  project.updatedAt=new Date().toISOString();project.revision++
  const body=strToU8(JSON.stringify(project,null,2));files['project.json']=body
  files['manifest.json']=strToU8(JSON.stringify({format:'WEBTOON_STUDIO_PACKAGE',packageVersion:1,schemaVersion:4,projectId:project.id,title:project.title,savedAt:project.updatedAt,projectSha256:await sha(body),assetCount:sequence},null,2))
  return zipSync(files,{level:6})
}

export async function decodeBrowserProject(bytes:Uint8Array):Promise<ProjectV4>{
  if(bytes.byteLength>MAX_PACKAGE)throw Error('작품 파일이 100MB를 넘습니다. 데스크톱 편집기에서 열어 주세요.')
  if(bytes[0]!==0x50||bytes[1]!==0x4b)return migrateProject(JSON.parse(strFromU8(bytes)))
  let declaredSize=0
  // Check each ZIP entry before its output buffer is allocated or inflated.
  const files=unzipSync(bytes,{filter:entry=>{if(!Number.isSafeInteger(entry.originalSize)||entry.originalSize<0||(declaredSize+=entry.originalSize)>MAX_ASSETS)throw Error('압축을 푼 작품이 300MB를 넘습니다.');return true}}),body=files['project.json']
  if(!body)throw Error('project.json이 없는 .wtoon 파일입니다.')
  if(Object.values(files).reduce((size,file)=>size+file.byteLength,0)>MAX_ASSETS)throw Error('압축을 푼 작품이 300MB를 넘습니다.')
  const manifest=files['manifest.json']?JSON.parse(strFromU8(files['manifest.json'])):null
  if(manifest?.projectSha256&&manifest.projectSha256!==await sha(body))throw Error('원고 검사값이 맞지 않습니다. 파일 손상 여부를 확인하세요.')
  const raw=JSON.parse(strFromU8(body))
  const restore=(src?:string)=>{
    if(typeof src!=='string'||!src)return src
    if(src.startsWith('data:image/'))return src
    if(!src.startsWith('asset://'))throw Error('외부 주소 이미지는 웹 시험판에서 자동으로 불러오지 않습니다. 파일을 확인해 주세요.')
    const path=src.slice('asset://'.length),data=files[path]
    if(!data)throw Error(`작품에서 이미지 ${path}를 찾지 못했습니다.`)
    return dataFromBytes(data,imageMimes[path.split('.').at(-1)?.toLowerCase()||'']||'application/octet-stream')
  }
  if(Array.isArray(raw.assets))for(const asset of raw.assets)asset.src=restore(asset.src)
  if(Array.isArray(raw.elements))for(const element of raw.elements)if(element.type==='panel')element.image=restore(element.image)
  return migrateProject(raw)
}

export function download(bytes:Uint8Array,name:string,mime='application/octet-stream'){
  const blob=new Blob([bytes as BlobPart],{type:mime}),url=URL.createObjectURL(blob),link=document.createElement('a')
  link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000)
}
