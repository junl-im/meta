import type {BubbleElement} from '@core/types'
import {bubbleTailPoint} from './bubbleGeometry'

function rounded(ctx:CanvasRenderingContext2D,w:number,h:number,r:number,tail?:{x:number;y:number}){
  r=Math.max(0,Math.min(r,tail?(w-16)/2:w/2,h/2))
  const half=tail?Math.max(0,Math.min(24,(w-2*r)/2)):0
  const base=tail?Math.max(r+half,Math.min(w-r-half,tail.x)):0
  ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r)
  ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h)
  if(tail){ctx.lineTo(base+half,h);ctx.lineTo(tail.x,tail.y);ctx.lineTo(base-half,h)}
  ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.closePath()
}

type Point={x:number;y:number}

function burstPoints(w:number,h:number,points:number,depth:number):Point[]{
  const cx=w/2,cy=h/2,rx=w/2,ry=h/2
  const outline:Point[]=[]
  for(let index=0;index<points*2;index++){
    const angle=-Math.PI/2+index*Math.PI/points,scale=index%2?1-depth:1
    outline.push({x:cx+Math.cos(angle)*rx*scale,y:cy+Math.sin(angle)*ry*scale})
  }
  return outline
}

function cloudPoints(w:number,h:number,bumps:number,depth:number):Point[]{
  const outline:Point[]=[]
  for(let index=0;index<bumps*8;index++){
    const angle=-Math.PI/2+index*Math.PI*2/(bumps*8)
    const scale=1-depth+depth*Math.cos(angle*bumps)**2
    outline.push({x:w/2+Math.cos(angle)*w*.5*scale,y:h/2+Math.sin(angle)*h*.5*scale})
  }
  return outline
}

function outlinedTail(ctx:CanvasRenderingContext2D,points:Point[],tail:Point,w:number,spread:number){
  // Walk clockwise and replace the bottom arc with the two tail sides.
  // The former arc never gets stroked, so no joining line can show through.
  const center=90-(tail.x/w-.5)*45
  const index=(degrees:number)=>Math.round((degrees+90)/360*points.length)%points.length
  const right=index(center-spread),left=index(center+spread)
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y)
  for(let i=1;i<=right;i++)ctx.lineTo(points[i].x,points[i].y)
  ctx.lineTo(tail.x,tail.y)
  for(let i=left;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y)
  ctx.closePath()
}

function radio(ctx:CanvasRenderingContext2D,w:number,h:number,tail:{x:number;y:number}){
  const cut=Math.min(18,w/9,h/5),half=Math.min(24,(w-2*cut)/2),base=Math.max(cut+half,Math.min(w-cut-half,tail.x))
  ctx.beginPath();ctx.moveTo(cut,0);ctx.lineTo(w-cut,0);ctx.lineTo(w,cut);ctx.lineTo(w,h-cut)
  ctx.lineTo(w-cut,h);ctx.lineTo(base+half,h);ctx.lineTo(tail.x,tail.y);ctx.lineTo(base-half,h)
  ctx.lineTo(cut,h);ctx.lineTo(0,h-cut);ctx.lineTo(0,cut);ctx.closePath()
}

/** One canvas renderer for the editor preview and the exported PNG. */
export function drawBubbleShape(ctx:CanvasRenderingContext2D,e:BubbleElement,tailX=e.tailX??e.w*.65,tailY=e.tailY??e.h+35){
  const w=e.w,h=e.h,tail=bubbleTailPoint({...e,tailX,tailY})
  ctx.save()
  ctx.fillStyle=e.fill||'#fff';ctx.strokeStyle=e.stroke||'#263b47';ctx.lineWidth=e.strokeWidth??3
  ctx.globalAlpha=e.fillOpacity??1
  if(e.kind==='thought'){
    ctx.beginPath();ctx.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);ctx.fill()
    ctx.globalAlpha=e.strokeOpacity??1;ctx.setLineDash([7,5]);ctx.stroke();ctx.setLineDash([])
    for(const [x,y,r] of [[(w*.62+tail.x)/2,h+9,10],[tail.x,tail.y,6]]){
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke()
    }
    ctx.restore();return
  }
  if(e.kind==='cloud'||e.kind==='burst'||e.kind==='shout'||e.kind==='tremble'){
    const points=e.kind==='cloud'?cloudPoints(w,h,11,.13):e.kind==='tremble'?cloudPoints(w,h,23,.06):burstPoints(w,h,e.kind==='shout'?9:14,e.kind==='shout'?.19:.3)
    outlinedTail(ctx,points,tail,w,e.kind==='cloud'||e.kind==='tremble'?14:18)
  }else if(e.kind==='radio')radio(ctx,w,h,tail)
  else rounded(ctx,w,h,e.kind==='narration'?5:e.kind==='rounded'?h/2:e.kind==='whisper'?Math.min(26,h/2):Math.min(38,h/2),e.kind==='narration'?undefined:tail)
  ctx.fill();ctx.globalAlpha=e.strokeOpacity??(e.kind==='whisper'?.65:1)
  if(e.kind==='whisper')ctx.setLineDash([7,5])
  ctx.stroke();ctx.restore()
}
