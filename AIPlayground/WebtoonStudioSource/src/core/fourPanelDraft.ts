import {parseInstagramPagePlan,parseInstagramArrangement,parseInstagramOrder} from './instagramComic.js'
import {parseFourDirections} from './fourPanelDirection.js'
const genres=['자동 / 자유형','일상','코미디','로맨스','판타지','액션','미스터리','공포','감동','교육 / 정보']
export function parseFourCast(value:unknown,ids:string[]){
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length!==4||value.some(v=>!Array.isArray(v)||v.length>6||v.some(id=>typeof id!=='string'||!ids.includes(id))||new Set(v).size!==v.length))throw Error('컷별 등장인물 설정이 올바르지 않습니다.')
 return value.map(v=>[...v] as string[])
}
export function parseFourPanelDraft(value:unknown){
 if(!value||typeof value!=='object')throw Error('4컷 초안 파일이 아닙니다.')
 const d=value as Record<string,unknown>
 if(d.version!==1||typeof d.title!=='string'||d.title.length>100||typeof d.story!=='string'||d.story.length>20000||typeof d.genre!=='string'||!genres.includes(d.genre)||(d.layout!=='grid'&&d.layout!=='vertical'&&d.layout!=='instagram')||!Array.isArray(d.panels)||d.panels.length!==4||!d.panels.every(p=>typeof p==='string'&&p.length<=4000))throw Error('초안 형식 또는 입력 길이가 올바르지 않습니다.')
 if(d.previousPanels!==undefined&&(!Array.isArray(d.previousPanels)||d.previousPanels.length!==4||!d.previousPanels.every(p=>typeof p==='string'&&p.length<=4000)))throw Error('이전 콘티 정보가 올바르지 않습니다.')
 const characters:Array<{id:string;name:string;traits:string;thumbnail?:string;hasImage?:boolean}>=[]
 if(d.characters!==undefined){
  if(!Array.isArray(d.characters)||d.characters.length>6)throw Error('등장인물은 최대 6명입니다.')
  const seen=new Set<string>()
  for(const c of d.characters){
   if(!c||typeof c.id!=='string'||c.id.length>100||typeof c.name!=='string'||c.name.length>60||typeof c.traits!=='string'||c.traits.length>240||(c.thumbnail!==undefined&&(typeof c.thumbnail!=='string'||!c.thumbnail.startsWith('data:image/jpeg;')||c.thumbnail.length>=100000)))throw Error('등장인물 정보가 올바르지 않습니다.')
   if(!c.id.trim()||seen.has(c.id))throw Error('등장인물 ID가 비어 있거나 중복됩니다.')
   seen.add(c.id)
   characters.push({id:crypto.randomUUID(),name:c.name,traits:c.traits,...(c.thumbnail?{thumbnail:c.thumbnail}:{}) ,hasImage:false})
  }
 }
 const old=(d.characters||[]) as Array<{id:string}>,cast=parseFourCast(d.cast,old.map(c=>c.id))?.map(row=>row.map(id=>characters[old.findIndex(c=>c.id===id)].id))
 return {instagramPagePlan:parseInstagramPagePlan(d.instagramPagePlan),instagramArrangement:parseInstagramArrangement(d.instagramArrangement),instagramOrder:parseInstagramOrder(d.instagramOrder),version:1 as const,title:d.title,story:d.story,genre:d.genre,instagramHeight:d.instagramHeight===1080?1080 as const:1350 as const,layout:d.layout as 'grid'|'vertical'|'instagram',panels:[...d.panels] as string[],previousPanels:d.previousPanels as string[]|undefined,characters,cast,directions:parseFourDirections(d.directions)}
}
