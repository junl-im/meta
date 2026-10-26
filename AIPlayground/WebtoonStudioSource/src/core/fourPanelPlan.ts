export interface FourPanelCut{scene:string;action:string;dialogue:string;prompt:string}
export function parseFourPanelPlan(text:string):FourPanelCut[]{
 const clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'')
 const value=JSON.parse(clean)
 if(!Array.isArray(value?.cuts)||value.cuts.length!==4)throw new Error('AI 결과는 정확히 네 컷이어야 합니다. 다시 요청하거나 수동으로 작성하세요.')
 return value.cuts.map((c:unknown)=>{
  if(!c||typeof c!=='object')throw new Error('AI 컷 형식이 올바르지 않습니다.')
  const v=c as Record<string,unknown>
  for(const key of ['scene','action','dialogue','prompt'])if(typeof v[key]!=='string'||(v[key] as string).length>800)throw new Error('AI 컷 항목이 없거나 너무 깁니다.')
  if(!(v.action as string).trim())throw new Error('빈 장면은 적용할 수 없습니다.')
  return {scene:v.scene as string,action:v.action as string,dialogue:v.dialogue as string,prompt:v.prompt as string}
 })
}
export function fourPanelText(c:FourPanelCut){return `장면: ${c.scene}\n연출: ${c.action}\n대사: ${c.dialogue||'(없음)'}\n이미지 지시: ${c.prompt}`}
export function readFourPanelText(text:string,index:number):FourPanelCut{
 if(!text.trim()||text.length>4000)throw Error('네 컷 모두 1~4,000자로 작성하세요.')
 const field=(label:string)=>text.match(new RegExp(`(?:^|\\n)${label}:[ \\t]*([\\s\\S]*?)(?=\\n(?:장면|연출|대사|이미지 지시):|$)`))?.[1]?.trim()||''
 const dialogue=field('대사')
 return {scene:field('장면')||`${index+1}컷`,action:field('연출')||text,dialogue:dialogue==='(없음)'?'':dialogue,prompt:field('이미지 지시')}
}
export function splitFourPanelSource(source:string){
 if(!source.trim()||source.length>20000)throw new Error('이야기를 1~20,000자로 입력하세요.')
 const chunks:string[]=[]
 for(let start=0;start<source.length;){let end=Math.min(source.length,start+6000);if(end<source.length){const line=source.lastIndexOf('\n',end);if(line>start+3000)end=line+1}chunks.push(source.slice(start,end));start=end}
 return chunks
}
