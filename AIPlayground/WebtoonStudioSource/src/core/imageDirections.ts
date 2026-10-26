export interface ImageDirections {appearance:string;style:string;composition:string}
const start='【이미지 연출 지시】',end='【이미지 연출 지시 끝】'
export function imageDirectionPrompt(prompt:string,directions:ImageDirections){
 const clean=prompt.replace(/【이미지 연출 지시】[\s\S]*?【이미지 연출 지시 끝】/g,'').trim()
 const entries=[['인물 외형',directions.appearance],['화풍',directions.style],['구도',directions.composition]]
 const lines=entries.filter(([,value])=>value.trim()).map(([label,value])=>label+': '+value.trim())
 const result=[clean,lines.length?[start,...lines,end].join('\n'):''].filter(Boolean).join('\n\n')
 if(result.length>9500)throw new Error('요청이 너무 깁니다. 장면이나 연출 지시를 줄여주세요.')
 return result
}
