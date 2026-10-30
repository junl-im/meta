import type * as SupertonicHelper from './supertonicHelper.js'
import {languageSegments} from './languageSegments.mjs'
import {installModelAssetCache} from './modelAssetCache.mjs'
type TimelineVoiceBlock = { text: string; voiceId: string; voiceName: string; speed: number }

const MODEL_REVISION = 'aafc6e32416a594460b32413efc49d7fe4ce6d46'
const MODEL_BASE = `https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/${MODEL_REVISION}`
installModelAssetCache(self,MODEL_BASE)

// Style mapping approximates product personas; it does not recreate browser system speakers.
export const LOCAL_STYLE_BY_VOICE: Record<string, string> = {
  'library-female': 'F2',
  'library-male': 'M1',
  'sori-warm': 'F2',
  'on-clear': 'M1',
  'dam-calm': 'F3',
  'jun-deep': 'M2',
  'min-energetic': 'M3',
  'byeol-oracle': 'F1',
}

type Helper = typeof SupertonicHelper
type Model = Awaited<ReturnType<Helper['loadTextToSpeech']>>['textToSpeech']
let modelPromise: Promise<{ model: Model; helper: Helper }> | null = null
const stylePromises = new Map<string, Promise<Awaited<ReturnType<Helper['loadVoiceStyle']>>>>()

async function loadModel(onProgress: (message: string) => void): Promise<{ model: Model; helper: Helper }> {
  if (!modelPromise) {
    modelPromise = (async () => {
      onProgress('한국어 WAV 엔진을 불러오는 중입니다. 첫 실행 시 약 380MB 모델을 내려받습니다.')
      const [ort, helper] = await Promise.all([
        import('onnxruntime-web/wasm'),
        import('./supertonicHelper.js'),
      ])
      ort.env.wasm.numThreads = 1
      ort.env.wasm.wasmPaths = new URL('./voice-runtime/', self.location.href).href
      const load = (provider: 'webgpu' | 'wasm') => helper.loadTextToSpeech(
        `${MODEL_BASE}/onnx`,
        { executionProviders: [provider], graphOptimizationLevel: 'all' },
        (name, index, total) => onProgress(`한국어 WAV 엔진 불러오는 중 · ${name} ${index}/${total}`),
      )
      // CPU mode keeps the downloadable runtime smaller and works without WebGPU.
      const loaded = await load('wasm')
      return { model: loaded.textToSpeech, helper }
    })().catch((error: unknown) => {
      modelPromise = null
      throw error
    })
  }
  return modelPromise
}

export async function prepareLocalVoice(onProgress: (message: string) => void): Promise<void> {
  await loadModel(onProgress)
}

export interface LocalWavResult {
  blob: Blob
  durationSeconds: number
  styleId: string
}

export async function synthesizeSupertonicWav(
  block: Pick<TimelineVoiceBlock, 'text' | 'voiceId' | 'voiceName' | 'speed'>,
  signal: AbortSignal,
  onProgress: (message: string) => void,
): Promise<LocalWavResult> {
  if (signal.aborted) throw new DOMException('생성이 취소되었습니다.', 'AbortError')
  const { model, helper } = await loadModel(onProgress)
  if (signal.aborted) throw new DOMException('생성이 취소되었습니다.', 'AbortError')
  const styleId = LOCAL_STYLE_BY_VOICE[block.voiceId] ?? 'F2'
  let stylePromise = stylePromises.get(styleId)
  if (!stylePromise) {
    stylePromise = helper.loadVoiceStyle([`${MODEL_BASE}/voice_styles/${styleId}.json`]).catch((error: unknown) => {
      stylePromises.delete(styleId)
      throw error
    })
    stylePromises.set(styleId, stylePromise)
  }
  const style = await stylePromise
  if (signal.aborted) throw new DOMException('생성이 취소되었습니다.', 'AbortError')
  onProgress(`${block.voiceName} · 음성 파일 생성 중`)
  const segments=languageSegments(block.text)
  const audioParts: Float32Array[]=[]
  for (const segment of segments) {
    if (signal.aborted) throw new DOMException('생성이 취소되었습니다.', 'AbortError')
    if (!/[A-Za-z\u1100-\u11ff\u3130-\u318f\uac00-\ud7af\d]/.test(segment.text)) continue
    const {wav,duration}=await model.call(segment.text,segment.language,style,6,
      Math.max(0.9,Math.min(1.13,block.speed)),0.25)
    audioParts.push(Float32Array.from(wav.slice(0,Math.min(wav.length,Math.floor(model.sampleRate*duration[0])))))
  }
  if (signal.aborted) throw new DOMException('생성이 취소되었습니다.', 'AbortError')
  const sampleCount=audioParts.reduce((sum,part)=>sum+part.length,0)
  const wav=new Float32Array(sampleCount);let offset=0
  for (const part of audioParts) { wav.set(part,offset);offset+=part.length }
  const buffer = helper.writeWavFile(wav, model.sampleRate)
  return { blob: new Blob([buffer], { type: 'audio/wav' }), durationSeconds: sampleCount / model.sampleRate, styleId }
}
