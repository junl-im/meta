import type {EditorElement,PanelElement} from './types.js'

export interface ImageCompositionDraft {projectId:string;id:string;source:string;original:string;imageFit:PanelElement['imageFit'];imageTransform:NonNullable<PanelElement['imageTransform']>}
const signature=(panel:PanelElement)=>JSON.stringify([panel.x,panel.y,panel.w,panel.h,panel.rotation||0,panel.imageFit||'cover',{zoom:1,offsetX:0,offsetY:0,flipX:false,...panel.imageTransform}])
export function compositionMatches(draft:ImageCompositionDraft|null,projectId:string,element:EditorElement):element is PanelElement{return !!draft&&draft.projectId===projectId&&element.type==='panel'&&element.id===draft.id&&element.image===draft.source&&!element.locked&&element.visible!==false&&signature(element)===draft.original}
export function createCompositionDraft(projectId:string,panel:PanelElement):ImageCompositionDraft{return {projectId,id:panel.id,source:panel.image!,original:signature(panel),imageFit:panel.imageFit||'cover',imageTransform:{zoom:1,offsetX:0,offsetY:0,flipX:false,...panel.imageTransform}}}
export function compositionElement(element:EditorElement,draft:ImageCompositionDraft|null,projectId:string):EditorElement{return compositionMatches(draft,projectId,element)?{...element,imageFit:draft!.imageFit,imageTransform:draft!.imageTransform}:element}
export function compositionChanged(draft:ImageCompositionDraft,panel:PanelElement){return JSON.stringify([draft.imageFit,draft.imageTransform])!==JSON.stringify([panel.imageFit||'cover',{zoom:1,offsetX:0,offsetY:0,flipX:false,...panel.imageTransform}])}

/** Conservative source bounds check; never claims to detect faces or drawn content. */
export function sourceOutsidePanel(panel:PanelElement,width:number,height:number){
 if(!(width>0&&height>0))return false
 const fit=(panel.imageFit==='contain'?Math.min:Math.max)(panel.w/width,panel.h/height),zoom=panel.imageTransform?.zoom??1
 const w=width*fit*zoom,h=height*fit*zoom,x=(panel.w-w)/2+(panel.imageTransform?.offsetX??0),y=(panel.h-h)/2+(panel.imageTransform?.offsetY??0)
 return x>=panel.w||x+w<=0||y>=panel.h||y+h<=0
}

/** Keep the source point under the cursor stationary, including rotated panels. */
export function zoomPanelImageAt(panel:PanelElement, point:{x:number;y:number}, requestedZoom:number){
 const original={zoom:1,offsetX:0,offsetY:0,flipX:false,...panel.imageTransform}
 const zoom=Math.max(.1,Math.min(5,requestedZoom))
 if(!Number.isFinite(zoom)||!Number.isFinite(point.x)||!Number.isFinite(point.y)||zoom===original.zoom)return original
 const angle=-(panel.rotation||0)*Math.PI/180,dx=point.x-panel.x-panel.w/2,dy=point.y-panel.y-panel.h/2
 const x=dx*Math.cos(angle)-dy*Math.sin(angle),y=dx*Math.sin(angle)+dy*Math.cos(angle),ratio=zoom/original.zoom
 return {...original,zoom,offsetX:x-(x-original.offsetX)*ratio,offsetY:y-(y-original.offsetY)*ratio}
}
