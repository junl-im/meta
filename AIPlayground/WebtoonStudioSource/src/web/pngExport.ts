import {zipSync} from 'fflate'
import type {EditorElement,ProjectV4} from '@core/types'

const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('이미지를 읽지 못했습니다.'));image.src=src})
const canvasBlob=(canvas:HTMLCanvasElement)=>new Promise<Uint8Array>((resolve,reject)=>canvas.toBlob(async blob=>blob?resolve(new Uint8Array(await blob.arrayBuffer())):reject(Error('PNG를 만들지 못했습니다.')),'image/png'))
function wrap(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,lineHeight:number){let line='';for(const paragraph of text.split('\n')){for(const char of paragraph){if(ctx.measureText(line+char).width>width&&line){ctx.fillText(line,x,y);y+=lineHeight;line=''}line+=char}ctx.fillText(line,x,y);y+=lineHeight;line=''}}
function drawUnifiedBubblePath(ctx:CanvasRenderingContext2D,e:Extract<EditorElement,{type:'bubble'}>,tailX=e.tailX??e.w*.65,tailY=e.tailY??e.h+35){
  const w=e.w,h=e.h,r=e.kind==='narration'||e.kind==='radio'?8:e.kind==='tremble'?4:e.kind==='shout'||e.kind==='burst'?0:e.kind==='whisper'?18:e.kind==='thought'||e.kind==='cloud'||e.kind==='rounded'?Math.min(h/2,w/4):Math.min(38,h/2),x=Math.max(0,Math.min(w,tailX)),y=Math.max(h+12,tailY),base=Math.max(r+32,Math.min(w-r-32,x));
  ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r);ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);
  if(e.kind!=='narration'){ctx.lineTo(base+30,h);ctx.lineTo(x,y);ctx.lineTo(base-30,h)}
  ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();
}
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
    if(image){ctx.save();panelPath(ctx,e);ctx.clip();const fit=e.imageFit==='contain'?Math.min(e.w/image.width,e.h/image.height):Math.max(e.w/image.width,e.h/image.height),zoom=e.imageTransform?.zoom||1,w=image.width*fit*zoom,h=image.height*fit*zoom;ctx.translate(e.w/2+(e.imageTransform?.offsetX||0),e.h/2+(e.imageTransform?.offsetY||0));if(e.imageTransform?.flipX)ctx.scale(-1,1);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore()}
    ctx.strokeStyle=e.stroke||'#262b36';ctx.lineWidth=e.strokeWidth??3;panelPath(ctx,e);ctx.stroke()
  }else if(e.type==='bubble'){
    ctx.fillStyle=e.fill||'#fff';ctx.strokeStyle=e.stroke||'#262b36';ctx.lineWidth=e.strokeWidth??3

    drawUnifiedBubblePath(ctx,e);ctx.fill();ctx.stroke()
    ctx.fillStyle=e.color||'#1a2331';ctx.font=`${e.fontWeight||'600'} ${e.fontSize||24}px ${e.fontFamily||'sans-serif'}`;ctx.textBaseline='top';wrap(ctx,e.text,14,12,e.w-28,(e.fontSize||24)*1.3)
  }else if(e.type==='text'){ctx.fillStyle=e.color||'#1a2331';ctx.font=`${e.fontWeight||'700'} ${e.fontSize||36}px ${e.fontFamily||'sans-serif'}`;ctx.textBaseline='top';wrap(ctx,e.text,4,4,e.w-8,(e.fontSize||36)*1.3)}
  else if(e.type==='drawing'){ctx.strokeStyle=e.stroke;ctx.lineWidth=e.strokeWidth;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();e.points.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));ctx.stroke()}
  ctx.restore()
}
export async function exportDraftPng(project:ProjectV4){
  const images=new Map<string,HTMLImageElement>()
  for(const src of new Set(project.elements.filter(e=>e.type==='panel'&&e.image).map(e=>(e as {image:string}).image)))images.set(src,await loadImage(src))
  const files:Record<string,Uint8Array>={},scale=690/project.canvas.width,sourceHeight=Math.max(1,Math.floor(2000/scale)),elements=project.elements.filter(e=>e.visible!==false&&e.type!=='scene').sort((a,b)=>a.z-b.z)
  let part=0
  for(let start=0;start<project.canvas.height;start+=sourceHeight){const end=Math.min(project.canvas.height,start+sourceHeight),canvas=document.createElement('canvas');canvas.width=690;canvas.height=Math.ceil((end-start)*scale);const ctx=canvas.getContext('2d');if(!ctx)throw Error('브라우저 캔버스를 사용할 수 없습니다.');ctx.fillStyle=project.canvas.background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,0,-start*scale);for(const e of elements){const tail=e.type==='bubble'&&e.kind!=='narration'?(e.tailY??e.h+35):e.h;if(e.y+Math.max(e.h,tail)>=start&&e.y+Math.min(0,tail)<=end)drawElement(ctx,e,images)}files[`${String(++part).padStart(3,'0')}.png`]=await canvasBlob(canvas)}
  return zipSync(files,{level:6})
}
