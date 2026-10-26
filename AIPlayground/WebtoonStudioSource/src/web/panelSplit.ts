import {splitPanel} from '@core/panelSplit'
import type {PanelElement} from '@core/types'

/** Preserve the source image's canvas coordinates when a cut becomes two cuts. */
export function splitWebPanel(panel:PanelElement,axis:'x'|'y',ids:[string,string],imageSize?:{width:number;height:number}):[PanelElement,PanelElement]{
  const children=splitPanel(panel,axis,.5,12,ids)
  if(!panel.image)return children
  if(!imageSize?.width||!imageSize.height)throw new Error('이미지 크기를 읽지 못해 컷을 분할할 수 없습니다.')
  const fit=(cut:PanelElement)=>{
    const ratios=[cut.w/imageSize.width,cut.h/imageSize.height]
    return cut.imageFit==='contain'?Math.min(...ratios):Math.max(...ratios)
  }
  const oldFit=fit(panel),old=panel.imageTransform,sourceX=panel.x+panel.w/2+(old?.offsetX||0),sourceY=panel.y+panel.h/2+(old?.offsetY||0)
  for(const child of children){
    child.imageTransform={zoom:oldFit*(old?.zoom||1)/fit(child),offsetX:sourceX-child.x-child.w/2,offsetY:sourceY-child.y-child.h/2,flipX:old?.flipX||false}
  }
  return children
}
