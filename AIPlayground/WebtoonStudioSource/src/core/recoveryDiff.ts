import type { ProjectV4, RecoverySummary } from './types.js'

const count = (p: ProjectV4, type: string) => p.elements.filter(e => e.type === type).length

export function compareRecovery(saved: ProjectV4, recovery: ProjectV4): RecoverySummary {
  const before = { panels: count(saved,'panel'), bubbles: count(saved,'bubble'), assets: saved.assets.length, scenes: saved.scenes.length }
  const after  = { panels: count(recovery,'panel'), bubbles: count(recovery,'bubble'), assets: recovery.assets.length, scenes: recovery.scenes.length }
  const lines: string[] = []
  if (saved.title !== recovery.title) lines.push(`작품명: ${saved.title} → ${recovery.title}`)
  if (saved.episode !== recovery.episode) lines.push(`회차: ${saved.episode} → ${recovery.episode}`)
  for (const key of ['panels','bubbles','assets','scenes'] as const) {
    const delta = after[key] - before[key]
    const labels={panels:'컷',bubbles:'말풍선',assets:'이미지',scenes:'장면'}
    if (delta) lines.push(`${labels[key]}: ${delta > 0 ? '+' : ''}${delta}`)
  }
  if (saved.canvas.height !== recovery.canvas.height) lines.push(`캔버스 높이: ${saved.canvas.height} → ${recovery.canvas.height}`)
  if (saved.canvas.width !== recovery.canvas.width) lines.push(`캔버스 가로: ${saved.canvas.width} → ${recovery.canvas.width}`)
  if (saved.canvas.background !== recovery.canvas.background) lines.push(`배경색: ${saved.canvas.background} → ${recovery.canvas.background}`)
  if(JSON.stringify(saved.characters||[])!==JSON.stringify(recovery.characters||[]))lines.push('캐릭터 설정: 변경됨')
  const beforeElements=new Map(saved.elements.map(element=>[element.id,element]))
  const afterElements=new Map(recovery.elements.map(element=>[element.id,element]))
  let changedElements=0
  for(const id of new Set([...beforeElements.keys(),...afterElements.keys()])) {
    if(JSON.stringify(beforeElements.get(id))!==JSON.stringify(afterElements.get(id)))changedElements++
  }
  if(changedElements)lines.push(`요소 내용: ${changedElements}개 차이`)
  if (saved.revision !== recovery.revision) lines.push(`편집 기록: ${saved.revision} → ${recovery.revision}`)
  return {
    changed: lines.length > 0,
    lines: lines.length ? lines : ['기본 비교 항목에서 차이가 없습니다.'],
    counts: {
      panels: [before.panels, after.panels],
      bubbles: [before.bubbles, after.bubbles],
      assets: [before.assets, after.assets],
      scenes: [before.scenes, after.scenes]
    }
  }
}
