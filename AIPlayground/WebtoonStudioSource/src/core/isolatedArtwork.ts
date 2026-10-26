import {artworkBounds} from './artworkBounds.js'
import {cloneProject} from './projectClone.js'
import type {ProjectV4} from './types.js'
export function isolatedArtwork(project:ProjectV4,id:string){
  const element=project.elements.find(e=>e.id===id)
  if(!element||element.type==='scene')throw new Error('저장할 요소를 선택하세요.')
  const bounds=artworkBounds(element),padding=12,x=Math.floor(bounds.left)-padding,y=Math.floor(bounds.top)-padding
  const width=Math.max(320,Math.ceil(bounds.right-x)+padding),height=Math.max(320,Math.ceil(bounds.bottom-y)+padding)
  if(!Number.isFinite(width)||!Number.isFinite(height)||width>4096||height>16000||width*height>32_000_000)throw new Error('선택 요소가 너무 큽니다. 크기나 효과 강도를 줄이세요.')
  const isolated=cloneProject(project);isolated.canvas={width,height,background:'transparent'};isolated.title=`${project.title} · ${element.name||'효과 소재'}`;isolated.scenes=[];isolated.elements=[{...cloneProject(element),x:element.x-x,y:element.y-y,visible:true}]
  return {project:isolated,preset:{id:'selected-png',label:'선택 요소 투명 PNG',width,maxHeight:height,format:'png' as const,maxBytes:25_000_000,totalMaxBytes:25_000_000}}
}
