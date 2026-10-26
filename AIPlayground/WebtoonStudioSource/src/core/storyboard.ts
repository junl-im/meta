import type {ProjectV4} from './types.js'
export interface StoryCut {id?:string;scene:string;action:string;dialogue:string;prompt:string;sourceStart:number;sourceEnd:number;reviewed?:boolean;imagePlan?:'generate'|'reuse'|'skip'}
export interface Storyboard {source:string;cuts:StoryCut[];context?:string;analysis?:import('./storyCharacters.js').StoryAnalysis}
export function chunkNovel(source:string){
  if(!source.trim()||source.length>=20000)throw new Error('원고는 1~19,999자로 입력하세요.')
  const chunks:Array<{text:string;start:number;end:number}>=[]
  for(let start=0;start<source.length;){let end=Math.min(source.length,start+2800);if(end<source.length){const boundary=source.lastIndexOf('\n',end);if(boundary>start+1400)end=boundary+1}chunks.push({text:source.slice(start,end),start,end});start=end}
  return chunks
}
export function parseStoryCuts(text:string,start:number,end:number):StoryCut[]{
  const clean=text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');const value=JSON.parse(clean)
  if(!Array.isArray(value?.cuts)||value.cuts.length<1||value.cuts.length>12)throw new Error('AI 콘티 형식이 올바르지 않습니다. 이 구간을 다시 분석하세요.')
  return value.cuts.map((cut:any)=>{for(const key of ['scene','action','dialogue','prompt'])if(typeof cut?.[key]!=='string'||cut[key].length>1500)throw new Error('AI 콘티 항목이 올바르지 않습니다.');if(!cut.action.trim())throw new Error('빈 컷 설명입니다.');return {id:crypto.randomUUID(),scene:cut.scene.slice(0,120),action:cut.action,dialogue:cut.dialogue,prompt:cut.prompt,sourceStart:start,sourceEnd:end}})
}
export function appendStoryboard(project:ProjectV4,cuts:StoryCut[],uid:()=>string){
  if(!cuts.length||cuts.length>96)throw new Error('적용할 컷은 1~96개로 선택하세요.')
  const start=project.elements.length?Math.max(project.canvas.height,...project.elements.map(e=>e.y+e.h))+160:80
  const bottom=start+cuts.length*720;if(bottom>100000)throw new Error('원고 길이 제한을 넘습니다. 다른 프로젝트에 적용하세요.')
  const width=Math.min(690,project.canvas.width-40),left=(project.canvas.width-width)/2;let z=Math.max(0,...project.elements.map(e=>e.z))
  cuts.forEach((cut,index)=>{const y=start+index*720,sceneId='scene_'+uid();project.scenes.push({id:sceneId,name:cut.scene||`${index+1}번 장면`,startY:y,collapsed:false});project.elements.push({id:'panel_'+uid(),type:'panel',name:`콘티 ${index+1} · ${cut.action.slice(0,60)}`,x:left,y,w:width,h:500,z:++z,sceneId,storyOrigin:{...(project.storyboard?.analysis?{analysis:structuredClone(project.storyboard.analysis)}:{}),cutId:cut.id,scene:cut.scene,action:cut.action,prompt:cut.prompt,sourceText:(project.storyboard?.source||'').slice(cut.sourceStart,cut.sourceEnd)},shape:'rect',fill:'#ffffff',stroke:'#222222',strokeWidth:2});project.elements.push({id:'text_'+uid(),type:'text',name:'콘티 연출 메모',text:cut.action,x:left+16,y:y+20,w:width-32,h:160,z:++z,sceneId,fontSize:22,color:'#555555',align:'left'});if(cut.dialogue.trim())project.elements.push({id:'bubble_'+uid(),type:'bubble',kind:'speech',name:'콘티 대사',text:cut.dialogue,x:left+24,y:y+290,w:Math.min(380,width-48),h:170,z:++z,sceneId,fontSize:26,fill:'#ffffff',stroke:'#111111',strokeWidth:2})});project.canvas.height=Math.max(project.canvas.height,bottom)
}
