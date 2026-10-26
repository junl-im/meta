import type {ProjectV4} from './types.js'
import {readFourPanelText} from './fourPanelPlan.js'

export function linkedFourPanelScripts(project:ProjectV4,ids:string[],fallback:string):string[]{
 let previous:string[]=[]
 try{const value=JSON.parse(fallback);if(Array.isArray(value)&&value.length===4&&value.every(v=>typeof v==='string'&&v.length<=4000))previous=value}catch{}
 return ids.map((id,i)=>{const cut=project.elements.find(e=>e.id===id&&e.type==='panel');return cut?.type==='panel'?(cut.fourPanelScript??previous[i]??''):''})
}

/** Only replace generated script text. Artist edits and finished cuts are protected. */
export function syncFourPanelScript(project:ProjectV4,ids:string[],before:string[],after:string[],uid:()=>string){
 if(ids.length!==4||new Set(ids).size!==4||before.length!==4||after.length!==4)throw Error('연결된 네 컷 정보가 올바르지 않습니다.')
 const synced:number[]=[],skipped:Array<{index:number;reason:string}>=[]
 after.forEach((text,index)=>{
  if(text===before[index])return
  const cut=project.elements.find(e=>e.id===ids[index]&&e.type==='panel')
  if(!cut||cut.type!=='panel'){skipped.push({index,reason:'연결된 컷 없음'});return}
  const children=project.elements.filter(e=>e.sceneId===cut.sceneId)
  if(cut.locked||children.some(e=>e.locked)){skipped.push({index,reason:'잠금 상태'});return}
  const previous=readFourPanelText(cut.fourPanelScript??before[index],index),next=readFourPanelText(text,index)
  const notes=children.filter(e=>e.type==='text'&&e.name==='콘티 연출 메모')
  const bubbles=children.filter(e=>e.type==='bubble'&&e.name==='콘티 대사')
  if(notes.length!==1||bubbles.length>1|| (previous.dialogue&&bubbles.length!==1)||notes.some(e=>e.type==='text'&&e.text!==previous.action)||bubbles.some(e=>e.type==='bubble'&&e.text!==previous.dialogue)){
   skipped.push({index,reason:'편집기에서 수정한 대사·메모 보호'});return
  }
  const note=notes[0];if(note.type==='text')note.text=next.action
  const bubble=bubbles[0]
  if(bubble&&bubble.type==='bubble')bubble.text=next.dialogue
  else if(next.dialogue)project.elements.push({id:uid(),type:'bubble',kind:'speech',name:'콘티 대사',text:next.dialogue,x:cut.x+24,y:cut.y+290,w:Math.min(380,cut.w-48),h:170,z:Math.max(0,...project.elements.map(e=>e.z))+1,sceneId:cut.sceneId,fontSize:26,fill:'#ffffff',stroke:'#111111',strokeWidth:2})
  cut.name=`콘티 ${index+1} · ${next.action.slice(0,60)}`
  if(cut.storyOrigin)Object.assign(cut.storyOrigin,{scene:next.scene,action:next.action,prompt:next.prompt})
  cut.fourPanelScript=text
  synced.push(index)
 })
 return {synced,skipped}
}
