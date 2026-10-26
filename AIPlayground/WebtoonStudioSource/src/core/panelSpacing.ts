import type {ProjectV4} from './types.js'
import {artworkBounds} from './artworkBounds.js'
export function planPanelSpacing(project:ProjectV4,panelId:string,amount:number){
 const panel=project.elements.find(e=>e.id===panelId)
 if(panel?.type!=='panel'||panel.locked)throw new Error('잠기지 않은 컷을 선택하세요.')
 if(!Number.isFinite(amount)||amount===0||Math.abs(amount)>5000)throw new Error('변경할 여백은 1~5,000px로 입력하세요.')
 const boundary=Math.ceil(artworkBounds(panel).bottom),others=project.elements.filter(e=>e.id!==panelId),bounds=others.map(e=>({element:e,bounds:artworkBounds(e)}))
 if(bounds.some(({bounds:b})=>b.top<boundary&&b.bottom>boundary))throw new Error('컷 아래 경계에 걸친 말풍선·그림이 있습니다. 해당 요소를 위나 아래로 옮긴 뒤 여백을 조절하세요.')
 const following=bounds.filter(({bounds:b})=>b.top>=boundary)
 if(following.some(({element:e})=>e.locked))throw new Error('뒤쪽에 잠긴 요소가 있어 함께 이동할 수 없습니다. 잠금을 해제하세요.')
 const movingIds=new Set(following.map(({element:e})=>e.id)),stationaryGroups=new Set(project.elements.filter(e=>!movingIds.has(e.id)).map(e=>e.groupId).filter(Boolean))
 if(following.some(({element:e})=>e.groupId&&stationaryGroups.has(e.groupId)))throw new Error('같은 그룹의 요소가 경계 위아래에 나뉘어 있습니다. 그룹을 해제하거나 함께 이동하세요.')
 const nextTop=Math.min(project.canvas.height,...following.map(({bounds:b})=>b.top),...project.scenes.filter(s=>s.startY>=boundary).map(s=>s.startY))
 const available=Math.max(0,Math.floor(nextTop-boundary)),delta=amount<0?-Math.min(Math.round(-amount),available):Math.round(amount)
 if(!delta)throw new Error('줄일 수 있는 빈 여백이 없습니다.')
 if(project.canvas.height+delta>100000)throw new Error('원고 길이100,000px 제한을 넘습니다.')
 if(project.canvas.height+delta<320)throw new Error('원고의 최소 길이320px를 유지해야 합니다.')
 return {boundary,delta,available,elementIds:following.map(({element:e})=>e.id),sceneIds:project.scenes.filter(s=>s.startY>=boundary).map(s=>s.id)}
}
export function adjustPanelSpacing(project:ProjectV4,panelId:string,amount:number){
 const plan=planPanelSpacing(project,panelId,amount),ids=new Set(plan.elementIds),scenes=new Set(plan.sceneIds)
 for(const e of project.elements)if(ids.has(e.id))e.y+=plan.delta
 for(const s of project.scenes)if(scenes.has(s.id))s.startY+=plan.delta
 project.canvas.height+=plan.delta
 return plan
}
