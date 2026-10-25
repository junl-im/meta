import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// The web snapshot does not contain the desktop core needed by Vite. Keep its
// readable source and the already-built browser runtime in sync until the
// complete upstream source is imported.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(root,'WebtoonStudioSource/src/web/main.tsx');
const runtime=path.join(root,'WebtoonStudio/assets/index-GomFoxWebtoon-v1.js');
const pngSource=path.join(root,'WebtoonStudioSource/src/web/pngExport.ts');

function patch(file,replacements,marker){
  let code=fs.readFileSync(file,'utf8');
  if(code.includes(marker)){console.log(`Already upgraded: ${path.relative(root,file)}`);return;}
  for(const [from,to] of replacements){
    const first=code.indexOf(from);
    if(first<0||code.indexOf(from,first+from.length)>=0)throw Error(`Expected one match in ${file}: ${from.slice(0,90)}`);
    code=code.slice(0,first)+to+code.slice(first+from.length);
  }
  fs.writeFileSync(file,code);
  console.log(`Upgraded: ${path.relative(root,file)}`);
}

patch(source,[
  ["[dragAt,setDragAt]=useState<{id:string;x:number;y:number}|null>(null)","[dragAt,setDragAt]=useState<{id:string;x:number;y:number}|null>(null),tailDrag=useRef<{id:string;x:number;y:number;tailX:number;tailY:number}|null>(null),[tailDragAt,setTailDragAt]=useState<{id:string;x:number;y:number}|null>(null),fitMode=useRef(true)"],
  ["  const place=(e:EditorElement)=>",`  const fitWidth=()=>{const area=document.querySelector('.web-canvas-scroll');if(!area)return;const inset=innerWidth<=760?30:80;setZoom(Math.max(.2,Math.min(1.25,(area.clientWidth-inset)/current.current.canvas.width)))}
  useEffect(()=>{const sync=()=>{if(fitMode.current)fitWidth()};addEventListener('resize',sync);return()=>removeEventListener('resize',sync)},[])
  const tailPoint=(e:Extract<EditorElement,{type:'bubble'}>)=>tailDragAt?.id===e.id?tailDragAt:{x:e.tailX??e.w*.65,y:e.tailY??e.h+35}
  const tailStyle=(e:Extract<EditorElement,{type:'bubble'}>)=>{const {x,y}=tailPoint(e),left=Math.min(0,x,e.w*.42),top=Math.min(0,y,e.h*.9),w=Math.max(e.w,x,e.w*.66)-left,h=Math.max(e.h,y,e.h*.9)-top;return{left:left*zoom,top:top*zoom,width:w*zoom,height:h*zoom,bottom:'auto',transform:'none',border:0,background:e.fill||'#fff',pointerEvents:'none' as const,clipPath:\`polygon(\${(e.w*.42-left)/w*100}% \${(e.h*.9-top)/h*100}%,\${(x-left)/w*100}% \${(y-top)/h*100}%,\${(e.w*.66-left)/w*100}% \${(e.h*.9-top)/h*100}%)\`}}
  const onTailDown=(event:React.PointerEvent,e:Extract<EditorElement,{type:'bubble'}>)=>{event.stopPropagation();event.preventDefault();if(event.button!==0||e.locked)return;const {x,y}=tailPoint(e);tailDrag.current={id:e.id,x:event.clientX,y:event.clientY,tailX:x,tailY:y};event.currentTarget.setPointerCapture(event.pointerId)}
  const onTailMove=(event:React.PointerEvent)=>{event.stopPropagation();const drag=tailDrag.current;if(drag)setTailDragAt({id:drag.id,x:Math.round(drag.tailX+(event.clientX-drag.x)/zoom),y:Math.round(drag.tailY+(event.clientY-drag.y)/zoom)})}
  const onTailUp=(event:React.PointerEvent)=>{event.stopPropagation();const drag=tailDrag.current;if(!drag)return;const x=Math.round(drag.tailX+(event.clientX-drag.x)/zoom),y=Math.round(drag.tailY+(event.clientY-drag.y)/zoom);tailDrag.current=null;setTailDragAt(null);if(x!==drag.tailX||y!==drag.tailY)edit(drag.id,e=>{if(e.type==='bubble'){e.tailX=x;e.tailY=y}})}
  const place=(e:EditorElement)=>`],
  ["<label>확대 <input type=\"range\" min=\".35\" max=\"1.25\" step=\".05\" value={zoom} onChange={e=>setZoom(Number(e.target.value))}/>{Math.round(zoom*100)}%</label>","<button type=\"button\" className=\"web-fit\" onClick={()=>{fitMode.current=true;fitWidth()}}>너비 맞춤</button><label>확대 <input type=\"range\" min=\".2\" max=\"1.25\" step=\".01\" value={zoom} onChange={e=>{fitMode.current=false;setZoom(Number(e.target.value))}}/>{Math.round(zoom*100)}%</label>"],
  ["<div className=\"web-tail\" style={{borderTopColor:e.fill||'#fff'}}/>","e.kind!=='narration'&&<><div className=\"web-tail\" style={tailStyle(e)}/>{selected===e.id&&<button type=\"button\" className=\"web-tail-handle\" aria-label=\"말풍선 꼬리 이동\" title=\"드래그해서 꼬리 이동\" style={{left:tailPoint(e).x*zoom-20,top:tailPoint(e).y*zoom-20}} onPointerDown={event=>onTailDown(event,e)} onPointerMove={onTailMove} onPointerUp={onTailUp} onPointerCancel={()=>{tailDrag.current=null;setTailDragAt(null)}}/>}</>"],
  ["{selectedElement.type==='bubble'&&<label>말풍선 유형",`{selectedElement.type==='bubble'&&<div className="web-tail-controls"><h3>말풍선 꼬리</h3><p>캔버스의 금빛 점을 끌거나 좌표를 입력하세요.</p><div className="web-metrics"><label>꼬리 좌우<input type="number" aria-label="꼬리 좌우" value={Math.round(selectedElement.tailX??selectedElement.w*.65)} onChange={event=>edit(selectedElement.id,e=>{if(e.type==='bubble')e.tailX=Number(event.target.value)||0})}/></label><label>꼬리 상하<input type="number" aria-label="꼬리 상하" value={Math.round(selectedElement.tailY??selectedElement.h+35)} onChange={event=>edit(selectedElement.id,e=>{if(e.type==='bubble')e.tailY=Number(event.target.value)||0})}/></label></div></div>}{selectedElement.type==='bubble'&&<label>말풍선 유형`]
],'web-tail-handle');

