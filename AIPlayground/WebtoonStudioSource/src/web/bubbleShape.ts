import type {BubbleElement} from '@core/types'
import {bubbleTailPoint} from './bubbleGeometry'

function curvedTail(ctx:CanvasRenderingContext2D,from:Point,to:Point,curve:number){
  ctx.quadraticCurveTo((from.x+to.x)/2+curve,(from.y+to.y)/2,to.x,to.y)
}

function tailCurve(e:BubbleElement,tail:Point){
  const length=Math.max(12,tail.y-e.h)
  return Math.max(-Math.min(e.w*.35,length*.65),Math.min(Math.min(e.w*.35,length*.65),e.tailCurve??0))
}

function tailHalf(e:BubbleElement,limit:number){
  return Math.max(0,Math.min(limit,Math.max(4,(e.tailWidth??48)/2)))
}

function rounded(ctx:CanvasRenderingContext2D,e:BubbleElement,r:number,tail?:Point){
  const {w,h}=e
  r=Math.max(0,Math.min(r,tail?(w-16)/2:w/2,h/2))
  const half=tail?tailHalf(e,(w-2*r)/2):0
  const base=tail?Math.max(r+half,Math.min(w-r-half,tail.x)):0
  ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r)
  ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h)
  if(tail){
    const right={x:base+half,y:h},left={x:base-half,y:h},curve=tailCurve(e,tail)
    ctx.lineTo(right.x,right.y);curvedTail(ctx,right,tail,curve);curvedTail(ctx,tail,left,curve)
  }
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

function outlinedTail(ctx:CanvasRenderingContext2D,e:BubbleElement,points:Point[],tail:Point,spread:number){
  // Walk clockwise and replace the bottom arc with the two tail sides.
  // The former arc never gets stroked, so no joining line can show through.
  const center=90-(tail.x/e.w-.5)*45
  const widthSpread=Math.max(4,Math.min(38,spread*(e.tailWidth??48)/48))
  const index=(degrees:number)=>Math.round((degrees+90)/360*points.length)%points.length
  const right=index(center-widthSpread),left=index(center+widthSpread)
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y)
  for(let i=1;i<=right;i++)ctx.lineTo(points[i].x,points[i].y)
  curvedTail(ctx,points[right],tail,tailCurve(e,tail))
  curvedTail(ctx,tail,points[left],tailCurve(e,tail))
  for(let i=left;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y)
  ctx.closePath()
}

function radio(ctx:CanvasRenderingContext2D,e:BubbleElement,tail:Point){
  const {w,h}=e,cut=Math.min(18,w/9,h/5),half=tailHalf(e,(w-2*cut)/2),base=Math.max(cut+half,Math.min(w-cut-half,tail.x))
  const right={x:base+half,y:h},left={x:base-half,y:h},curve=tailCurve(e,tail)
  ctx.beginPath();ctx.moveTo(cut,0);ctx.lineTo(w-cut,0);ctx.lineTo(w,cut);ctx.lineTo(w,h-cut)
  ctx.lineTo(w-cut,h);ctx.lineTo(right.x,right.y);curvedTail(ctx,right,tail,curve);curvedTail(ctx,tail,left,curve)
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
    outlinedTail(ctx,e,points,tail,e.kind==='cloud'||e.kind==='tremble'?14:18)
  }else if(e.kind==='radio')radio(ctx,e,tail)
  else rounded(ctx,e,e.kind==='narration'?5:e.kind==='rounded'?h/2:e.kind==='whisper'?Math.min(26,h/2):Math.min(38,h/2),e.kind==='narration'?undefined:tail)
  ctx.fill();ctx.globalAlpha=e.strokeOpacity??(e.kind==='whisper'?.65:1)
  if(e.kind==='whisper')ctx.setLineDash([7,5])
  ctx.stroke();ctx.restore()
}
