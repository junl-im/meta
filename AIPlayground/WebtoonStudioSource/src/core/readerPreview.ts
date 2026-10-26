import type {EditorElement} from './types.js'
export const READER_DEVICES=[
 {id:'compact',label:'작은 화면',width:360,height:640},
 {id:'standard',label:'보통 화면',width:390,height:844},
 {id:'large',label:'큰 화면',width:430,height:932},
] as const
export type ReaderDeviceId=typeof READER_DEVICES[number]['id']
export function readerDevice(value:unknown){return READER_DEVICES.find(d=>d.id===value)||READER_DEVICES[0]}
export function fitReaderDevice(value:unknown,availableWidth:number,availableHeight:number){
 const device=readerDevice(value)
 const width=Number.isFinite(availableWidth)?Math.max(1,availableWidth):device.width
 const height=Number.isFinite(availableHeight)?Math.max(1,availableHeight):device.height
 const factor=Math.min(1,width/device.width,height/device.height)
 return {device,factor,width:device.width*factor,height:device.height*factor}
}
export function readingCuts(elements:readonly EditorElement[]){
 return elements.filter(e=>e.type==='panel'&&e.visible!==false&&Number.isFinite(e.y)).sort((a,b)=>a.y-b.y||a.x-b.x||a.z-b.z)
}
export function readingCutIndex(cuts:readonly EditorElement[],sourceY:number,viewportHeight=0){
 if(!cuts.length)return -1
 let index=0
 for(let i=1;i<cuts.length;i++){if(cuts[i].y>sourceY+1)break;index=i}
 if(index+1<cuts.length&&Number.isFinite(cuts[index].h)&&sourceY>cuts[index].y+cuts[index].h&&cuts[index+1].y<sourceY+viewportHeight)return index+1
 return index
}
