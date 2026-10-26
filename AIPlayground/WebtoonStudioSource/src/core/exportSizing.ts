import type { SlicePlan } from './types.js'

export function outputSegments(plan:SlicePlan) {
  return plan.segments.map(segment=>({...segment,outputStart:Math.round(segment.startY*plan.scale),outputHeight:Math.round(segment.endY*plan.scale)-Math.round(segment.startY*plan.scale)}))
}

export function fitJpeg(encode:(quality:number)=>Uint8Array,maxBytes?:number) {
  let quality=95,bytes=encode(quality)
  if(!maxBytes||bytes.byteLength<=maxBytes)return {quality,bytes}
  const minimum=encode(35)
  if(minimum.byteLength>maxBytes)throw new Error('최저 JPG 품질에서도 파일 제한을 초과합니다. 조각 세로 길이를 줄여 다시 출력하세요.')
  let best={quality:35,bytes:minimum},low=36,high=94
  while(low<=high){const middle=Math.floor((low+high)/2),candidate=encode(middle);if(candidate.byteLength<=maxBytes){best={quality:middle,bytes:candidate};low=middle+1}else high=middle-1}
  return best
}
