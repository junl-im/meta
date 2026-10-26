import {effectExtent} from './textEffects.js'
import {bubbleTail} from './bubbleTail.js'
import type {EditorElement} from './types.js'
export function artworkBounds(e:EditorElement){
  let minX=0,minY=0,maxX=e.w,maxY=e.h
  if(e.type==='bubble'&&e.kind!=='narration'){const tx=e.tailX??e.w*.65,ty=e.tailY??e.h+35;minX=Math.min(0,tx);maxX=Math.max(e.w,tx);minY=Math.min(0,ty);maxY=Math.max(e.h,ty)}
  if(e.type==='bubble'&&e.kind!=='narration')for(const point of bubbleTail(e).points){minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y)}
  if(e.type==='text'||e.type==='bubble'){const margin=effectExtent(e.textEffect)+Math.abs(Math.tan((e.textEffect?.slant||0)*Math.PI/180))*e.h;minX-=margin;maxX+=margin;minY-=margin;maxY+=margin}
  const angle=(e.rotation||0)*Math.PI/180,cx=e.w/2,cy=e.h/2
  const points=[[minX,minY],[maxX,minY],[minX,maxY],[maxX,maxY]].map(([x,y])=>({x:e.x+cx+(x-cx)*Math.cos(angle)-(y-cy)*Math.sin(angle),y:e.y+cy+(x-cx)*Math.sin(angle)+(y-cy)*Math.cos(angle)}))
  return {left:Math.min(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),right:Math.max(...points.map(p=>p.x)),bottom:Math.max(...points.map(p=>p.y))}
}
