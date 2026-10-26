import type {ProjectV4,PanelElement} from './types.js'
import type {StoryCut} from './storyboard.js'
export function storyImagePreparation(project:ProjectV4,cut:StoryCut){
 const targets=cut.id?project.elements.filter((e):e is PanelElement=>e.type==='panel'&&e.storyOrigin?.cutId===cut.id):[]
 if(cut.imagePlan!=='generate')return {status:'not-needed',reason:'새 이미지 생성 대상으로 표시하지 않았습니다.'}
 if(!cut.reviewed)return {status:'review',reason:'먼저 원문과 비교·검토 완료를 표시하세요.'}
 if(!cut.prompt.trim())return {status:'prompt',reason:'이미지 제작 지시를 입력하세요.'}
 if(!cut.id)return {status:'identity',reason:'콘티 식별자가 없습니다. 프로젝트를 저장하고 다시 여세요.'}
 if(targets.length>1)return {status:'ambiguous',reason:'연결된 컷이 여러 개입니다. 이미지 작업실에서 적용 대상을 직접 고르세요.'}
 const target=targets[0]
 if(target&&(target.locked||target.visible===false))return {status:'blocked',reason:'연결된 컷의 잠금·숨김을 해제하세요.'}
 if(target?.image)return {status:'placed',reason:'연결된 컷에 이미지가 있습니다. 재생성이 필요하면 개별 이미지 준비를 사용하세요.',targetId:target.id}
 return {status:'ready',reason:target?'연결된 빈 컷에 요청을 준비합니다.':'새 컷으로 요청을 준비합니다.',targetId:target?.id}
}
