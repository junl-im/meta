import {prepareLocalVoice,synthesizeSupertonicWav} from './supertonicWav'

self.onmessage = async (event: MessageEvent) => {
  const {id, type, text, voiceId, voiceName, speed} = event.data || {}
  if (typeof id !== 'number') return
  const controller = new AbortController()
  try {
    if (type === 'prepare') {
      await prepareLocalVoice(message => self.postMessage({id, type:'progress', message}))
      self.postMessage({id, type:'ready'})
      return
    }
    if (typeof text !== 'string' || !text.trim() || text.length > 520) return
    const result = await synthesizeSupertonicWav({text, voiceId, voiceName, speed}, controller.signal,
      message => self.postMessage({id, type:'progress', message}))
    self.postMessage({id, type:'audio', blob:result.blob, styleId:result.styleId})
  } catch (error) {
    self.postMessage({id, type:'error', message:error instanceof Error ? error.message : '음성을 만들지 못했어요.'})
  }
}