patch(pngSource,[
  ["for(const e of elements)if(e.y+e.h>=start&&e.y<=end)drawElement(ctx,e,images)","for(const e of elements){const tail=e.type==='bubble'&&e.kind!=='narration'?(e.tailY??e.h+35):e.h;if(e.y+Math.max(e.h,tail)>=start&&e.y+Math.min(0,tail)<=end)drawElement(ctx,e,images)}"]
],'Math.max(e.h,tail)');

patch(runtime,[
  ['for(let e of a)e.y+e.h>=s&&e.y<=c&&Ot(u,e,t);','for(let e of a){let tail=e.type===`bubble`&&e.kind!==`narration`?(e.tailY??e.h+35):e.h;e.y+Math.max(e.h,tail)>=s&&e.y+Math.min(0,tail)<=c&&Ot(u,e,t)}']
],'Math.max(e.h,tail)');

patch(source,[
  ['tailX:210,tailY:165','tailX:210,tailY:200'],
  ['<div className="web-tail" style={tailStyle(e)}/>','<div className="web-tail" style={{...tailStyle(e),background:e.stroke||\'#263b47\'}}/><div className="web-tail-fill" style={{...tailStyle(e),background:e.fill||\'#fff\',transform:\'scale(.94)\',transformOrigin:\'50% 70%\'}}/>']
],'web-tail-fill');

patch(runtime,[
  ['tailX:210,tailY:165','tailX:210,tailY:200'],
  ['(0,R.jsx)(`div`,{className:`web-tail`,style:tailStyle(e)})','(0,R.jsx)(`div`,{className:`web-tail`,style:{...tailStyle(e),background:e.stroke||`#263b47`}}),(0,R.jsx)(`div`,{className:`web-tail-fill`,style:{...tailStyle(e),background:e.fill||`#fff`,transform:`scale(.94)`,transformOrigin:`50% 70%`}})']
],'web-tail-fill');

