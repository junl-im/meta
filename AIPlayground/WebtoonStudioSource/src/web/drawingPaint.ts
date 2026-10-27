import type {DrawingElement,DrawingPoint} from '@core/types'
export type BrushKind=NonNullable<DrawingElement['brush']>
export function paintDrawing(ctx:CanvasRenderingContext2D,points:DrawingPoint[],stroke:string,width:number,brush:BrushKind='pen',opacity=1,scale=1){
  if(!points.length)return
  ctx.save();ctx.strokeStyle=stroke;ctx.fillStyle=stroke;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round'
  ctx.globalAlpha=Math.max(0,Math.min(1,Number.isFinite(opacity)?opacity:1))
  if(brush==='pencil')ctx.setLineDash([2,1])
  if(brush==='watercolor')ctx.filter=`blur(${1.2*scale}px)`
  if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,width/2,0,Math.PI*2);ctx.fill()}
  else{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()}
  ctx.restore()
}
