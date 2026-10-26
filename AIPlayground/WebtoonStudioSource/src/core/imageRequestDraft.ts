import type {ImageOrigin} from './types.js'
export function imageRequestDraft(record:{projectId:string;input:{prompt:string};context?:Partial<ImageOrigin>},projectId:string){
 if(record.projectId!==projectId)throw new Error('다른 작품의 요청은 가져올 수 없습니다.')
 const context=record.context,prompt=context?.preparedPrompt||record.input.prompt
 if(prompt.length>9500)throw new Error('기록의 설명이 너무 깁니다. 길이를 줄인 새 요청을 작성하세요.')
 return {prompt,style:context?.preparedPrompt?context.style||'':'',originalPrompt:context?.originalPrompt||'',origin:{targetPanelId:context?.targetPanelId,storyCutId:context?.storyCutId},choice:context?.newCut||!context?.targetPanelId&&!context?.storyCutId?'new':''}
}
