import type {ProjectV4,PanelElement} from './types.js'
export interface ImageRequestOrigin {targetPanelId?:string;storyCutId?:string}
export function imageDestination(project:ProjectV4,selectedIds:string[],origin?:ImageRequestOrigin,choice=''){
 const panels=project.elements.filter((e):e is PanelElement=>e.type==='panel')
 const candidates=origin?.targetPanelId?panels.filter(p=>p.id===origin.targetPanelId):origin?.storyCutId?panels.filter(p=>p.storyOrigin?.cutId===origin.storyCutId):panels.filter(p=>selectedIds.length===1&&p.id===selectedIds[0])
 if(choice==='new')return {candidates,mode:'new' as const,reason:''}
 const id=choice||origin?.targetPanelId||(candidates.length===1?candidates[0].id:undefined)
 const target=id?panels.find(p=>p.id===id):undefined
 if(choice&&target&&!candidates.some(p=>p.id===choice))candidates.unshift(target)
 const reason=id&&!target?'요청 대상 컷이 삭제됐습니다. 새 컷으로 추가를 선택하세요.':target?.locked?'대상 컷이 잠겨 있습니다. 잠금을 풀거나 새 컷으로 추가를 선택하세요.':target?.visible===false?'대상 컷이 숨겨져 있습니다. 표시하거나 새 컷으로 추가를 선택하세요.':candidates.length>1&&!choice?'이 콘티에 연결된 컷이 여러 개입니다. 결과를 적용할 컷을 선택하세요.':''
 return {candidates,target,mode:target?'existing' as const:'new' as const,reason}
}
