import {artworkBounds} from './artworkBounds.js'
import type {ProjectV4} from './types.js'

export function contentCanvasHeight(project:ProjectV4,requested:number):number|null{
  if(!Number.isFinite(requested))return null
  let bottom=320
  for(const element of project.elements)bottom=Math.max(bottom,artworkBounds(element).bottom)
  for(const scene of project.scenes)bottom=Math.max(bottom,scene.startY+1)
  if(!Number.isFinite(bottom)||bottom>100000)return null
  return Math.max(Math.ceil(bottom),Math.min(100000,Math.max(320,Math.round(requested))))
}

export function constrainedMetricSize(w:number,h:number,key:'w'|'h',requested:number,keepRatio:boolean):{w:number;h:number}|null{
  if(![w,h,requested].every(Number.isFinite)||w<=0||h<=0)return null
  if(!keepRatio)return {w:key==='w'?Math.min(100000,Math.max(24,requested)):w,h:key==='h'?Math.min(100000,Math.max(24,requested)):h}
  const ratio=w/h
  const minimum=key==='w'?Math.max(24,24*ratio):Math.max(24,24/ratio)
  const maximum=key==='w'?Math.min(100000,100000*ratio):Math.min(100000,100000/ratio)
  if(minimum>maximum)return null
  const next=Math.max(minimum,Math.min(maximum,requested))
  return key==='w'?{w:next,h:next/ratio}:{w:next*ratio,h:next}
}
