import type { Asset, PanelElement, ProjectV4 } from './types.js'

export function placeAssetsAsPanels(project: ProjectV4, assets: Asset[], targetPanelId?: string, createId: () => string = () => `panel_${globalThis.crypto.randomUUID()}`): string[] {
  if (assets.length === 0) return []
  const ids: string[] = []
  let start = 0
  const target = targetPanelId ? project.elements.find((element): element is PanelElement => element.id === targetPanelId && element.type === 'panel') : undefined
  if (targetPanelId && (!target || target.locked || target.visible === false)) return []
  const width = Math.max(160, Math.min(740, project.canvas.width - 160))
  const panels = project.elements.filter((element): element is PanelElement => element.type === 'panel')
  let y = panels.length ? Math.max(...panels.map(panel => panel.y + panel.h)) + 40 : 120
  // Validate the entire batch before replacing a target or adding any panels.
  let plannedBottom=y
  for(const asset of assets.slice(target?1:0)){
    const aspectHeight=asset.width&&asset.height?Math.round(width*asset.height/asset.width):Math.round(width*.58)
    plannedBottom+=Math.max(120,Math.min(1800,aspectHeight))+40
  }
  if(assets.length>(target?1:0)&&(!Number.isFinite(plannedBottom)||plannedBottom+80>100000))throw new Error('이미지 컷을 모두 배치하면 원고 길이 100,000px 한도를 넘습니다. 이미지를 나누어 배치하거나 기존 컷에 적용하세요.')
  if (target) {
    target.image = assets[0].src
    if(assets[0].generation)target.imageOrigin=structuredClone(assets[0].generation);else delete target.imageOrigin
    target.imageFit = target.imageFit || 'cover'
    target.imageTransform = target.imageTransform || { zoom: 1, offsetX: 0, offsetY: 0, flipX: false }
    ids.push(target.id)
    start = 1
  }

  for (const asset of assets.slice(start)) {
    const aspectHeight = asset.width && asset.height ? Math.round(width * asset.height / asset.width) : Math.round(width * 0.58)
    const height = Math.max(120, Math.min(1800, aspectHeight))
    const imageFit = aspectHeight < 120 || aspectHeight > 1800 ? 'contain' : 'cover'
    const id = createId()
    const panel: PanelElement = {
      id,
      type: 'panel',
      x: Math.max(0, Math.round((project.canvas.width - width) / 2)),
      y,
      w: width,
      h: height,
      z: project.elements.reduce((max, element) => Math.max(max, element.z), 0) + 1,
      name: asset.name.replace(/\.[^.]+$/, '') || '이미지 컷',
      sceneId: project.scenes[0]?.id,
      fill: '#fff',
      stroke: '#111',
      strokeWidth: 3,
      image: asset.src,
      imageOrigin: asset.generation ? structuredClone(asset.generation) : undefined,
      imageFit,
      imageTransform: { zoom: 1, offsetX: 0, offsetY: 0, flipX: false },
    }
    project.elements.push(panel)
    ids.push(id)
    y += height + 40
  }
  if (ids.some(id => !target || id !== target.id)) project.canvas.height = Math.max(project.canvas.height, y + 80)
  return ids
}
