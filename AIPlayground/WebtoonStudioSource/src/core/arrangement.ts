import type {ProjectV4} from './types.js'

export function distributeElements(project:ProjectV4,ids:string[],axis:'x'|'y'):boolean{
  const size=axis==='x'?'w':'h',items=project.elements.filter(e=>ids.includes(e.id)&&!e.locked&&e.visible!==false).sort((a,b)=>a[axis]-b[axis])
  if(items.length<3)return false
  const first=items[0][axis],last=items.at(-1)!,end=last[axis]+last[size],gap=(end-first-items.reduce((sum,e)=>sum+e[size],0))/(items.length-1)
  let cursor=first,changed=false
  for(const item of items){if(item[axis]!==cursor)changed=true;item[axis]=cursor;cursor+=item[size]+gap}
  return changed
}

export function snapBox(box:{x:number;y:number;w:number;h:number},targets:Array<{x:number;y:number;w:number;h:number}>,distance:number){
  let dx=0,dy=0,bestX=distance+1,bestY=distance+1,guides:{x?:number;y?:number}={}
  for(const target of targets){
    for(const tx of [target.x,target.x+target.w/2,target.x+target.w])for(const bx of [box.x,box.x+box.w/2,box.x+box.w]){const d=tx-bx;if(Math.abs(d)<=distance&&Math.abs(d)<bestX){dx=d;bestX=Math.abs(d);guides.x=tx}}
    for(const ty of [target.y,target.y+target.h/2,target.y+target.h])for(const by of [box.y,box.y+box.h/2,box.y+box.h]){const d=ty-by;if(Math.abs(d)<=distance&&Math.abs(d)<bestY){dy=d;bestY=Math.abs(d);guides.y=ty}}
  }
  return {x:Math.max(0,box.x+dx),y:Math.max(0,box.y+dy),guides}
}
