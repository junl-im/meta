import {artworkBounds} from './artworkBounds.js'
import type {DrawingPoint,ProjectV4} from './types.js'
export const MAX_STROKE_POINTS = 100000
function distance(p:DrawingPoint,a:DrawingPoint,b:DrawingPoint){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)}
function cross(a:DrawingPoint,b:DrawingPoint,c:DrawingPoint){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function near(a:DrawingPoint,b:DrawingPoint,c:DrawingPoint,d:DrawingPoint,r:number){if(Math.max(a.x,b.x)+r<Math.min(c.x,d.x)||Math.max(c.x,d.x)+r<Math.min(a.x,b.x)||Math.max(a.y,b.y)+r<Math.min(c.y,d.y)||Math.max(c.y,d.y)+r<Math.min(a.y,b.y))return false;return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||Math.min(distance(a,c,d),distance(b,c,d),distance(c,a,b),distance(d,a,b))<=r}
// Consecutive chunks share an endpoint: long strokes retain their entire path.
export function strokeChunks(points:DrawingPoint[]){
 const chunks:DrawingPoint[][]=[]
 for(let start=0;start<points.length-1;start+=4095)chunks.push(points.slice(start,start+4096))
 return chunks
}
export function eraseDrawings(project:ProjectV4,points:DrawingPoint[],width:number,soft=false,restore=false){
 if(points.length<2||points.length>MAX_STROKE_POINTS||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))||!Number.isFinite(width)||width<1||width>150)return 0
 const needed=Math.ceil((points.length-1)/4095)
 let count=0
 for(const e of project.elements){if(e.type!=='drawing'||e.locked||e.visible===false||(e.erasures?.length||0)+needed>100||restore&&!e.erasures?.some(r=>!r.restore))continue
 const angle=-(e.rotation||0)*Math.PI/180,cx=e.x+e.w/2,cy=e.y+e.h/2,local=points.map(p=>({x:(p.x-cx)*Math.cos(angle)-(p.y-cy)*Math.sin(angle)+e.w/2,y:(p.x-cx)*Math.sin(angle)+(p.y-cy)*Math.cos(angle)+e.h/2}))
 let hit=false;const radius=width/2+(e.strokeWidth||4)/2
 for(let i=1;i<local.length&&!hit;i++)for(let j=1;j<e.points.length&&!hit;j++)hit=near(local[i-1],local[i],e.points[j-1],e.points[j],radius)
 if(hit){e.erasures=[...(e.erasures||[]),...strokeChunks(local).map(points=>({points,width,soft,...(restore?{restore:true}:{})}))];count++}
 }
 return count
}

// Erasures use element-local coordinates, so moving/rotating the element preserves them.
export function eraseArtwork(project:ProjectV4,points:DrawingPoint[],width:number,soft=false,scope:'all'|'drawing'|'selected'='all',selectedIds:readonly string[]=[],restore=false){
 if(points.length<2||points.length>MAX_STROKE_POINTS||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))||!Number.isFinite(width)||width<1||width>150)return 0
 const needed=Math.ceil((points.length-1)/4095)
 const targetProject=scope==='selected'?{...project,elements:project.elements.filter(e=>selectedIds.includes(e.id))}:project
 let count=eraseDrawings(targetProject,points,width,soft,restore);if(scope==='drawing')return count
 for(const e of targetProject.elements){if(e.type==='drawing'||e.type==='scene'||e.locked||e.visible===false||(e.erasures?.length||0)+needed>100||restore&&!e.erasures?.some(r=>!r.restore))continue
 const angle=-(e.rotation||0)*Math.PI/180,cx=e.x+e.w/2,cy=e.y+e.h/2,local=points.map(p=>({x:(p.x-cx)*Math.cos(angle)-(p.y-cy)*Math.sin(angle)+e.w/2,y:(p.x-cx)*Math.sin(angle)+(p.y-cy)*Math.cos(angle)+e.h/2})),b=artworkBounds({...e,x:0,y:0,rotation:0}),r=width/2+(soft?width:0),corners=[{x:b.left,y:b.top},{x:b.right,y:b.top},{x:b.right,y:b.bottom},{x:b.left,y:b.bottom}]
 const inside=(p:DrawingPoint)=>p.x>=b.left-r&&p.x<=b.right+r&&p.y>=b.top-r&&p.y<=b.bottom+r
 let hit=local.some(inside)
 for(let i=1;i<local.length&&!hit;i++)for(let j=0;j<4&&!hit;j++)hit=near(local[i-1],local[i],corners[j],corners[(j+1)%4],r)
 if(hit){e.erasures=[...(e.erasures||[]),...strokeChunks(local).map(points=>({points,width,soft,...(restore?{restore:true}:{})}))];count++}
 }
 return count
}
