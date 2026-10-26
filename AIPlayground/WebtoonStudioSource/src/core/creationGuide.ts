import type {ProjectV4} from './types.js'
export function creationProgress(project:ProjectV4){
  const panels=project.elements.filter(e=>e.type==='panel')
  const placeholders=new Set(['대사','대사를 입력하세요','대사를 입력하세요.','텍스트를 입력하세요','텍스트를 입력하세요.'])
  const hasDialogue=project.elements.some(e=>(e.type==='bubble'||e.type==='text')&&!!e.text.trim()&&!placeholders.has(e.text.trim()))
  return {cut:panels.length>0,image:panels.some(e=>e.type==='panel'&&!!e.image),dialogue:hasDialogue}
}
