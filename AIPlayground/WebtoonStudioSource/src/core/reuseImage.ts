import type {ProjectV4} from './types.js'
import {placeAssetsAsPanels} from './assetPlacement.js'
export function reuseImage(project:ProjectV4,assetId:string,expectedSrc:string,targetId?:string,storyCutId?:string,uid?:()=>string){
 const asset=project.assets.find(a=>a.id===assetId);if(!asset||asset.src!==expectedSrc)throw new Error('라이브러리 이미지가 변경되거나 삭제됐습니다. 다시 선택하세요.')
 const target=targetId?project.elements.find(e=>e.id===targetId&&e.type==='panel'):undefined
 if(targetId&&!target)throw new Error('적용 대상 컷이 삭제됐습니다.')
 if(target?.locked||target?.visible===false)throw new Error('잠금·숨김을 해제한 뒤 적용하세요.')
 const previous=target?.type==='panel'?target.image:undefined
 const copy=structuredClone(asset);if(copy.generation){delete copy.generation.targetPanelId;delete copy.generation.storyCutId;delete copy.generation.newCut;if(targetId)copy.generation.targetPanelId=targetId;if(storyCutId)copy.generation.storyCutId=storyCutId}
 const ids=placeAssetsAsPanels(project,[copy],targetId,uid);for(const id of ids){const panel=project.elements.find(e=>e.id===id);if(panel?.type==='panel'){panel.imageFilter='none';const cut=project.storyboard?.cuts.find(c=>c.id===storyCutId);if(!panel.storyOrigin&&cut)panel.storyOrigin={cutId:cut.id,scene:cut.scene,action:cut.action,prompt:cut.prompt,sourceText:project.storyboard!.source.slice(cut.sourceStart,cut.sourceEnd),...(project.storyboard?.analysis?{analysis:structuredClone(project.storyboard.analysis)}:{})};if(panel.imageOrigin)panel.imageOrigin.targetPanelId=id}}
 if(ids.length&&previous&&!project.assets.some(a=>a.src===previous))project.assets.push({id:'original_'+(uid?uid():crypto.randomUUID()),name:'재사용 적용 전 원본',category:'원본',src:previous})
 return ids
}
