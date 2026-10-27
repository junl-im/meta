import React,{useMemo} from 'react'
import {artworkBounds} from '@core/artworkBounds'
import type {EditorElement} from '@core/types'

// The PC project stores eraser paths in each element's unrotated local coordinates.
export function paintErasures(ctx:CanvasRenderingContext2D,element:EditorElement,scale:number){
  for(const erasure of element.erasures||[]){
    if(erasure.points.length<2)continue
    ctx.save()
    ctx.globalCompositeOperation=erasure.restore?'source-over':'destination-out'
    ctx.strokeStyle='#fff';ctx.lineWidth=erasure.width;ctx.lineCap='round';ctx.lineJoin='round'
    if(erasure.soft)ctx.filter=`blur(${erasure.width*.25*scale}px)`
    ctx.beginPath();erasure.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke()
    ctx.restore()
  }
}

export function ErasedArtwork({element,zoom,children}:{element:EditorElement;zoom:number;children:React.ReactNode}){
  const mask=useMemo(()=>{
    if(!element.erasures?.length)return null
    const b=artworkBounds({...element,x:0,y:0,rotation:0}),pad=80,left=Math.floor(b.left-pad),top=Math.floor(b.top-pad),width=Math.ceil(b.right-b.left+2*pad),height=Math.ceil(b.bottom-b.top+2*pad)
    const pixelScale=Math.min(zoom*(devicePixelRatio||1),2,4096/Math.max(width,height),Math.sqrt(2000000/Math.max(1,width*height)))
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(width*pixelScale));canvas.height=Math.max(1,Math.ceil(height*pixelScale))
    const ctx=canvas.getContext('2d');if(!ctx)return null
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(pixelScale,0,0,pixelScale,-left*pixelScale,-top*pixelScale)
    paintErasures(ctx,element,pixelScale)
    return{left,top,width,height,url:canvas.toDataURL()}
  },[element.erasures,element.w,element.h,element.type,element.type==='bubble'?element.tailX:0,element.type==='bubble'?element.tailY:0,zoom])
  if(!mask)return <>{children}</>
  return <div className="web-erased-artwork" style={{position:'absolute',pointerEvents:'none',left:mask.left*zoom,top:mask.top*zoom,width:mask.width*zoom,height:mask.height*zoom,maskImage:`url(${mask.url})`,maskSize:'100% 100%',maskRepeat:'no-repeat',WebkitMaskImage:`url(${mask.url})`,WebkitMaskSize:'100% 100%',WebkitMaskRepeat:'no-repeat'}}><div style={{position:'absolute',pointerEvents:'auto',left:-mask.left*zoom,top:-mask.top*zoom,width:element.w*zoom,height:element.h*zoom}}>{children}</div></div>
}
