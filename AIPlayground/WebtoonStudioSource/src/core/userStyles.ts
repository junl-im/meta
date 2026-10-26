import type { EditorElement } from './types.js'

export interface UserStyle { name:string; type:'panel'|'bubble'|'text'; appearance:Record<string,unknown> }
const common = ['fill','stroke','strokeWidth','strokeOpacity','fillOpacity']
const text = ['fontSize','fontWeight','fontFamily','color','align','textEffect']
const keys = {panel:[...common,'shape','clipPoints'],bubble:[...common,...text,'kind'],text}
const enums:Record<string,string[]> = {shape:['rect','rounded','ellipse','slant-left','slant-right','trapezoid','diamond','hexagon','polygon'],kind:['speech','thought','shout','whisper','narration','cloud','burst','tremble','radio','rounded'],align:['left','center','right']}
const ranges:Record<string,[number,number]> = {fontSize:[1,512],strokeWidth:[0,100],strokeOpacity:[0,1],fillOpacity:[0,1],outlineWidth:[0,12],shadowSize:[0,24],letterSpacing:[-3,16],lineHeight:[.8,2.5],slant:[-20,20]}
function clean(key:string,value:unknown):unknown {
  if(ranges[key]) {const [min,max]=ranges[key];return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max?value:undefined}
  if(enums[key])return typeof value==='string'&&enums[key].includes(value)?value:undefined
  if(['fill','stroke','color','outlineColor','shadowColor','gradient'].includes(key))return typeof value==='string'&&/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value)?value:undefined
  if(key==='fontFamily'||key==='fontWeight'||key==='preset')return typeof value==='string'&&value.length<=120&&!/[<>;{}\n\r]/.test(value)?value:undefined
  if(key==='glow')return typeof value==='boolean'?value:undefined
  if(key==='clipPoints')return Array.isArray(value)&&value.length>=3&&value.length<=16&&value.every(p=>p&&typeof p.x==='number'&&typeof p.y==='number'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)?value.map(p=>({x:p.x,y:p.y})):undefined
  if(key==='textEffect'&&value&&typeof value==='object') {const out:Record<string,unknown>={};for(const k of ['preset','outlineColor','outlineWidth','shadowColor','shadowSize','glow','letterSpacing','lineHeight','slant','gradient']){const v=clean(k,(value as Record<string,unknown>)[k]);if(v!==undefined)out[k]=v}return out}
  return undefined
}
export function readUserStyles(value:unknown):UserStyle[] {
  if(!Array.isArray(value)||value.length>50)throw new Error('스타일은 최대 50개까지 불러올 수 있습니다.')
  return value.map(item=>{
    if(!item||!['panel','bubble','text'].includes(item.type)||typeof item.name!=='string'||!item.name.trim()||item.name.length>60||!item.appearance||typeof item.appearance!=='object')throw new Error('올바른 스타일 파일이 아닙니다.')
    const type=item.type as UserStyle['type'],appearance:Record<string,unknown>={}
    for(const key of keys[type]){const v=clean(key,item.appearance[key]);if(v!==undefined)appearance[key]=v}
    if(type==='bubble'&&!appearance.kind)throw new Error('말풍선 종류가 올바르지 않습니다.')
    if(type==='panel'&&appearance.shape==='polygon'&&!appearance.clipPoints)throw new Error('다각형 꼭짓점이 올바르지 않습니다.')
    return {name:item.name.trim(),type,appearance}
  })
}
export function captureUserStyle(element:EditorElement,name:string):UserStyle {
  if(!['panel','bubble','text'].includes(element.type))throw new Error('컷·말풍선·텍스트만 저장할 수 있습니다.')
  return readUserStyles([{name,type:element.type,appearance:element}])[0]
}
export function applyUserStyle(element:EditorElement,style:UserStyle):boolean {
  const safe=readUserStyles([style])[0]
  if(element.locked||element.type!==safe.type)return false
  const target=element as unknown as Record<string,unknown>
  for(const key of keys[safe.type])delete target[key]
  Object.assign(target,structuredClone(safe.appearance))
  return true
}
