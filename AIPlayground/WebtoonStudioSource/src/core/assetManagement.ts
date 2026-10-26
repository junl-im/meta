import type {Asset,PanelElement,ProjectV4} from './types.js'

/** Image bytes are shared by source, including assets with different IDs. */
export function assetPanels(project:ProjectV4,src:string):PanelElement[] {
  return project.elements.filter((e):e is PanelElement=>e.type==='panel'&&e.image===src)
}
export function removeUnusedAssets(project:ProjectV4):number {
  const used=new Set(project.elements.filter((e):e is PanelElement=>e.type==='panel').map(e=>e.image))
  const count=project.assets.length
  const referenced=new Set((project.characters||[]).map(c=>c.referenceAssetId))
  project.assets=project.assets.filter(a=>used.has(a.src)||referenced.has(a.id))
  return count-project.assets.length
}
export function replaceAssetImage(project:ProjectV4,assetId:string,expectedSrc:string,replacement:Asset):number {
  const asset=project.assets.find(a=>a.id===assetId)
  if(!asset||asset.src!==expectedSrc)throw new Error('교체 중 원본 이미지가 변경되었습니다. 다시 시도하세요.')
  if(!replacement.src.startsWith('data:image/')||!replacement.width||!replacement.height||!Number.isFinite(replacement.width)||!Number.isFinite(replacement.height)||replacement.width<=0||replacement.height<=0||replacement.width>30000||replacement.height>30000||replacement.width*replacement.height>80_000_000)throw new Error('교체 이미지의 크기 또는 형식이 올바르지 않습니다.')
  const panels=assetPanels(project,expectedSrc)
  if(panels.some(p=>p.locked))throw new Error('사용 중인 컷에 잠금이 있습니다. 잠금을 해제한 뒤 교체하세요.')
  for(const item of project.assets)if(item.src===expectedSrc){item.src=replacement.src;item.width=replacement.width;item.height=replacement.height;if(replacement.generation)item.generation=structuredClone(replacement.generation);else delete item.generation;if(item.id===assetId)item.name=replacement.name}
  for(const panel of panels){panel.image=replacement.src;if(replacement.generation)panel.imageOrigin=structuredClone(replacement.generation);else delete panel.imageOrigin}
  return panels.length
}
