import {sanitizeCharacters} from './characters.js'
import {MAX_STROKE_POINTS} from './drawingTools.js'
import {sanitizeImageOrigin,sanitizeStoryOrigin,sanitizeStoryboard} from './productionLinks.js'
import { createDefaultProject } from './defaultProject.js'
import type { Asset, EditorElement, ProjectEvent, ProjectV4, Scene } from './types.js'

function str(v: unknown, fallback: string) { return typeof v === 'string' && v.trim() ? v : fallback }
function num(v: unknown, fallback: number) { const n = Number(v); return Number.isFinite(n) ? n : fallback }
function bool(v: unknown, fallback: boolean) { return typeof v === 'boolean' ? v : fallback }
function uid(prefix: string) { return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` }
function projectId(v: unknown) {
  const candidate = str(v, uid('project'))
  return /^[A-Za-z0-9_-]{1,128}$/.test(candidate) ? candidate : uid('project')
}

export function migrateProject(input: unknown): ProjectV4 {
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, any>
  const base = createDefaultProject(str(p.title, '새 웹툰'), str(p.episode, '1화'))
  const now = new Date().toISOString()
  const scenes: Scene[] = Array.isArray(p.scenes) && p.scenes.length
    ? p.scenes.map((s: any, i: number) => ({
        id: str(s?.id, uid('scene')),
        name: str(s?.name, `장면 ${i + 1}`),
        startY: Math.max(0, num(s?.startY, i * 1200)),
        collapsed: bool(s?.collapsed, false)
      })).sort((a, b) => a.startY - b.startY)
    : base.scenes

  const elements: EditorElement[] = Array.isArray(p.elements)
    ? p.elements.filter((e: any) => e && typeof e === 'object' && ['panel','bubble','text','drawing','scene'].includes(e.type)).map((e: any, i: number) => ({
        visible: true,
        locked: false,
        rotation: 0,
        ...e,
        erasures:(Array.isArray(e.erasures)?e.erasures:[]).filter((r:any)=>Number.isFinite(r?.width)&&r.width>=1&&r.width<=150&&Array.isArray(r.points)&&r.points.length>=2&&r.points.length<=4096&&r.points.every((p:any)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y))).slice(0,100).map((r:any)=>({width:r.width,soft:r.soft===true,...(r.restore===true?{restore:true}:{}),points:r.points.map((p:any)=>({x:p.x,y:p.y}))})),
        ...(e.type==='panel'?{fourPanelScript:typeof e.fourPanelScript==='string'&&e.fourPanelScript.trim()&&e.fourPanelScript.length<=4000?e.fourPanelScript:undefined,storyOrigin:sanitizeStoryOrigin(e.storyOrigin),imageOrigin:sanitizeImageOrigin(e.imageOrigin)}:{}),
        ...(e.type==='drawing'?{brush:['pen','pencil','marker','watercolor'].includes(e.brush)?e.brush:'pen',points:(Array.isArray(e.points)?e.points:[]).filter((p:any)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)).slice(0,MAX_STROKE_POINTS),erasures:(Array.isArray(e.erasures)?e.erasures:[]).filter((r:any)=>Number.isFinite(r?.width)&&r.width>=1&&r.width<=150&&Array.isArray(r.points)&&r.points.length>=2&&r.points.length<=4096&&r.points.every((p:any)=>Number.isFinite(p?.x)&&Number.isFinite(p?.y))).slice(0,100).map((r:any)=>({width:r.width,soft:r.soft===true,...(r.restore===true?{restore:true}:{}),points:r.points.map((p:any)=>({x:p.x,y:p.y}))}))}:{}),
        id: str(e.id, uid('el')),
        x: num(e.x, 80),
        y: num(e.y, 80),
        w: Math.max(20, num(e.w, 300)),
        h: Math.max(20, num(e.h, 300)),
        z: num(e.z, i + 1)
      })) as EditorElement[]
    : []

  const assets: Asset[] = Array.isArray(p.assets)
    ? p.assets.filter(Boolean).map((a: any) => ({
        id: str(a.id, uid('asset')),
        name: str(a.name, '이미지'),
        category: str(a.category, '이미지'),
        src: str(a.src, ''),
        width: num(a.width, 0) || undefined,
        height: num(a.height, 0) || undefined,
        createdAt: str(a.createdAt, now),generation:sanitizeImageOrigin(a.generation)
      }))
    : []

  const events: ProjectEvent[] = Array.isArray(p.events)
    ? p.events.slice(-500).map((e: any) => ({
        id: str(e.id, uid('evt')),
        at: str(e.at, now),
        type: str(e.type, 'legacy'),
        detail: typeof e.detail === 'string' ? e.detail : undefined
      }))
    : []

  const project: ProjectV4 = {
    version: '0.4',
    schemaVersion: 4,
    id: projectId(p.id),
    title: str(p.title, base.title),
    episode: str(p.episode, base.episode),
    createdAt: str(p.createdAt, now),
    updatedAt: now,
    revision: Math.max(0, Math.trunc(num(p.revision, 0))),
    canvas: {
      width: Math.max(320, num(p.canvas?.width, 900)),
      height: Math.max(320, num(p.canvas?.height, 7000)),
      background: str(p.canvas?.background, '#ffffff')
    },
    scenes,
    elements,
    assets,
    characters:sanitizeCharacters(p.characters),
    storyboard:sanitizeStoryboard(p.storyboard),
    fonts:Array.isArray(p.fonts)?p.fonts.filter((f:any)=>typeof f?.family==='string'&&/^wtoon_font_[a-zA-Z0-9_-]+$/.test(f.family)&&typeof f.name==='string'&&typeof f.dataUrl==='string'&&f.dataUrl.length<=7_000_000&&/^data:font\/(?:ttf|otf|woff|woff2);base64,[A-Za-z0-9+/=]+$/.test(f.dataUrl)).slice(0,8):[],
    events,
    settings: {
      snap: bool(p.settings?.snap, true),
      guides: bool(p.settings?.guides, true),
      gridSize: Math.max(1, num(p.settings?.gridSize, 10)),
      smartSnapDistance: Math.max(1, num(p.settings?.smartSnapDistance, 8))
    },
    selectedId: typeof p.selectedId === 'string' ? p.selectedId : null,
    selectedIds: Array.isArray(p.selectedIds) ? p.selectedIds.filter((x: unknown) => typeof x === 'string') : [],
    zoom: Math.min(1.5, Math.max(0.25, num(p.zoom, 0.7)))
  }

  assignSceneIds(project)
  return project
}

export function assignSceneIds(project: ProjectV4) {
  const scenes = [...project.scenes].sort((a, b) => a.startY - b.startY)
  if (!scenes.length) return
  for (const e of project.elements) {
    if (e.type === 'scene') continue
    const cy = e.y + e.h / 2
    let owner = scenes[0]
    for (const scene of scenes) {
      if (scene.startY <= cy) owner = scene
      else break
    }
    e.sceneId = owner.id
  }
}
