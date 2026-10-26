export type ElementType = 'panel' | 'bubble' | 'text' | 'drawing' | 'scene'
export type BubbleKind = 'speech' | 'thought' | 'shout' | 'whisper' | 'narration' | 'cloud' | 'burst' | 'tremble' | 'radio' | 'rounded'
export type PanelShape = 'rect' | 'rounded' | 'ellipse' | 'slant-left' | 'slant-right' | 'trapezoid' | 'diamond' | 'hexagon' | 'polygon'
export interface TextEffect { preset?:string; outlineColor?:string; outlineWidth?:number; shadowColor?:string; shadowSize?:number; glow?:boolean; letterSpacing?:number; lineHeight?:number; slant?:number; gradient?:string }

export interface CanvasSpec {
  width: number
  height: number
  background: string
}

export interface Scene {
  id: string
  name: string
  startY: number
  collapsed: boolean
}

export interface ImageTransform {
  zoom: number
  offsetX: number
  offsetY: number
  flipX: boolean
}

export interface BaseElement {
  id: string
  type: ElementType
  x: number
  y: number
  w: number
  h: number
  z: number
  sceneId?: string
  name?: string
  visible?: boolean
  locked?: boolean
  rotation?: number
  erasures?: Array<{points:DrawingPoint[];width:number;soft:boolean;restore?:boolean}>
  groupId?: string
}

export interface PanelElement extends BaseElement {
  type: 'panel'
  fourPanelScript?: string
  storyOrigin?: {cutId?:string;scene:string;action:string;prompt:string;sourceText:string;analysis?:import('./storyCharacters.js').StoryAnalysis}
  imageOrigin?: ImageOrigin
  shape?: PanelShape
  clipPoints?:Array<{x:number;y:number}>
  image?: string
  imageFit?: 'cover' | 'contain'
  imageTransform?: ImageTransform
  imageFilter?: 'none' | 'vivid' | 'soft' | 'bw' | 'contrast'
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  fillOpacity?: number
}

export interface BubbleElement extends BaseElement {
  type: 'bubble'
  kind: BubbleKind
  text: string
  speaker?: string
  tailX?: number
  tailY?: number
  tailCurve?:number
  tailWidth?:number
  textEffect?:TextEffect
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  color?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  fillOpacity?: number
  align?: 'left' | 'center' | 'right'
}

export interface TextElement extends BaseElement {
  type: 'text'
  text: string
  textEffect?:TextEffect
  fontSize?: number
  fontWeight?: string
  fontFamily?: string
  color?: string
  align?: 'left' | 'center' | 'right'
}


export interface DrawingPoint { x: number; y: number }
export interface DrawingElement extends BaseElement {
  type: 'drawing'
  brush?: 'pen'|'pencil'|'marker'|'watercolor'
  erasures?: Array<{points:DrawingPoint[];width:number;soft:boolean;restore?:boolean}>
  points: DrawingPoint[]
  stroke: string
  strokeWidth: number
  opacity?: number
}

export interface SceneDividerElement extends BaseElement {
  type: 'scene'
}

export type EditorElement = PanelElement | BubbleElement | TextElement | DrawingElement | SceneDividerElement

export interface Asset {
  generation?: ImageOrigin
  id: string
  name: string
  category: string
  src: string
  width?: number
  height?: number
  createdAt?: string
}

export interface ImageOrigin {newCut?:boolean;engine?:'comfyui'|'webui'|'codex';originalPrompt?:string;preparedPrompt?:string;style?:string;denoise?:number;prompt:string;at:string;checkpoint?:string;targetPanelId?:string;storyCutId?:string}

export interface ImageImportBatch {
  assets: Asset[]
  errors: Array<{ name: string; message: string }>
}

export interface OllamaChatInput {
  engine?:'ollama'|'codex'|'claude'|'gemini'
  model: string
  prompt: string
  projectTitle?: string
  episode?: string
  images?: string[]
}

export interface OllamaModelsResult { models: string[] }

export interface ProjectEvent {
  id: string
  at: string
  type: string
  detail?: string
}

export interface ProjectSettings {
  snap: boolean
  guides: boolean
  gridSize: number
  smartSnapDistance: number
}

export interface CharacterProfile {id:string;name:string;appearance:string;outfit:string;notes:string;referenceAssetId?:string}

export interface ProjectV4 {
  characters?: CharacterProfile[]
  storyboard?: import('./storyboard.js').Storyboard
  fonts?: Array<{family:string;name:string;dataUrl:string}>
  version: '0.4'
  schemaVersion: 4
  id: string
  title: string
  episode: string
  createdAt: string
  updatedAt: string
  revision: number
  canvas: CanvasSpec
  scenes: Scene[]
  elements: EditorElement[]
  assets: Asset[]
  events: ProjectEvent[]
  settings: ProjectSettings
  selectedId?: string | null
  selectedIds?: string[]
  zoom?: number
}

export interface SlicePreset {
  id: string
  label: string
  width: number
  maxHeight: number
  maxBytes?: number
  totalMaxBytes?: number
  allowedFormats?: Array<'jpg' | 'gif' | 'png' | 'webp'>
  format: 'png' | 'jpg' | 'webp'
}

export interface SliceSegment {
  index: number
  startY: number
  endY: number
  height: number
  breakReason: 'safe-gap' | 'hard-limit' | 'end'
  intersectingElementIds: string[]
}

export interface SlicePlan {
  preset: SlicePreset
  sourceWidth: number
  sourceHeight: number
  scale: number
  segments: SliceSegment[]
  warnings: string[]
}

export interface RecoverySummary {
  changed: boolean
  lines: string[]
  counts: {
    panels: [number, number]
    bubbles: [number, number]
    assets: [number, number]
    scenes: [number, number]
  }
}
