import type { ProjectV4 } from './types.js'

/** Keep artwork when removing a scene marker, and never leave dangling memberships. */
export function removeScene(project: ProjectV4, id: string): boolean {
  if (project.scenes.length <= 1) return false
  const ordered = [...project.scenes].sort((a,b)=>a.startY-b.startY)
  const index = ordered.findIndex(scene=>scene.id===id)
  if (index < 0) return false
  const fallback = index > 0 ? ordered[index-1] : ordered[1]
  project.scenes = project.scenes.filter(scene=>scene.id!==id)
  for (const element of project.elements) if (element.sceneId===id) element.sceneId=fallback.id
  return true
}

/** Move complete vertical scene blocks; locked artwork prevents structural changes. */
export function moveScene(project:ProjectV4,id:string,direction:-1|1):boolean{
  const ordered=[...project.scenes].sort((a,b)=>a.startY-b.startY),index=ordered.findIndex(scene=>scene.id===id),other=index+direction
  if(index<0||other<0||other>=ordered.length)return false
  const left=Math.min(index,other),a=ordered[left],b=ordered[left+1],end=ordered[left+2]?.startY??project.canvas.height
  if(project.elements.some(e=>e.locked&&(e.sceneId===a.id||e.sceneId===b.id)))return false
  const lengthA=b.startY-a.startY,lengthB=end-b.startY,start=a.startY
  for(const element of project.elements){if(element.sceneId===a.id)element.y+=lengthB;if(element.sceneId===b.id)element.y-=lengthA}
  b.startY=start;a.startY=start+lengthB;project.scenes.sort((x,y)=>x.startY-y.startY)
  return true
}

export function duplicateScene(project:ProjectV4,id:string,makeId:(prefix:string)=>string):string|null{
  const ordered=[...project.scenes].sort((a,b)=>a.startY-b.startY),index=ordered.findIndex(scene=>scene.id===id)
  if(index<0)return null
  const source=ordered[index],end=ordered[index+1]?.startY??project.canvas.height,length=Math.max(320,end-source.startY)
  if(project.elements.some(e=>e.locked&&e.y>=end))return null
  for(const scene of project.scenes)if(scene.startY>=end)scene.startY+=length
  for(const element of project.elements)if(element.y>=end)element.y+=length
  const newId=makeId('scene'),groups=new Map<string,string>()
  const copies=project.elements.filter(e=>e.sceneId===id).map(element=>{
    const copy=structuredClone(element);copy.id=makeId(element.type);copy.sceneId=newId;copy.y+=length;copy.name=`${copy.name||copy.type} 복사본`
    if(copy.groupId){if(!groups.has(copy.groupId))groups.set(copy.groupId,makeId('group'));copy.groupId=groups.get(copy.groupId)}
    return copy
  })
  project.elements.push(...copies);project.scenes.push({...source,id:newId,name:`${source.name} 복사본`,startY:end,collapsed:false});project.scenes.sort((a,b)=>a.startY-b.startY);project.canvas.height+=length
  return newId
}
