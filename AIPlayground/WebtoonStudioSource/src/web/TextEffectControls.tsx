import{TEXT_EFFECTS}from'@core/textEffects'
import type{BubbleElement,TextElement}from'@core/types'

const AVAILABLE=new Set(['plain','ink','reverse','yellow','cold','double','shadow','soft','neon'])
export const WEB_TEXT_EFFECTS=TEXT_EFFECTS.filter(effect=>AVAILABLE.has(effect.id))

export function TextEffectControls({element,onSelect}:{element:BubbleElement|TextElement;onSelect:(id:string)=>void}){
  const effect=element.textEffect
  const selected=WEB_TEXT_EFFECTS.find(preset=>preset.id===effect?.preset)
  const keys=new Set([...Object.keys(effect||{}),...Object.keys(selected?.effect||{})].filter(key=>key!=='lineHeight'&&key!=='preset'))
  const hasCustom=!!effect&&(!selected?(!!effect.preset||keys.size>0):[...keys].some(key=>effect[key as keyof typeof effect]!==selected.effect[key as keyof typeof selected.effect]))
  return <label className="web-text-effect-select">글자 효과
    <select value={hasCustom?'custom':effect?.preset||'plain'} onChange={event=>onSelect(event.target.value)}>
      {hasCustom&&<option value="custom">원고 효과 유지</option>}
      {WEB_TEXT_EFFECTS.map(preset=><option key={preset.id} value={preset.id}>{preset.label}</option>)}
    </select>
  </label>
}
