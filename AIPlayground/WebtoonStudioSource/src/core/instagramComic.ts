import type {EditorElement,PanelElement,ProjectV4,SlicePreset} from './types.js'
import {artworkBounds} from './artworkBounds.js'
export type InstagramHeight=1080|1350
export type InstagramArrangement='single'|'stacked'|'side'|'grid'
export function parseInstagramArrangement(value:unknown):InstagramArrangement{return ['single','stacked','side','grid'].includes(value as string)?value as InstagramArrangement:'single'}
export function parseInstagramOrder(value:unknown):number[]{if(value===undefined)return [0,1,2,3];if(!Array.isArray(value)||value.length!==4||value.some(n=>!Number.isInteger(n)||n<0||n>3)||new Set(value).size!==4)throw Error('인스타툰 컷 순서가 올바르지 않습니다.');return [...value]}
export function instagramPages(arrangement:InstagramArrangement='single',order:number[]=[0,1,2,3]):number[][]{const count=arrangement==='single'?1:arrangement==='grid'?4:2;const safe=parseInstagramOrder(order);return Array.from({length:4/count},(_,i)=>safe.slice(i*count,(i+1)*count))}
export interface InstagramPage {id:string;layout:InstagramArrangement;cuts:number[]}
export function instagramCapacity(layout:InstagramArrangement){return layout==='single'?1:layout==='grid'?4:2}
export function parseInstagramPagePlan(value:unknown):InstagramPage[]|undefined{
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length<1||value.length>20)throw Error('인스타툰 장은 1~20장으로 구성하세요.')
 const ids=new Set<string>()
 return value.map(p=>{if(!p||typeof p.id!=='string'||!p.id||p.id.length>100||ids.has(p.id)||!['single','stacked','side','grid'].includes(p.layout)||!Array.isArray(p.cuts)||p.cuts.length<1||p.cuts.length>instagramCapacity(p.layout)||p.cuts.some((i:unknown)=>!Number.isInteger(i)||Number(i)<0||Number(i)>3)||new Set(p.cuts).size!==p.cuts.length)throw Error('인스타툰 장 배치 정보가 올바르지 않습니다.');ids.add(p.id);return {id:p.id,layout:p.layout as InstagramArrangement,cuts:[...p.cuts]}})
}
export function resolveInstagramPagePlan(arrangement:InstagramArrangement='single',order:number[]=[0,1,2,3],value?:InstagramPage[]):InstagramPage[]{return parseInstagramPagePlan(value)??instagramPages(arrangement,order).map((cuts,i)=>({id:'preset-'+i,layout:arrangement,cuts}))}
export function instagramSourceId(id:string){return id.replace(/^insta-copy-\d+-\d+-/,'')}
export function instagramPreset(height:InstagramHeight):SlicePreset{return {id:'instatoon-1080',label:'인스타툰 · 장별 JPG',width:1080,maxHeight:height,format:'jpg',maxBytes:10_000_000,totalMaxBytes:50_000_000}}
/** Fit the complete cut and its lettering inside each page, without destructive cropping. */
export function instagramComicProject(project:ProjectV4,ids:string[],height:InstagramHeight=1350,arrangement:InstagramArrangement='single',order:number[]=[0,1,2,3],pagePlan?:InstagramPage[]):ProjectV4{
 if(![1080,1350].includes(height)||ids.length!==4||new Set(ids).size!==4)throw Error('인스타툰은 연결된 네 컷과 유효한 페이지 규격이 필요합니다.')
 const cuts=ids.map(id=>project.elements.find((e):e is PanelElement=>e.id===id&&e.type==='panel'))
 if(cuts.some(e=>!e||e.visible===false||!e.sceneId||!Number.isFinite(e.w)||!Number.isFinite(e.h)||e.w<=0||e.h<=0)||new Set(cuts.map(e=>e?.sceneId)).size!==4)throw Error('삭제·숨김 컷 또는 장면 연결을 확인하세요.')
 const pages=resolveInstagramPagePlan(parseInstagramArrangement(arrangement),order,pagePlan)
 const out=structuredClone(project);out.canvas={width:1080,height:height*pages.length,background:project.canvas.background==='transparent'?'#ffffff':project.canvas.background};out.elements=[];out.scenes=[]
 pages.forEach((page,index)=>{
  const sceneId=`insta-page-${index}`
  out.scenes.push({id:sceneId,name:`${index+1}장`,startY:index*height,collapsed:false})
  out.elements.push({id:`insta-frame-${index}`,type:'panel',x:0,y:index*height,w:1080,h:height,z:-100,sceneId,fill:out.canvas.background,strokeOpacity:0,strokeWidth:0})
  page.cuts.forEach((cutIndex,slot)=>{const cut=cuts[cutIndex]
  const cols=page.layout==='side'||page.layout==='grid'?2:1,rows=page.layout==='stacked'||page.layout==='grid'?2:1,gap=24,cellW=(960-gap*(cols-1))/cols,cellH=(height-120-gap*(rows-1))/rows
  const items=project.elements.filter(e=>e.visible!==false&&e.type!=='scene'&&(e.id===cut!.id||e.sceneId===cut!.sceneId))
  const bounds=items.map(artworkBounds),left=Math.min(...bounds.map(b=>b.left)),top=Math.min(...bounds.map(b=>b.top)),right=Math.max(...bounds.map(b=>b.right)),bottom=Math.max(...bounds.map(b=>b.bottom))
  if(![left,top,right,bottom].every(Number.isFinite))throw Error('컷 위치 정보가 올바르지 않습니다.')
  const scale=Math.min(cellW/Math.max(1,right-left),cellH/Math.max(1,bottom-top)),x=60+(slot%cols)*(cellW+gap)+(cellW-(right-left)*scale)/2,y=index*height+60+Math.floor(slot/cols)*(cellH+gap)+(cellH-(bottom-top)*scale)/2
  for(const source of items){const e=structuredClone(source) as EditorElement & Record<string,any>;e.x=x+(e.x-left)*scale;e.y=y+(e.y-top)*scale;e.w*=scale;e.h*=scale;e.sceneId=sceneId;if(pagePlan)e.id=`insta-copy-${index}-${slot}-${source.id}`
   for(const key of ['fontSize','strokeWidth','tailX','tailY','tailCurve','tailWidth'])if(typeof e[key]==='number')e[key]*=scale
   if((e.type==='text'||e.type==='bubble')&&source.type===e.type&&!(source as any).fontSize)e.fontSize=(e.type==='text'?36:24)*scale
   if(e.type==='bubble'){if(source.type==='bubble'&&source.tailX===undefined)e.tailX=source.w*.65*scale;if(source.type==='bubble'&&source.tailY===undefined)e.tailY=(source.h+35)*scale}
   if(e.type==='drawing')e.points=e.points.map(p=>({...p,x:p.x*scale,y:p.y*scale}))
   if(e.erasures)e.erasures=e.erasures.map(r=>({...r,width:r.width*scale,points:r.points.map(p=>({...p,x:p.x*scale,y:p.y*scale}))}))
   if(e.type==='panel'&&e.imageTransform){e.imageTransform.offsetX*=scale;e.imageTransform.offsetY*=scale}
   if((e.type==='text'||e.type==='bubble')&&e.textEffect)for(const key of ['outlineWidth','shadowSize','letterSpacing'])if(typeof (e.textEffect as any)[key]==='number')(e.textEffect as any)[key]*=scale
   out.elements.push(e)
  }
  })
 })
 return out
}

export function instagramSelection(pages:InstagramPage[],pageId?:string,cut=0){const page=pages.find(p=>p.id===pageId)??pages[0];if(!page)throw Error('인스타툰 장이 없습니다.');return {pageId:page.id,cut:page.cuts.includes(cut)?cut:page.cuts[0]}}
