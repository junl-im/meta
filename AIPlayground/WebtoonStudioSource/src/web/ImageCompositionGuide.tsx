import React,{useEffect,useState} from 'react'
import type{PanelElement}from'@core/types'

/** Show the complete image around a cropped panel while its composition is being edited. */
export function ImageCompositionGuide({panel,zoom,offset}:{panel:PanelElement;zoom:number;offset?:{x:number;y:number}}){
  const [natural,setNatural]=useState<{src:string;width:number;height:number}|null>(null)
  useEffect(()=>{
    if(!panel.image){setNatural(null);return}
    let active=true
    const image=new Image()
    const update=()=>{if(active&&image.naturalWidth&&image.naturalHeight)setNatural({src:panel.image!,width:image.naturalWidth,height:image.naturalHeight})}
    image.onload=update
    image.src=panel.image
    if(image.complete&&image.naturalWidth&&image.naturalHeight)update()
    return()=>{active=false;image.onload=null}
  },[panel.image])
  if(!natural||natural.src!==panel.image)return null
  const border=Math.max(0,panel.strokeWidth??3)
  const innerW=Math.max(1,panel.w-border*2),innerH=Math.max(1,panel.h-border*2)
  const fit=panel.imageFit==='contain'?Math.min(innerW/natural.width,innerH/natural.height):Math.max(innerW/natural.width,innerH/natural.height)
  const scale=fit*(panel.imageTransform?.zoom??1)
  const width=natural.width*scale,height=natural.height*scale
  const x=offset?.x??panel.imageTransform?.offsetX??0,y=offset?.y??panel.imageTransform?.offsetY??0
  return <div className="web-image-composition-guide" aria-hidden="true" style={{left:((panel.w-width)/2+x)*zoom,top:((panel.h-height)/2+y)*zoom,width:width*zoom,height:height*zoom}}><img src={panel.image} draggable={false} alt="" style={{transform:panel.imageTransform?.flipX?'scaleX(-1)':undefined}}/></div>
}
