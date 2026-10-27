import type {CSSProperties} from 'react'
import type {TextEffect} from '@core/types'

export function textEffectStyle(effect:TextEffect|undefined,zoom:number):CSSProperties{
  if(!effect)return{}
  const outline=Math.min(12,Math.max(0,effect.outlineWidth||0))
  const shadow=Math.min(24,Math.max(0,effect.shadowSize||0))
  return{
    WebkitTextStroke:outline?`${outline*zoom}px ${effect.outlineColor||'#111111'}`:undefined,
    textShadow:shadow?`0 ${effect.glow?0:Math.max(1,shadow*.25)*zoom}px ${shadow*zoom}px ${effect.shadowColor||'#222222'}`:undefined,
    letterSpacing:effect.letterSpacing?`${effect.letterSpacing*zoom}px`:undefined,
    fontStyle:effect.slant?'italic':undefined
  }
}
