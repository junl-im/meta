import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(root,'WebtoonStudioSource/src/web/main.tsx');
const pngSource=path.join(root,'WebtoonStudioSource/src/web/pngExport.ts');
const runtime=path.join(root,'WebtoonStudio/assets/index-GomFoxWebtoon-v1.js');
function replaceOnce(file,from,to){
  const before=fs.readFileSync(file,'utf8'),index=before.indexOf(from);
  if(index<0||before.indexOf(from,index+from.length)>=0)throw Error(`Expected exactly one marker in ${file}: ${from.slice(0,80)}`);
  fs.writeFileSync(file,before.slice(0,index)+to+before.slice(index+from.length));
}

const sourcePath=`function drawUnifiedBubblePath(ctx:CanvasRenderingContext2D,e:Extract<EditorElement,{type:'bubble'}>,tailX=e.tailX??e.w*.65,tailY=e.tailY??e.h+35){
  const w=e.w,h=e.h,r=e.kind==='narration'?8:Math.min(38,h/2),x=Math.max(0,Math.min(w,tailX)),y=Math.max(h+12,tailY),base=Math.max(r+32,Math.min(w-r-32,x));
  ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(w-r,0);ctx.quadraticCurveTo(w,0,w,r);ctx.lineTo(w,h-r);ctx.quadraticCurveTo(w,h,w-r,h);
  if(e.kind!=='narration'){ctx.lineTo(base+30,h);ctx.lineTo(x,y);ctx.lineTo(base-30,h)}
  ctx.lineTo(r,h);ctx.quadraticCurveTo(0,h,0,h-r);ctx.lineTo(0,r);ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();
}
`;
const browserDraw=`function drawBubbleCanvas(canvas:HTMLCanvasElement,e:Extract<EditorElement,{type:'bubble'}>,zoom:number,point:{x:number;y:number}){
  const padding=5,dpr=Math.min(devicePixelRatio||1,2),width=(e.w+padding*2)*zoom,height=(Math.max(e.h+12,point.y)+padding*2)*zoom;
  canvas.style.left=-padding*zoom+'px';canvas.style.top=-padding*zoom+'px';canvas.style.width=width+'px';canvas.style.height=height+'px';
  canvas.width=Math.ceil(width*dpr);canvas.height=Math.ceil(height*dpr);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  ctx.setTransform(zoom*dpr,0,0,zoom*dpr,padding*zoom*dpr,padding*zoom*dpr);
  ctx.fillStyle=e.fill||'#fff';ctx.strokeStyle=e.stroke||'#263b47';ctx.lineWidth=e.strokeWidth??3;
  drawUnifiedBubblePath(ctx,e,point.x,point.y);ctx.fill();ctx.stroke();
}
`;
replaceOnce(source,'function WebApp(){',sourcePath+browserDraw+'function WebApp(){');
replaceOnce(source,"e.type==='bubble'?<>{e.kind",`e.type==='bubble'?<><canvas className="web-bubble-canvas" ref={canvas=>{if(canvas)drawBubbleCanvas(canvas,e,zoom,tailPoint(e))}}/>{e.kind`);
replaceOnce(pngSource,'function drawElement(ctx:CanvasRenderingContext2D,e:EditorElement,images:Map<string,HTMLImageElement>){',sourcePath+'function drawElement(ctx:CanvasRenderingContext2D,e:EditorElement,images:Map<string,HTMLImageElement>){');
replaceOnce(pngSource,"if(e.kind!=='narration'){const tx=e.tailX??e.w*.65,ty=e.tailY??e.h+35;ctx.beginPath();ctx.moveTo(e.w*.42,e.h*.9);ctx.lineTo(tx,ty);ctx.lineTo(e.w*.66,e.h*.9);ctx.closePath();ctx.fill();ctx.stroke()}",'');
replaceOnce(pngSource,"ctx.beginPath();ctx.roundRect(0,0,e.w,e.h,e.kind==='narration'?8:Math.min(38,e.h/2));ctx.fill();ctx.stroke()","drawUnifiedBubblePath(ctx,e);ctx.fill();ctx.stroke()");

const runtimePath="function drawUnifiedBubblePath(ctx,e,tailX=e.tailX??e.w*.65,tailY=e.tailY??e.h+35){let w=e.w,h=e.h,r=e.kind===`narration`?8:Math.min(38,h/2),x=Math.max(0,Math.min(w,tailX)),y=Math.max(h+12,tailY),base=Math.max(r+32,Math.min(w-r-32,x));ctx.beginPath(),ctx.moveTo(r,0),ctx.lineTo(w-r,0),ctx.quadraticCurveTo(w,0,w,r),ctx.lineTo(w,h-r),ctx.quadraticCurveTo(w,h,w-r,h);e.kind!==`narration`&&(ctx.lineTo(base+30,h),ctx.lineTo(x,y),ctx.lineTo(base-30,h));ctx.lineTo(r,h),ctx.quadraticCurveTo(0,h,0,h-r),ctx.lineTo(0,r),ctx.quadraticCurveTo(0,0,r,0),ctx.closePath()}";
const runtimeDraw="function drawBubbleCanvas(canvas,e,zoom,point){let padding=5,dpr=Math.min(devicePixelRatio||1,2),width=(e.w+padding*2)*zoom,height=(Math.max(e.h+12,point.y)+padding*2)*zoom;canvas.style.left=-padding*zoom+`px`,canvas.style.top=-padding*zoom+`px`,canvas.style.width=width+`px`,canvas.style.height=height+`px`,canvas.width=Math.ceil(width*dpr),canvas.height=Math.ceil(height*dpr);let ctx=canvas.getContext(`2d`);ctx&&(ctx.setTransform(zoom*dpr,0,0,zoom*dpr,padding*zoom*dpr,padding*zoom*dpr),ctx.fillStyle=e.fill||`#fff`,ctx.strokeStyle=e.stroke||`#263b47`,ctx.lineWidth=e.strokeWidth??3,drawUnifiedBubblePath(ctx,e,point.x,point.y),ctx.fill(),ctx.stroke())}";
replaceOnce(runtime,'function Ot(',runtimePath+runtimeDraw+'function Ot(');
replaceOnce(runtime,'e.type===`bubble`?(0,R.jsxs)(R.Fragment,{children:[e.kind','e.type===`bubble`?(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(`canvas`,{className:`web-bubble-canvas`,ref:t=>{t&&drawBubbleCanvas(t,e,i,tailPoint(e))}}),e.kind');
replaceOnce(runtime,'if(e.fillStyle=t.fill||`#fff`,e.strokeStyle=t.stroke||`#262b36`,e.lineWidth=t.strokeWidth??3,t.kind!==`narration`){let n=t.tailX??t.w*.65,r=t.tailY??t.h+35;e.beginPath(),e.moveTo(t.w*.42,t.h*.9),e.lineTo(n,r),e.lineTo(t.w*.66,t.h*.9),e.closePath(),e.fill(),e.stroke()}e.beginPath(),e.roundRect(0,0,t.w,t.h,t.kind===`narration`?8:Math.min(38,t.h/2)),e.fill(),e.stroke()','e.fillStyle=t.fill||`#fff`,e.strokeStyle=t.stroke||`#262b36`,e.lineWidth=t.strokeWidth??3,drawUnifiedBubblePath(e,t),e.fill(),e.stroke()');
console.log('Unified speech-bubble contour applied to web preview and PNG export.');
