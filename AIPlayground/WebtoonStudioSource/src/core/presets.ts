import { createDefaultProject } from './defaultProject.js'
import type { BubbleKind, BubbleElement, PanelElement, ProjectV4 } from './types.js'

export type CanvasPresetId = 'scroll' | 'four-cut' | 'six-cut' | 'storyboard'
export interface CanvasPreset { id: CanvasPresetId; label: string; detail: string }

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: 'scroll', label: '세로 스크롤', detail: '900 × 7000 · 빈 캔버스' },
  { id: 'four-cut', label: '4컷 만화', detail: '2열 × 2행 패널' },
  { id: 'six-cut', label: '6컷 스토리', detail: '2열 × 3행 패널' },
  { id: 'storyboard', label: '가로 콘티', detail: '1600 × 900 · 3패널' },
]

function panel(id: string, x: number, y: number, w: number, h: number, z: number, name: string): PanelElement {
  return { id, type: 'panel', x, y, w, h, z, name, shape: 'rect', fill: '#ffffff', stroke: '#151923', strokeWidth: 3, strokeOpacity: 1, imageFit: 'cover', imageTransform: { zoom: 1, offsetX: 0, offsetY: 0, flipX: false } }
}

export function createProjectFromPreset(presetId: CanvasPresetId): ProjectV4 {
  const project = createDefaultProject()
  if (presetId === 'scroll') return project
  project.elements = []
  if (presetId === 'four-cut') {
    project.title = '4컷 만화'
    project.canvas.height = 1500
    const cells = [[80, 80], [460, 80], [80, 770], [460, 770]]
    project.elements = cells.map(([x, y], index) => panel(`panel_${index + 1}`, x, y, 360, 650, index + 1, `컷 ${index + 1}`))
  } else if (presetId === 'six-cut') {
    project.title = '6컷 스토리'
    project.canvas.height = 2050
    const cells = [[80, 70], [460, 70], [80, 730], [460, 730], [80, 1390], [460, 1390]]
    project.elements = cells.map(([x, y], index) => panel(`panel_${index + 1}`, x, y, 360, 620, index + 1, `컷 ${index + 1}`))
  } else {
    project.title = '가로 콘티'
    project.canvas = { width: 1600, height: 900, background: '#ffffff' }
    const cells = [[60, 70], [560, 70], [1060, 70]]
    project.elements = cells.map(([x, y], index) => panel(`panel_${index + 1}`, x, y, 480, 760, index + 1, `컷 ${index + 1}`))
  }
  return project
}

export interface BubblePreset {
  id: BubbleKind
  label: string
  detail: string
  fill: string
  stroke: string
  strokeWidth: number
  strokeOpacity: number
  fillOpacity: number
}

export const BUBBLE_PRESETS: BubblePreset[] = [
  { id: 'speech', label: '기본 대사', detail: '타원형', fill: '#ffffff', stroke: '#151923', strokeWidth: 3, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'cloud', label: '구름 생각', detail: '몽글한 구름형', fill: '#ffffff', stroke: '#151923', strokeWidth: 3, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'burst', label: '충격 외침', detail: '뾰족한 폭발형', fill: '#fff5cb', stroke: '#171923', strokeWidth: 3, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'tremble', label: '떨리는 대사', detail: '잔물결 테두리', fill: '#ffffff', stroke: '#383142', strokeWidth: 2, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'radio', label: '방송·전화', detail: '각진 전자음', fill: '#e7f4ff', stroke: '#22435b', strokeWidth: 2, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'rounded', label: '둥근 대사', detail: '둥근 사각형', fill: '#ffffff', stroke: '#151923', strokeWidth: 3, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'thought', label: '생각', detail: '점선 테두리', fill: '#ffffff', stroke: '#151923', strokeWidth: 3, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'shout', label: '외침', detail: '강조형', fill: '#fff6ca', stroke: '#b63b2d', strokeWidth: 4, strokeOpacity: 1, fillOpacity: 1 },
  { id: 'whisper', label: '속삭임', detail: '얇고 흐린 선', fill: '#ffffff', stroke: '#626b79', strokeWidth: 2, strokeOpacity: 0.72, fillOpacity: 0.92 },
  { id: 'narration', label: '내레이션', detail: '각진 자막 상자', fill: '#fff9e8', stroke: '#151923', strokeWidth: 2, strokeOpacity: 1, fillOpacity: 1 },
]

export function createBubbleFromPreset(kind: BubbleKind, project: ProjectV4, id: string): BubbleElement {
  const preset = BUBBLE_PRESETS.find(item => item.id === kind) ?? BUBBLE_PRESETS[0]
  const x = Math.max(20, Math.min(project.canvas.width - 300, Math.round((project.canvas.width - 280) / 2)))
  return {
    id, type: 'bubble', kind, text: '', x, y: 160, w: 280, h: kind === 'narration' ? 100 : 140,
    z: project.elements.length + 1, sceneId: project.scenes[0]?.id, tailX: 80, tailY: 180,
    fill: preset.fill, stroke: preset.stroke, strokeWidth: preset.strokeWidth,
    strokeOpacity: preset.strokeOpacity, fillOpacity: preset.fillOpacity,
  }
}

export interface PanelPreset {
  id: string
  label: string
  detail: string
  shape: PanelElement['shape']
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
}

export const PANEL_PRESETS: PanelPreset[] = [
  { id: 'standard', label: '기본 세로 컷', detail: '대사 장면에 무난한 세로형', shape: 'rect', width: 740, height: 420, fill: '#ffffff', stroke: '#151923', strokeWidth: 3 },
  { id: 'wide', label: '와이드 컷', detail: '배경·등장·전환 장면', shape: 'rect', width: 800, height: 330, fill: '#ffffff', stroke: '#151923', strokeWidth: 3 },
  { id: 'square', label: '정사각 컷', detail: '표정·소품 강조', shape: 'rect', width: 620, height: 620, fill: '#ffffff', stroke: '#151923', strokeWidth: 3 },
  { id: 'portrait', label: '인물 세로 컷', detail: '전신·낙차 연출', shape: 'rect', width: 560, height: 820, fill: '#ffffff', stroke: '#151923', strokeWidth: 3 },
  { id: 'rounded', label: '부드러운 컷', detail: '일상·로맨스 장면', shape: 'rounded', width: 700, height: 430, fill: '#ffffff', stroke: '#151923', strokeWidth: 3 },
  { id: 'action', label: '사선 액션 컷', detail: '속도감 있는 전투 장면', shape: 'slant-right', width: 760, height: 440, fill: '#ffffff', stroke: '#151923', strokeWidth: 4 },
  { id: 'borderless', label: '무테 컷', detail: '회상·배경·감정 장면', shape: 'rect', width: 780, height: 460, fill: '#ffffff', stroke: '#ffffff', strokeWidth: 1 },
]

export function applyBubblePreset(target: BubbleElement, kind: BubbleKind) {
  const preset = BUBBLE_PRESETS.find(item => item.id === kind) ?? BUBBLE_PRESETS[0]
  target.kind = preset.id
  target.fill = preset.fill
  target.stroke = preset.stroke
  target.strokeWidth = preset.strokeWidth
  target.strokeOpacity = preset.strokeOpacity
  target.fillOpacity = preset.fillOpacity
  if (kind === 'narration') target.h = Math.min(target.h, 120)
}