patch(source,[
  ['const before=current.current,after=structuredClone(before);','const before=current.current,after={...before,canvas:{...before.canvas},elements:before.elements.map(element=>({...element})),assets:[...before.assets],scenes:[...before.scenes]};']
],'elements:before.elements.map');

patch(runtime,[
  ['let w=e=>{let n=g.current,r=structuredClone(n);e(r)','let w=e=>{let n=g.current,r={...n,canvas:{...n.canvas},elements:n.elements.map(e=>({...e})),assets:[...n.assets],scenes:[...n.scenes]};e(r)']
],'elements:n.elements.map');

patch(source,[
  ['const edit=(id:string,change:(e:EditorElement)=>void)=>commit(p=>{const e=p.elements.find(item=>item.id===id);if(e)change(e)})','const edit=(id:string,change:(e:EditorElement)=>void)=>{if(current.current.elements.find(e=>e.id===id)?.locked)return;commit(p=>{const e=p.elements.find(item=>item.id===id);if(e)change(e)})}'],
  ['onClick={()=>edit(e.id,item=>{item.locked=!item.locked})}','onClick={()=>commit(p=>{const item=p.elements.find(item=>item.id===e.id);if(item)item.locked=!item.locked})}'],
  ["{selectedElement.type==='bubble'&&<div className=\"web-tail-controls\"","{selectedElement.type==='bubble'&&selectedElement.kind!=='narration'&&<div className=\"web-tail-controls\""],
  ['onClick={()=>{commit(p=>{p.elements=p.elements.filter(e=>e.id!==selectedElement.id)})','onClick={()=>{if(selectedElement.locked)return;commit(p=>{p.elements=p.elements.filter(e=>e.id!==selectedElement.id)})']
],'current.current.elements.find(e=>e.id===id)?.locked');

patch(runtime,[
  ['j=(e,t)=>w(n=>{let r=n.elements.find(t=>t.id===e);r&&t(r)})','j=(e,t)=>{if(g.current.elements.find(t=>t.id===e)?.locked)return;w(n=>{let r=n.elements.find(t=>t.id===e);r&&t(r)})}'],
  ['onClick:()=>j(e.id,e=>{e.locked=!e.locked})','onClick:()=>w(t=>{let n=t.elements.find(t=>t.id===e.id);n&&(n.locked=!n.locked)})'],
  ['k.type===`bubble`&&(0,R.jsxs)(`div`,{className:`web-tail-controls`','k.type===`bubble`&&k.kind!==`narration`&&(0,R.jsxs)(`div`,{className:`web-tail-controls`'],
  ['onClick:()=>{w(e=>{e.elements=e.elements.filter(e=>e.id!==k.id)})','onClick:()=>{if(k.locked)return;w(e=>{e.elements=e.elements.filter(e=>e.id!==k.id)})']
],'g.current.elements.find(t=>t.id===e)?.locked');

patch(source,[
  ["?<>e.kind!=='narration'&&<>","?<>{e.kind!=='narration'&&<>"],
  ['</><div className="web-bubble-content"','</>}<div className="web-bubble-content"']
],"?<>{e.kind!=='narration'");

