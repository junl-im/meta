import {sanitizeCharacters} from './characters.js'
import type {CharacterProfile} from './types.js'
export interface StoryAnalysis {engine:string;model:string;at:string;context:string;characters:CharacterProfile[]}
export function storyCharacterText(characters:CharacterProfile[]){return characters.map(c=>JSON.stringify({name:c.name,appearance:c.appearance,outfit:c.outfit,notes:c.notes})).join('\n')}
export function captureStoryAnalysis(engine:string,model:string,context:string,characters:CharacterProfile[]):StoryAnalysis{
 const profiles=sanitizeCharacters(characters).map(({referenceAssetId,...profile})=>profile)
 if(storyCharacterText(profiles).length>3500)throw new Error('선택한 캐릭터 설정을 합해 3,500자 이하로 줄이거나 인물을 적게 선택하세요.')
 return {engine,model:model.slice(0,200),at:new Date().toISOString(),context:context.slice(0,1500),characters:profiles}
}
export function sanitizeStoryAnalysis(value:unknown):StoryAnalysis|undefined{
 if(!value||typeof value!=='object')return
 const v=value as Record<string,unknown>
 if(!['ollama','codex','claude','gemini'].includes(String(v.engine))||typeof v.model!=='string'||typeof v.at!=='string'||!Number.isFinite(Date.parse(v.at))||typeof v.context!=='string')return
 try{return {...captureStoryAnalysis(String(v.engine),v.model,v.context,sanitizeCharacters(v.characters)),at:v.at.slice(0,40)}}catch{return}
}

export function storyImagePrompt(scene:string,analysis:StoryAnalysis,ids:string[]){
 const base=scene.replace(/【콘티 캐릭터 설정】[\s\S]*?【콘티 설정 끝】/g,'').replace(/【캐릭터 고정 설정】[\s\S]*?【캐릭터 설정 끝】/g,'').trim()
 const selected=analysis.characters.filter(c=>ids.includes(c.id))
 if(!selected.length)throw new Error('이 컷에 등장하는 인물을 선택하세요.')
 const result=base+'\n\n【콘티 캐릭터 설정】\n'+storyCharacterText(selected)+'\n위 인물의 외형·의상·특징을 유지해 장면을 그려주세요.\n【콘티 설정 끝】'
 if(result.length>9500)throw new Error('장면과 인물 설명을 합해 9,500자 이하로 줄여주세요.')
 return result
}
