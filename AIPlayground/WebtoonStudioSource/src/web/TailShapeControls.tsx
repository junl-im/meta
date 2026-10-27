import type {BubbleElement} from '@core/types'

export function TailShapeControls({bubble,onChange}:{bubble:BubbleElement;onChange:(key:'tailWidth'|'tailCurve',value:number)=>void}){
  if(bubble.kind==='thought'||bubble.kind==='narration')return null
  const limit=Math.max(12,Math.round(Math.min(bubble.w*.35,Math.max(12,(bubble.tailY??bubble.h+35)-bubble.h)*.65)))
  return <div className="web-tail-shape" aria-label="말풍선 꼬리 모양">
    <label>꼬리 폭 <output>{Math.round(bubble.tailWidth??48)}px</output>
      <input aria-label="꼬리 폭" type="range" min="8" max={Math.max(120,Math.ceil(bubble.w/2))} step="2" value={bubble.tailWidth??48} onChange={event=>onChange('tailWidth',Number(event.target.value))}/>
    </label>
    <label>꼬리 휘어짐 <output>{Math.round(bubble.tailCurve??0)}</output>
      <input aria-label="꼬리 휘어짐" type="range" min={-limit} max={limit} step="2" value={Math.max(-limit,Math.min(limit,bubble.tailCurve??0))} onChange={event=>onChange('tailCurve',Number(event.target.value))}/>
    </label>
  </div>
}
