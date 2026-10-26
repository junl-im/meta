import type { ProjectV4, SlicePlan, BubbleElement } from './types.js'
import {artworkBounds} from './artworkBounds.js'

export interface CreatorIssue { id: string; elementId?: string; severity: 'warning' | 'error'; message: string }

// These are editorial heuristics, not platform acceptance guarantees.
export function inspectWebtoon(project: ProjectV4, plan: SlicePlan | null = null): CreatorIssue[] {
  const issues: CreatorIssue[] = []
  const scale = project.canvas.width>0?(plan?.preset.width ?? 690) / project.canvas.width:1
  const visible = project.elements.filter(e => e.visible !== false && e.type !== 'scene')
  const add = (id: string, elementId: string, message: string, severity: CreatorIssue['severity'] = 'warning') => issues.push({ id: `${id}:${elementId}`, elementId, message, severity })
  for (const e of visible) {
    if (![e.x,e.y,e.w,e.h].every(Number.isFinite) || e.w <= 0 || e.h <= 0) {
      add('geometry',e.id,'요소 위치 또는 크기가 올바르지 않습니다.','error'); continue
    }
    const bounds=artworkBounds(e)
    if (bounds.left < 0 || bounds.top < 0 || bounds.right > project.canvas.width || bounds.bottom > project.canvas.height) add('bounds',e.id,'회전·말풍선 꼬리를 포함한 영역이 캔버스 밖으로 나가 출력에서 잘릴 수 있습니다.')
    if (e.type === 'bubble' || e.type === 'text') {
      if (!e.text.trim()) add('empty-text',e.id,'대사가 비어 있습니다. 의도한 빈 말풍선인지 확인하세요.')
      if(['대사','대사를 입력하세요','대사를 입력하세요.','텍스트를 입력하세요','텍스트를 입력하세요.'].includes(e.text))add('placeholder-text',e.id,'입력 안내 문구가 원고 내용에 남아 있습니다. 출력 전 실제 대사로 바꾸세요.')
      const importedFamilies=(e.fontFamily||'').match(/wtoon_font_[\w-]+/g)||[]
      if (importedFamilies.some(family=>!project.fonts?.some(font=>font.family===family))) add('missing-font',e.id,'사용 중인 가져온 글꼴이 프로젝트에 없습니다. 글꼴을 다시 가져오거나 다른 글꼴을 선택하세요.','error')
      const size = e.fontSize ?? (e.type === 'bubble' ? 24 : 36)
      if (size * scale < 14) add('small-text',e.id,'출력 기준 글씨가 14px보다 작습니다. 모바일 가독성을 확인하세요.')
      const charsPerLine = Math.max(1,Math.floor(Math.max(1,e.w-24) / size))
      const lines = e.text.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/charsPerLine)),0)
      if (lines * size * 1.4 > e.h - 16) add('text-overflow',e.id,'대사가 영역을 넘칠 가능성이 있습니다. 크기와 줄바꿈을 확인하세요.')
    }
    if (e.type === 'panel' && e.image) {
      if (e.image.startsWith('asset://')) add('missing-image',e.id,'프로젝트 이미지 참조가 복원되지 않았습니다. 원본 이미지를 다시 적용하세요.','error')
      const asset = project.assets.find(a=>a.src===e.image)
      if (asset?.width && asset.height) {
        const fit = e.imageFit === 'contain' ? Math.min(e.w/asset.width,e.h/asset.height) : Math.max(e.w/asset.width,e.h/asset.height)
        if (fit * (e.imageTransform?.zoom ?? 1) * scale > 1.25) add('resolution',e.id,'이미지를 원본보다 크게 확대합니다. 출력이 흐려질 수 있습니다.')
        const zoom=e.imageTransform?.zoom??1,width=asset.width*fit*zoom,height=asset.height*fit*zoom,left=(e.w-width)/2+(e.imageTransform?.offsetX??0),top=(e.h-height)/2+(e.imageTransform?.offsetY??0)
        if(left>1||top>1||left+width<e.w-1||top+height<e.h-1)add('image-gap',e.id,'컷 안에 이미지가 덮지 않는 빈 영역이 있습니다. 의도한 여백인지 확인하세요.')
      }
    }
  }
  const valid=visible.filter(e=>[e.x,e.y,e.w,e.h].every(Number.isFinite)&&e.w>0&&e.h>0)
  const panels=valid.filter(e=>e.type==='panel'&&!e.rotation).sort((a,b)=>a.y-b.y||a.x-b.x)
  for(let i=1;i<panels.length;i++){
    const a=panels[i-1],b=panels[i],gap=b.y-a.y-a.h,overlap=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)
    if(gap>=0&&gap*scale<24&&overlap>Math.min(a.w,b.w)*.25)add('panel-gap',b.id,'앞 컷과의 세로 간격이 출력 기준 24px보다 좁습니다. 장면 호흡을 의도한 배치인지 확인하세요.')
  }
  const bubbles=valid.filter((e):e is BubbleElement=>e.type==='bubble'&&!!e.text.trim())
  if(panels.length<=400&&bubbles.length<=400){
    for(const bubble of bubbles){
      if(bubble.rotation)continue
      const cx=bubble.x+bubble.w/2,cy=bubble.y+bubble.h/2
      const containing=panels.filter(p=>p.z<bubble.z&&p.x<=cx&&p.x+p.w>=cx&&p.y<=cy&&p.y+p.h>=cy&&(!bubble.sceneId||!p.sceneId||bubble.sceneId===p.sceneId)).sort((a,b)=>a.w*a.h-b.w*b.h)[0]
      if(containing&&Math.max(containing.x-bubble.x,containing.y-bubble.y,bubble.x+bubble.w-containing.x-containing.w,bubble.y+bubble.h-containing.y-containing.h)*scale>8)add('bubble-panel-edge',bubble.id,'말풍선 중심이 있는 컷 밖으로 몸통이 8px 이상 나갑니다. 의도한 겹침인지 확인하세요. 꼬리는 이 검사에서 제외합니다.')
    }
  }else issues.push({id:'layout-check-limit',severity:'warning',message:'컷 또는 말풍선이 400개를 넘어 컷·말풍선 겹침 참고 검사를 생략했습니다. 미리보기에서 직접 확인하세요.'})
  const ordered=bubbles.sort((a,b)=>a.y-b.y),counts=ordered.map(b=>b.text.replace(/\s/g,'').length)
  let right=0,total=0,nextWarningY=-Infinity
  for(let left=0;left<ordered.length;left++){
    while(right<ordered.length&&(ordered[right].y-ordered[left].y)*scale<800){total+=counts[right];right++}
    if(total>300&&ordered[left].y>=nextWarningY){add('dialogue-density',ordered[left].id,'출력 높이 800px 범위에 대사가 300자를 넘습니다. 모바일에서 읽는 호흡과 말풍선 분산을 확인하세요.');nextWarningY=ordered[left].y+800/scale}
    total-=counts[left]
  }
  if (plan && plan.sourceWidth === project.canvas.width && plan.sourceHeight === project.canvas.height) {
    for (const segment of plan.segments.slice(0,-1)) {
      for (const e of visible) {const bounds=artworkBounds(e);if(e.type==='bubble'&&bounds.top<segment.endY&&bounds.bottom>segment.endY)add(`slice-${segment.index}`,e.id,`분할선 ${segment.index}이 말풍선 또는 꼬리를 통과합니다.`,'error')}
    }
  }
  return issues
}

export function elementsInMarquee(project: ProjectV4, box: {x:number;y:number;w:number;h:number}): string[] {
  return project.elements.filter(e => e.visible !== false && !e.locked && e.type !== 'scene' && e.x < box.x+box.w && e.x+e.w > box.x && e.y < box.y+box.h && e.y+e.h > box.y).map(e=>e.id)
}
