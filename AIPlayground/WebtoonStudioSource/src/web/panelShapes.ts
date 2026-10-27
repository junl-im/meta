import type {PanelElement} from '@core/types'
type Point={x:number;y:number}
export function panelPolygon(panel:PanelElement):Point[]|null{
  const shapes:Record<string,number[][]>={diamond:[[.5,0],[1,.5],[.5,1],[0,.5]],hexagon:[[.2,0],[.8,0],[1,.5],[.8,1],[.2,1],[0,.5]],'slant-left':[[.1,0],[1,0],[.9,1],[0,1]],'slant-right':[[0,0],[.9,0],[1,1],[.1,1]],trapezoid:[[.1,0],[.9,0],[1,1],[0,1]]}
  if(panel.shape==='polygon'){
    const points=panel.clipPoints
    return Array.isArray(points)&&points.length>=3&&points.length<=16&&points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))?points.map(p=>({x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))})):null
  }
  return shapes[panel.shape||'']?.map(([x,y])=>({x,y}))||null
}
export function panelClip(panel:PanelElement):string|undefined{
  const points=panelPolygon(panel);return points?`polygon(${points.map(p=>`${p.x*100}% ${p.y*100}%`).join(',')})`:undefined
}
export function tracePolygon(ctx:CanvasRenderingContext2D,panel:PanelElement,inset=0):boolean{
  const points=panelPolygon(panel);if(!points)return false
  const w=Math.max(1,panel.w-inset*2),h=Math.max(1,panel.h-inset*2)
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(inset+p.x*w,inset+p.y*h):ctx.moveTo(inset+p.x*w,inset+p.y*h));ctx.closePath();return true
}
export function drawPanelOutline(canvas:HTMLCanvasElement,panel:PanelElement,zoom:number){
  const width=panel.w*zoom,height=panel.h*zoom,dpr=Math.min(devicePixelRatio||1,2,8192/Math.max(1,width),8192/Math.max(1,height),Math.sqrt(4000000/Math.max(1,width*height)))
  canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.width=Math.max(1,Math.ceil(width*dpr));canvas.height=Math.max(1,Math.ceil(height*dpr))
  const ctx=canvas.getContext('2d'),stroke=Math.max(0,panel.strokeWidth??3);if(!ctx||!stroke)return
  ctx.setTransform(zoom*dpr,0,0,zoom*dpr,0,0);ctx.lineJoin='round';ctx.lineWidth=stroke;ctx.strokeStyle=panel.stroke||'#263b47';ctx.globalAlpha=panel.strokeOpacity??1
  if(tracePolygon(ctx,panel,stroke/2))ctx.stroke()
}
