export interface ToolRect {x:number;y:number;width:number;height:number}
export type ToolMode='docked'|'floating'|'minimized'|'closed'
export function recoverSideRects(entries:Array<{rect:ToolRect;manual:boolean;preferRight:boolean}>,viewportWidth:number,viewportHeight:number,topInset:number):ToolRect[]{
 const occupied=entries.filter(e=>e.manual).map(e=>fitToolRect(e.rect,viewportWidth,viewportHeight))
 return entries.map(e=>{if(e.manual)return fitToolRect(e.rect,viewportWidth,viewportHeight);const rect=placeSideToolRect(e.rect,occupied,viewportWidth,viewportHeight,topInset,e.preferRight);occupied.push(rect);return rect})
}
export function nextToolMode(mode:ToolMode,canDock=true):ToolMode{
 return mode==='floating'?'closed':mode==='docked'?'floating':canDock?'docked':'floating'
}
/** Start beside the left sidebar, leaving the toolbar and screen edges visible. */
export function defaultToolRect(width:number,viewportWidth:number,viewportHeight:number,leftEdge=240,topInset=140):ToolRect{
 const top=Math.max(8,Math.min(topInset,viewportHeight-188))
 return fitToolRect({x:leftEdge+12,y:top,width,height:Math.min(760,viewportHeight-top-16)},viewportWidth,viewportHeight)
}
/** Keep new windows on the side rails; occupied rails push the next window opposite. */
export function placeSideToolRect(rect:ToolRect,occupied:ToolRect[],viewportWidth:number,viewportHeight:number,topInset=140,preferRight=false):ToolRect{
 const top=Math.max(8,Math.min(Number.isFinite(topInset)?topInset:140,Math.max(8,viewportHeight-188)))
 const fitted=fitToolRect({...rect,y:top,height:Math.min(rect.height,Math.max(180,viewportHeight-top-16))},viewportWidth,viewportHeight)
 const xs=preferRight?[viewportWidth-fitted.width-8,8]:[8,viewportWidth-fitted.width-8]
 const minimumHeight=Math.min(420,fitted.height)
 // Limit overlap offsets to the sidebar's upper area; never seek a bottom opening.
 const ys=[top,...[top+40,top+80].filter(y=>y<=viewportHeight-minimumHeight-8)]
 const candidates=xs.flatMap(x=>ys.map(y=>fitToolRect({...fitted,x,y,height:Math.min(fitted.height,Math.max(180,viewportHeight-y-8))},viewportWidth,viewportHeight)))
 const area=(a:ToolRect,b:ToolRect)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))
 const score=(r:ToolRect)=>occupied.reduce((sum,b)=>sum+area(r,b)+area(r,{...b,height:40})*8,0)+(fitted.height-r.height)*fitted.width*.5
 return candidates.reduce((best,r)=>score(r)<score(best)?r:best,candidates[0])
}
/** Tile readable windows; callers may minimize overflow instead of shrinking text. */
export function arrangeToolRects(count:number,viewportWidth:number,viewportHeight:number,topInset=140):ToolRect[]{
  const width=Math.max(320,viewportWidth),height=Math.max(240,viewportHeight),top=Math.max(8,Math.min(Number.isFinite(topInset)?topInset:140,height-188))
  const columns=width>=900?2:1,rows=Math.max(1,Math.floor((height-top-16)/180))
  const visible=Math.min(Math.max(0,Math.floor(count)),columns*rows)
  if(!visible)return []
  const usedColumns=Math.min(columns,visible),usedRows=Math.ceil(visible/usedColumns)
  const w=(width-24)/usedColumns-8,h=(height-top-16)/usedRows-8
  return Array.from({length:visible},(_,i)=>fitToolRect({x:8+(i%usedColumns)*(w+8),y:top+Math.floor(i/usedColumns)*(h+8),width:w,height:h},viewportWidth,viewportHeight))
}
export function fitToolRect(rect:ToolRect,viewportWidth:number,viewportHeight:number):ToolRect {
  const vw=Math.max(100,viewportWidth),vh=Math.max(100,viewportHeight)
  const finite=(v:number,fallback:number)=>Number.isFinite(v)?v:fallback
  const width=Math.min(vw-16,Math.max(Math.min(280,vw-16),finite(rect.width,360)))
  const height=Math.min(vh-16,Math.max(Math.min(180,vh-16),finite(rect.height,500)))
  return {x:Math.min(vw-width-8,Math.max(8,finite(rect.x,40))),y:Math.min(vh-height-8,Math.max(8,finite(rect.y,100))),width,height}
}

/** Prefer an unoccupied opening position without moving existing windows. */
export function placeToolRect(rect:ToolRect,occupied:ToolRect[],viewportWidth:number,viewportHeight:number,topInset=140):ToolRect{
 const top=Math.max(8,Math.min(Number.isFinite(topInset)?topInset:140,Math.max(8,viewportHeight-188)))
 const fitted=fitToolRect({...rect,height:Math.min(rect.height,Math.max(180,viewportHeight-top-8))},viewportWidth,viewportHeight)
 const fit=(x:number,y:number)=>fitToolRect({...fitted,x,y:Math.max(top,y)},viewportWidth,viewportHeight)
 const original=fit(fitted.x,fitted.y)
 const area=(a:ToolRect,b:ToolRect)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y))
 const score=(r:ToolRect)=>occupied.reduce((sum,b)=>sum+area(r,b)+area(r,{...b,height:40})*3,0)
 if(!score(original))return original
 const candidates=[original,fit(8,top),fit(viewportWidth-fitted.width-8,top),fit(8,viewportHeight-fitted.height-8),fit(viewportWidth-fitted.width-8,viewportHeight-fitted.height-8),...occupied.flatMap(b=>[fit(b.x+b.width+8,b.y),fit(b.x-fitted.width-8,b.y),fit(b.x,b.y+b.height+8)])]
 return candidates.reduce((best,r)=>score(r)<score(best)?r:best,original)
}