patch(runtime,[
  ['[S,C]=(0,_.useState)(null);g.current=e','[S,C]=(0,_.useState)(null),tailDragRef=(0,_.useRef)(null),[tailDragState,setTailDragState]=(0,_.useState)(null),fitMode=(0,_.useRef)(!0);g.current=e'],
  ['de=e=>({left:(S?.id===e.id?',`fitWidth=()=>{let t=document.querySelector('.web-canvas-scroll');t&&a(Math.max(.2,Math.min(1.25,(t.clientWidth-(innerWidth<=760?30:80))/g.current.canvas.width)))},tailResizeEffect=(0,_.useEffect)(()=>{let e=()=>{fitMode.current&&fitWidth()};return addEventListener('resize',e),()=>removeEventListener('resize',e)},[]),tailPoint=e=>tailDragState?.id===e.id?tailDragState:{x:e.tailX??e.w*.65,y:e.tailY??e.h+35},tailStyle=e=>{let{x:t,y:n}=tailPoint(e),r=Math.min(0,t,e.w*.42),a=Math.min(0,n,e.h*.9),o=Math.max(e.w,t,e.w*.66)-r,s=Math.max(e.h,n,e.h*.9)-a;return{left:r*i,top:a*i,width:o*i,height:s*i,bottom:'auto',transform:'none',border:0,background:e.fill||'#fff',pointerEvents:'none',clipPath:\`polygon(\${(e.w*.42-r)/o*100}% \${(e.h*.9-a)/s*100}%,\${(t-r)/o*100}% \${(n-a)/s*100}%,\${(e.w*.66-r)/o*100}% \${(e.h*.9-a)/s*100}%)\`}},tailDown=(t,n)=>{if(t.stopPropagation(),t.preventDefault(),t.button!==0||n.locked)return;let{x:r,y:a}=tailPoint(n);tailDragRef.current={id:n.id,x:t.clientX,y:t.clientY,tailX:r,tailY:a},t.currentTarget.setPointerCapture(t.pointerId)},tailMove=e=>{e.stopPropagation();let t=tailDragRef.current;t&&setTailDragState({id:t.id,x:Math.round(t.tailX+(e.clientX-t.x)/i),y:Math.round(t.tailY+(e.clientY-t.y)/i)})},tailUp=e=>{e.stopPropagation();let t=tailDragRef.current;if(!t)return;let n=Math.round(t.tailX+(e.clientX-t.x)/i),r=Math.round(t.tailY+(e.clientY-t.y)/i);tailDragRef.current=null,setTailDragState(null),(n!==t.tailX||r!==t.tailY)&&j(t.id,e=>{e.type===\`bubble\`&&(e.tailX=n,e.tailY=r)})},de=e=>({left:(S?.id===e.id?`],
  ['(0,R.jsxs)(`label`,{children:[`확대 `,(0,R.jsx)(`input`,{type:`range`,min:`.35`,max:`1.25`,step:`.05`,value:i,onChange:e=>a(Number(e.target.value))}),Math.round(i*100),`%`]})', '(0,R.jsx)(`button`,{type:`button`,className:`web-fit`,onClick:()=>{fitMode.current=!0,fitWidth()},children:`너비 맞춤`}),(0,R.jsxs)(`label`,{children:[`확대 `,(0,R.jsx)(`input`,{type:`range`,min:`.2`,max:`1.25`,step:`.01`,value:i,onChange:e=>{fitMode.current=!1,a(Number(e.target.value))}}),Math.round(i*100),`%`]})'],
  ['(0,R.jsx)(`div`,{className:`web-tail`,style:{borderTopColor:e.fill||`#fff`}})', 'e.kind!==`narration`&&(0,R.jsxs)(R.Fragment,{children:[(0,R.jsx)(`div`,{className:`web-tail`,style:tailStyle(e)}),n===e.id&&(0,R.jsx)(`button`,{type:`button`,className:`web-tail-handle`,"aria-label":`말풍선 꼬리 이동`,title:`드래그해서 꼬리 이동`,style:{left:tailPoint(e).x*i-20,top:tailPoint(e).y*i-20},onPointerDown:t=>tailDown(t,e),onPointerMove:tailMove,onPointerUp:tailUp,onPointerCancel:()=>{tailDragRef.current=null,setTailDragState(null)}})]})'],
  ['k.type===`bubble`&&(0,R.jsxs)(`label`,{children:[`말풍선 유형`','k.type===`bubble`&&(0,R.jsxs)(`div`,{className:`web-tail-controls`,children:[(0,R.jsx)(`h3`,{children:`말풍선 꼬리`}),(0,R.jsx)(`p`,{children:`캔버스의 금빛 점을 끌거나 좌표를 입력하세요.`}),(0,R.jsxs)(`div`,{className:`web-metrics`,children:[(0,R.jsxs)(`label`,{children:[`꼬리 좌우`,(0,R.jsx)(`input`,{type:`number`,"aria-label":`꼬리 좌우`,value:Math.round(k.tailX??k.w*.65),onChange:e=>j(k.id,t=>{t.type===`bubble`&&(t.tailX=Number(e.target.value)||0)})})]}),(0,R.jsxs)(`label`,{children:[`꼬리 상하`,(0,R.jsx)(`input`,{type:`number`,"aria-label":`꼬리 상하`,value:Math.round(k.tailY??k.h+35),onChange:e=>j(k.id,t=>{t.type===`bubble`&&(t.tailY=Number(e.target.value)||0)})})]})]})]}),k.type===`bubble`&&(0,R.jsxs)(`label`,{children:[`말풍선 유형`']
],'web-tail-handle');
