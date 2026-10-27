import {zipSync} from 'fflate'
import type {EditorElement,ProjectV4,TextEffect} from '@core/types'
import {imageFilterCss} from './imageFilter'
import {drawBubbleShape} from './bubbleShape'
import {paintDrawing} from './drawingPaint'
import {paintErasures} from './erasureMask'

const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));image.src=src})
const canvasBlob=(canvas:HTMLCanvasElement)=>new Promise<Uint8Array>((resolve,reject)=>canvas.toBlob(async blob=>blob?resolve(new Uint8Array(await blob.arrayBuffer())):reject(Error('PNG를 만들지 못했습니다.')),'image/png'))
function drawTextLine(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,effect?:TextEffect){
  ctx.save()
  const outline=Math.min(12,Math.max(0,effect?.outlineWidth||0)),shadow=Math.min(24,Math.max(0,effect?.shadowSize||0))
  if(effect?.letterSpacing&&'letterSpacing'in ctx)ctx.letterSpacing=`${effect.letterSpacing}px`
  if(outline){ctx.lineJoin='round';ctx.lineWidth=outline;ctx.strokeStyle=effect?.outlineColor||'#111111';ctx.strokeText(text,x,y)}
  if(shadow){ctx.shadowColor=effect?.shadowColor||'#222222';ctx.shadowBlur=shadow;ctx.shadowOffsetY=effect?.glow?0:Math.max(1,shadow*.25)}
  ctx.fillText(text,x,y)
  ctx.restore()
}
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,lineHeight:number,effect?:TextEffect){ctx.save();if(effect?.letterSpacing&&'letterSpacing'in ctx)ctx.letterSpacing=`${effect.letterSpacing}px`;let line='';for(const paragraph of text.split('\n')){for(const char of paragraph){if(ctx.measureText(line+char).width>width&&line){drawTextLine(ctx,line,x,y,effect);y+=lineHeight;line=''}line+=char}drawTextLine(ctx,line,x,y,effect);y+=lineHeight;line=''}ctx.restore()}
function panelPath(ctx:CanvasRenderingContext2D,e:Extract<EditorElement,{type:'panel'}>){
  const w=e.w,h=e.h
  ctx.beginPath()
  if(e.shape==='ellipse'){ctx.ellipse(w/2,h/2,w/2,h/2,0,0,Math.PI*2);ctx.closePath();return}
  if(e.shape==='rounded'){
    const r=Math.min(24,w/2,h/2)
    ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r)
    ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);ctx.lineTo(r,h)
    ctx.quadraticCurveTo(0,h,0,h-r);ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0)
    ctx.closePath();return
  }
  ctx.rect(0,0,w,h)
}
function drawElement(ctx:CanvasRenderingContext2D,e:EditorElement,images:Map<string,HTMLImageElement>){
  ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);ctx.rotate((e.rotation||0)*Math.PI/180);ctx.translate(-e.w/2,-e.h/2)
  if(e.type==='panel'){
    ctx.fillStyle=e.fill||'#fff';panelPath(ctx,e);ctx.fill()
    const image=e.image?images.get(e.image):null
    if(image){ctx.save();panelPath(ctx,e);ctx.clip();const fit=e.imageFit==='contain'?Math.min(e.w/image.width,e.h/image.height):Math.max(e.w/image.width,e.h/image.height),zoom=e.imageTransform?.zoom||1,w=image.width*fit*zoom,h=image.height*fit*zoom;ctx.translate(e.w/2+(e.imageTransform?.offsetX||0),e.h/2+(e.imageTransform?.offsetY||0));if(e.imageTransform?.flipX)ctx.scale(-1,1);ctx.filter=imageFilterCss(e.imageFilter);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore()}
    ctx.strokeStyle=e.stroke||'#262b36';ctx.lineWidth=e.strokeWidth??3;panelPath(ctx,e);ctx.stroke()
  }else if(e.type==='bubble'){
    drawBubbleShape(ctx,e)
    ctx.fillStyle=e.color||'#1a2331';ctx.font=`${e.fontWeight||'600'} ${e.fontSize||24}px ${e.fontFamily||'sans-serif'}`;ctx.textBaseline='top';ctx.textAlign=e.align||'center';wrap(ctx,e.text,e.align==='left'?14:e.align==='right'?e.w-14:e.w/2,12,e.w-28,(e.fontSize||24)*(e.textEffect?.lineHeight??1.3),e.textEffect)
  }else if(e.type==='text'){ctx.fillStyle=e.color||'#1a2331';ctx.font=`${e.fontWeight||'700'} ${e.fontSize||36}px ${e.fontFamily||'sans-serif'}`;ctx.textBaseline='top';ctx.textAlign=e.align||'left';wrap(ctx,e.text,e.align==='center'?e.w/2:e.align==='right'?e.w-4:4,4,e.w-8,(e.fontSize||36)*(e.textEffect?.lineHeight??1.3),e.textEffect)}
  else if(e.type==='drawing'){const transform=ctx.getTransform();paintDrawing(ctx,e.points,e.stroke,e.strokeWidth,e.brush||'pen',e.opacity??1,Math.hypot(transform.a,transform.b))}
  ctx.restore()
}
export async function exportDraftPng(project:ProjectV4){
  const images=new Map<string,HTMLImageElement>()
  for(const src of new Set(project.elements.filter(e=>e.type==='panel'&&e.image).map(e=>(e as {image:string}).image)))images.set(src,await loadImage(src))
  const files:Record<string,Uint8Array>={},scale=690/project.canvas.width,sourceHeight=Math.max(1,Math.floor(2000/scale)),elements=project.elements.filter(e=>e.visible!==false&&e.type!=='scene').sort((a,b)=>a.z-b.z)
  let part=0
  for(let start=0;start<project.canvas.height;start+=sourceHeight){const end=Math.min(project.canvas.height,start+sourceHeight),canvas=document.createElement('canvas');canvas.width=690;canvas.height=Math.ceil((end-start)*scale);const ctx=canvas.getContext('2d');if(!ctx)throw Error('브라우저 캔버스를 사용할 수 없습니다.');ctx.fillStyle=project.canvas.background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,0,-start*scale);for(const e of elements){const tail=e.type==='bubble'&&e.kind!=='narration'?(e.tailY??e.h+35):e.h;if(e.y+Math.max(e.h,tail)<start||e.y+Math.min(0,tail)>end)continue
    if(!e.erasures?.length){drawElement(ctx,e,images);continue}
    // Render this element separately so erasing never affects the background or another layer.
    const isolated=document.createElement('canvas');isolated.width=canvas.width;isolated.height=canvas.height
    const artwork=isolated.getContext('2d');if(!artwork)throw Error('지우개 효과를 적용하지 못했습니다.')
    artwork.setTransform(scale,0,0,scale,0,-start*scale);drawElement(artwork,e,images)
    const mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height
    const maskCtx=mask.getContext('2d');if(!maskCtx)throw Error('지우개 효과를 적용하지 못했습니다.')
    maskCtx.fillStyle='#fff';maskCtx.fillRect(0,0,mask.width,mask.height)
    maskCtx.setTransform(scale,0,0,scale,0,-start*scale);maskCtx.translate(e.x+e.w/2,e.y+e.h/2);maskCtx.rotate((e.rotation||0)*Math.PI/180);maskCtx.translate(-e.w/2,-e.h/2)
    paintErasures(maskCtx,e,scale)
    artwork.setTransform(1,0,0,1,0,0);artwork.globalCompositeOperation='destination-in';artwork.drawImage(mask,0,0)
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(isolated,0,0);ctx.restore()
  }files[`${String(++part).padStart(3,'0')}.png`]=await canvasBlob(canvas)}
  return zipSync(files,{level:6})
}
