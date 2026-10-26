import type {PanelElement,ProjectV4,SlicePreset} from './types.js'

/** Build an isolated print snapshot; preview zoom never changes output geometry. */
export function fourPanelPrintProject(project:ProjectV4,ids:string[],layout:'grid'|'vertical'):ProjectV4{
 if(ids.length!==4||new Set(ids).size!==4)throw new Error('서로 다른 네 컷을 편집기에 연결하세요.')
 const panels=ids.map(id=>project.elements.find((e):e is PanelElement=>e.id===id&&e.type==='panel'))
 if(panels.some(p=>!p||p.visible===false))throw new Error('삭제되거나 숨겨진 컷이 있습니다. 편집기에서 확인하세요.')
 if(panels.some(p=>p!.w!==690||!Number.isFinite(p!.h)||p!.h<1))throw new Error('원본 컷 가로를 690px로 맞춘 뒤 출력하세요.')
 const result=structuredClone(project),gap=24,columns=layout==='grid'?2:1
 if(panels.some(p=>!p!.sceneId)||new Set(panels.map(p=>p!.sceneId)).size!==4)throw new Error('네 컷이 각각 다른 장면에 연결되어야 합니다.')
 const rows=Array.from({length:4/columns},(_,r)=>Math.ceil(Math.max(...panels.slice(r*columns,(r+1)*columns).map(p=>p!.h))))
 result.canvas={width:columns*690+(columns-1)*gap,height:rows.reduce((a,b)=>a+b,0)+(rows.length-1)*gap,background:project.canvas.background}
 if(result.canvas.height/result.canvas.width*690>16000)throw new Error('한 장 출력 높이가 16,000px를 넘습니다. 컷 높이를 줄이세요.')
 result.elements=[];result.scenes=[]
 panels.forEach((p,i)=>{
  const panel=p!,row=Math.floor(i/columns),x=(i%columns)*(690+gap),y=rows.slice(0,row).reduce((a,b)=>a+b,0)+row*gap
  const sceneId=`four-print-${i}`
  result.scenes.push({id:sceneId,name:`${i+1}컷`,startY:y,collapsed:false})
  const elements=project.elements.filter(e=>e.visible!==false&&e.type!=='scene'&&(e.id===panel.id||!!panel.sceneId&&e.sceneId===panel.sceneId))
  for(const source of elements){const e=structuredClone(source);e.x+=x-panel.x;e.y+=y-panel.y;e.sceneId=sceneId;result.elements.push(e)}
 })
 return result
}
export const FOUR_PANEL_OUTPUT:SlicePreset={id:'four-panel-690',label:'4컷 완성 이미지 · 가로 690px',width:690,maxHeight:16000,maxBytes:5_000_000,totalMaxBytes:50_000_000,format:'jpg'}
