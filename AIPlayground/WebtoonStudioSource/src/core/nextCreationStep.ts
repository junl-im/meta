import type {ProjectV4} from './types.js'
export interface CreationStep {label:string;reason:string;action:'cut'|'element'|'text'|'dialogue'|'preview'|'layers';targetId?:string}
export function nextCreationStep(project:ProjectV4):CreationStep{
 const visible=project.elements.filter(e=>e.visible!==false),panels=visible.filter(e=>e.type==='panel')
 if(!visible.length)return project.elements.length?{label:'숨긴 요소 확인',reason:'모든 요소가 숨김 상태입니다. 레이어에서 표시 여부를 확인하세요.',action:'layers'}:{label:'첫 컷 만들기',reason:'아직 원고에 요소가 없습니다. 컷부터 시작할 수 있습니다.',action:'cut'}
 const empty=panels.find(e=>!e.image&&!e.locked)
 if(empty)return {label:'빈 컷 채우기',reason:'이미지가 없는 편집 가능한 컷이 있습니다.',action:'element',targetId:empty.id}
 if(panels.some(e=>!e.image))return {label:'빈 컷 잠금 확인',reason:'이미지가 없는 컷이 잠겨 있습니다. 상태를 확인한 뒤 편집하세요.',action:'layers'}
 const texts=visible.filter(e=>e.type==='bubble'||e.type==='text'),placeholder=new Set(['대사','대사를 입력하세요','대사를 입력하세요.','텍스트를 입력하세요','텍스트를 입력하세요.','입력하세요'])
 const emptyText=texts.find(e=>!e.locked&&(!e.text.trim()||placeholder.has(e.text.trim())))
 if(emptyText)return {label:'빈 대사 작성',reason:'내용이 비어 있거나 안내 문구가 남은 글 요소가 있습니다.',action:'text',targetId:emptyText.id}
 if(panels.length&&!texts.length)return {label:'대사 작업 열기',reason:'컷은 준비됐습니다. 대사 작업창에서 글을 추가할 수 있습니다.',action:'dialogue'}
 return {label:'미리보기 확인',reason:'독자 화면에서 흐름을 확인하세요. 이 추천은 작품 품질 판정이 아닙니다.',action:'preview'}
}
