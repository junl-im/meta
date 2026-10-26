import type {PanelElement} from './types.js'
export function panelPath(panel:PanelElement){
  const inset=Math.max(0,panel.strokeWidth??3)/2,w=Math.max(1,panel.w-inset*2),h=Math.max(1,panel.h-inset*2)
  let points=panel.shape==='diamond'?[[.5,0],[1,.5],[.5,1],[0,.5]]:panel.shape==='hexagon'?[[.2,0],[.8,0],[1,.5],[.8,1],[.2,1],[0,.5]]:panel.shape==='slant-left'?[[.1,0],[1,0],[.9,1],[0,1]]:panel.shape==='slant-right'?[[0,0],[.9,0],[1,1],[.1,1]]:panel.shape==='trapezoid'?[[.1,0],[.9,0],[1,1],[0,1]]:panel.shape==='polygon'&&panel.clipPoints?.length?panel.clipPoints.map(p=>[p.x,p.y]):[[0,0],[1,0],[1,1],[0,1]]
  return points.map(([x,y],i)=>`${i?'L':'M'} ${inset+Math.min(1,Math.max(0,x))*w} ${inset+Math.min(1,Math.max(0,y))*h}`).join(' ')+' Z'
}
