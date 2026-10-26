import type { EditorElement, ProjectV4, SlicePlan, SlicePreset, SliceSegment } from './types.js'
import {artworkBounds} from './artworkBounds.js'

function intersectsAtY(e: EditorElement, y: number) {
  if (e.visible === false || e.type === 'scene') return false
  const bounds=artworkBounds(e);return bounds.top<y&&bounds.bottom>y
}

function safeCandidates(project: ProjectV4): number[] {
  const points = new Set<number>([0, project.canvas.height])
  const blocks = project.elements
    .filter(e => e.visible !== false && e.type !== 'scene')
    .map(e => {const bounds=artworkBounds(e);return {top:Math.max(0,bounds.top),bottom:Math.min(project.canvas.height,bounds.bottom)}})
    .sort((a,b)=>a.top-b.top)
  let cursor = 0
  for (const b of blocks) {
    if (b.top - cursor >= 20) points.add(Math.round((cursor + b.top) / 2))
    cursor = Math.max(cursor, b.bottom)
  }
  if (project.canvas.height - cursor >= 20) points.add(Math.round((cursor + project.canvas.height) / 2))
  for (const s of project.scenes) if (s.startY > 0) points.add(Math.round(s.startY))
  return [...points].sort((a,b)=>a-b)
}

export function planSmartSlices(project: ProjectV4, preset: SlicePreset): SlicePlan {
  for (const [label, value] of [['원고 가로', project.canvas.width], ['원고 세로', project.canvas.height], ['출력 가로', preset.width], ['조각 세로', preset.maxHeight]] as const) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label}는 양의 정수여야 합니다.`)
  }
  const scale = preset.width / project.canvas.width
  const maxSourceHeight = Math.floor(preset.maxHeight / scale)
  if (maxSourceHeight < 1) throw new Error('출력 가로에 비해 조각 세로가 너무 작습니다. 조각 세로를 늘려주세요.')
  const candidates = safeCandidates(project)
  const segments: SliceSegment[] = []
  const warnings: string[] = []
  if(preset.id==='instatoon-1080'){
    if(preset.width!==1080||project.canvas.width!==1080||![1080,1350].includes(preset.maxHeight)||project.canvas.height%preset.maxHeight!==0||project.canvas.height/preset.maxHeight>20)throw Error('인스타툰 페이지 규격이 올바르지 않습니다.')
    for(let y=0;y<project.canvas.height;y+=preset.maxHeight)segments.push({index:segments.length+1,startY:y,endY:y+preset.maxHeight,height:preset.maxHeight,breakReason:'hard-limit',intersectingElementIds:[]})
    return {preset,sourceWidth:project.canvas.width,sourceHeight:project.canvas.height,scale,segments,warnings}
  }
  let start = 0
  let index = 1

  while (start < project.canvas.height) {
    if (index > 1000) throw new Error('분할이 1,000개를 초과합니다. 조각 세로를 늘려주세요. 원고 일부만 처리한 계획은 저장하지 않습니다.')
    const hardEnd = Math.min(project.canvas.height, start + maxSourceHeight)
    if (hardEnd >= project.canvas.height) {
      segments.push({ index, startY:start, endY:project.canvas.height, height:project.canvas.height-start, breakReason:'end', intersectingElementIds:[] })
      break
    }
    const lower = start + Math.floor(maxSourceHeight * 0.58)
    const viable = candidates.filter(y => y > lower && y <= hardEnd)
    let end = viable.at(-1) ?? hardEnd
    let reason: SliceSegment['breakReason'] = viable.length ? 'safe-gap' : 'hard-limit'
    let hits = project.elements.filter(e => intersectsAtY(e,end)).map(e=>e.id)

    if (hits.length && reason === 'safe-gap') {
      const clean = [...viable].reverse().find(y => !project.elements.some(e => intersectsAtY(e,y)))
      if (clean) { end = clean; hits = []; }
    }
    if (hits.length) warnings.push(`분할 ${index}: ${hits.length}개 요소와 경계가 겹칩니다.`)
    segments.push({ index, startY:start, endY:end, height:end-start, breakReason:reason, intersectingElementIds:hits })
    start = end
    index++
  }
  return { preset, sourceWidth:project.canvas.width, sourceHeight:project.canvas.height, scale, segments, warnings }
}

export const EXPORT_PRESETS: SlicePreset[] = [
  { id:'naver-challenge', label:'네이버 도전만화 · 690px', width:690, maxHeight:5000, maxBytes:5_000_000, totalMaxBytes:50_000_000, allowedFormats:['jpg','gif'], format:'jpg' },
  { id:'tapas', label:'Tapas 웹툰', width:940, maxHeight:6000, maxBytes:10_000_000, format:'jpg' },
  { id:'generic-800', label:'일반 웹툰 800px', width:800, maxHeight:6000, format:'png' }
]
