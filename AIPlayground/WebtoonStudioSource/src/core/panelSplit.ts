import type {PanelElement} from './types.js'
export function splitPanel(panel:PanelElement,axis:'x'|'y'|'diagonal',ratio:number,gap:number,ids:[string,string]):[PanelElement,PanelElement] {
  if(panel.locked)throw new Error('잠긴 컷은 분할할 수 없습니다.')
  if(panel.rotation||panel.shape&&panel.shape!=='rect')throw new Error('분할은 회전 없는 직사각형 컷에서 사용하세요.')
  if(!Number.isFinite(ratio)||ratio<.1||ratio>.9||!Number.isFinite(gap)||gap<0)throw new Error('분할 비율이나 간격을 확인하세요.')
  if(axis==='diagonal'){
    const offset=gap*Math.sqrt(1/panel.w**2+1/panel.h**2)/2
    const clip=(boundary:number,upper:boolean)=>{
      const square=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],points:Array<{x:number;y:number}>=[]
      for(let i=0;i<4;i++){const a=square[i],b=square[(i+1)%4],da=a.x+a.y-boundary,db=b.x+b.y-boundary,insideA=upper?da>=0:da<=0,insideB=upper?db>=0:db<=0;if(insideA)points.push(a);if(insideA!==insideB){const t=da/(da-db);points.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t})}}
      if(points.length<3)throw new Error('간격이 너무 큽니다. 분할 위치나 간격을 줄이세요.')
      return points
    }
    return [{...panel,id:ids[0],name:`${panel.name||'컷'} · 1`,shape:'polygon',clipPoints:clip(ratio*2-offset,false),groupId:undefined},{...panel,id:ids[1],name:`${panel.name||'컷'} · 2`,shape:'polygon',clipPoints:clip(ratio*2+offset,true),groupId:undefined,z:panel.z+.001}]
  }
  const size=axis==='x'?panel.w:panel.h,first=size*ratio-gap/2,second=size*(1-ratio)-gap/2
  if(first<24||second<24)throw new Error('각 컷의 크기가 24px 이상이어야 합니다.')
  const a={...panel,id:ids[0],name:`${panel.name||'컷'} · 1`,groupId:undefined},b={...panel,id:ids[1],name:`${panel.name||'컷'} · 2`,groupId:undefined,z:panel.z+.001}
  if(axis==='x'){a.w=first;b.x=panel.x+first+gap;b.w=second}else{a.h=first;b.y=panel.y+first+gap;b.h=second}
  return [a,b]
}
