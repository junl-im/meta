import type {BubbleElement,TextElement} from '@core/types'

type TextItem=BubbleElement|TextElement
export type TypographySetting='fontWeight'|'fontFamily'|'lineHeight'

const weights=[['400','보통'],['600','약간 굵게'],['700','굵게'],['900','아주 굵게']] as const
const families=[['sans-serif','고딕'],['serif','명조'],['monospace','고정폭']] as const
const lineHeights=[1,1.2,1.3,1.5,1.8,2] as const

export function TypographyControls({element,onChange}:{element:TextItem;onChange:(setting:TypographySetting,value:string|number)=>void}){
  const weight=element.fontWeight||(element.type==='bubble'?'600':'700')
  const family=element.fontFamily||'sans-serif'
  const lineHeight=element.textEffect?.lineHeight??1.3
  return <div className="web-typography-controls" aria-label="글자 모양">
    <label>글꼴
      <select value={family} onChange={event=>onChange('fontFamily',event.target.value)}>
        {!families.some(([value])=>value===family)&&<option value={family}>{family} · 원고 글꼴</option>}
        {families.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label>굵기
      <select value={weight} onChange={event=>onChange('fontWeight',event.target.value)}>
        {!weights.some(([value])=>value===weight)&&<option value={weight}>{weight} · 원고 설정</option>}
        {weights.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label>줄 간격
      <select value={lineHeight} onChange={event=>onChange('lineHeight',Number(event.target.value))}>
        {!lineHeights.some(value=>value===lineHeight)&&<option value={lineHeight}>{lineHeight}배 · 원고 설정</option>}
        {lineHeights.map(value=><option key={value} value={value}>{value}배</option>)}
      </select>
    </label>
  </div>
}
