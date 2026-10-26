import {sanitizeStoryAnalysis} from './storyCharacters.js'
import type {Asset,ImageOrigin,PanelElement,ProjectV4} from './types.js'
import {placeAssetsAsPanels} from './assetPlacement.js'
import type {Storyboard,StoryCut} from './storyboard.js'
const id=(value:unknown)=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value)?value:undefined
export function sanitizeStoryboard(value:unknown):Storyboard|undefined{
 if(!value||typeof value!=='object')return
 const v=value as Record<string,unknown>
 if(typeof v.source!=='string'||v.source.length>=20000||!Array.isArray(v.cuts))return
 const cuts:StoryCut[]=[],seen=new Set<string>()
 for(const [index,item] of v.cuts.slice(0,96).entries()){
  if(!item||typeof item!=='object')continue
  const c=item as Record<string,unknown>
  if(!['scene','action','dialogue','prompt'].every(k=>typeof c[k]==='string'&&(c[k] as string).length<=1500)||!Number.isInteger(c.sourceStart)||!Number.isInteger(c.sourceEnd)||(c.sourceStart as number)<0||(c.sourceEnd as number)>v.source.length||(c.sourceEnd as number)<=(c.sourceStart as number))continue
  let key=id(c.id)||'story_cut_'+index
  while(seen.has(key))key='story_cut_'+index+'_'+seen.size
  seen.add(key)
  cuts.push({id:key,scene:c.scene as string,action:c.action as string,dialogue:c.dialogue as string,prompt:c.prompt as string,sourceStart:c.sourceStart as number,sourceEnd:c.sourceEnd as number,reviewed:c.reviewed===true,...(['generate','reuse','skip'].includes(c.imagePlan as string)?{imagePlan:c.imagePlan as StoryCut['imagePlan']}: {})})
 }
 const analysis=sanitizeStoryAnalysis(v.analysis)
 return {...(analysis?{analysis}:{}),source:v.source,context:typeof v.context==='string'?v.context.slice(0,1500):'',cuts}
}
export function sanitizeImageOrigin(value:unknown):ImageOrigin|undefined{
 if(!value||typeof value!=='object')return
 const v=value as Record<string,unknown>
 if(typeof v.prompt!=='string'||v.prompt.length>10000||typeof v.at!=='string'||!Number.isFinite(Date.parse(v.at)))return
 return {...(v.newCut===true?{newCut:true}:{}),prompt:v.prompt,...(['comfyui','webui','codex'].includes(String(v.engine))?{engine:v.engine as ImageOrigin['engine']}:{}),...(typeof v.originalPrompt==='string'&&v.originalPrompt.length<=10000?{originalPrompt:v.originalPrompt}:{}),...(typeof v.preparedPrompt==='string'&&v.preparedPrompt.length<=10000?{preparedPrompt:v.preparedPrompt}:{}),...(typeof v.style==='string'?{style:v.style.slice(0,1000)}:{}),...(typeof v.denoise==='number'&&Number.isFinite(v.denoise)&&v.denoise>=0&&v.denoise<=1?{denoise:v.denoise}:{}),at:v.at.slice(0,40),checkpoint:typeof v.checkpoint==='string'?v.checkpoint.slice(0,200):undefined,targetPanelId:id(v.targetPanelId),storyCutId:id(v.storyCutId)}
}
export function sanitizeStoryOrigin(value:unknown):PanelElement['storyOrigin']{
 if(!value||typeof value!=='object')return
 const v=value as Record<string,unknown>
 if(!['scene','action','prompt','sourceText'].every(key=>typeof v[key]==='string')||(v.sourceText as string).length>19999)return
 const analysis=sanitizeStoryAnalysis(v.analysis)
 return {...(analysis?{analysis}:{}),cutId:id(v.cutId),scene:(v.scene as string).slice(0,1500),action:(v.action as string).slice(0,1500),prompt:(v.prompt as string).slice(0,1500),sourceText:v.sourceText as string}
}
export function applyGeneratedAsset(project:ProjectV4,asset:Asset,selectedPanelId?:string,newCut=false,uid?:()=>string){
 newCut=newCut||asset.generation?.newCut===true
 const targetId=newCut?undefined:asset.generation?.targetPanelId||selectedPanelId
 if(targetId){const target=project.elements.find(e=>e.id===targetId&&e.type==='panel');if(!target)return {ids:[],reason:'missing' as const};if(target.locked||target.visible===false)return {ids:[],reason:'protected' as const}}
 const ids=placeAssetsAsPanels(project,[asset],targetId,uid)
 if(ids.length&&!project.assets.some(a=>a.id===asset.id))project.assets.push(structuredClone(asset))
 return {ids,reason:undefined}
}
