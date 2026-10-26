import type {BubbleElement} from './types.js'
export function bubbleTail(e:BubbleElement){
  const tx=e.tailX??e.w*.65,ty=e.tailY??e.h+35,dx=tx-e.w/2,dy=ty-e.h/2,length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length
  const radius=1/Math.sqrt((ux/(e.w/2))**2+(uy/(e.h/2))**2||1),ax=e.w/2+ux*radius*.7,ay=e.h/2+uy*radius*.7
  const half=Math.max(4,Math.min(Math.min(e.w,e.h)*.3,(e.tailWidth??e.w*.16)/2)),curve=Math.max(-e.w,Math.min(e.w,e.tailCurve||0))
  const cx=(ax+tx)/2-uy*curve,cy=(ay+ty)/2+ux*curve
  const a={x:ax-uy*half,y:ay+ux*half},b={x:ax+uy*half,y:ay-ux*half},c1={x:cx-uy*half,y:cy+ux*half},c2={x:cx+uy*half,y:cy-ux*half}
  return {path:`M ${a.x} ${a.y} Q ${c1.x} ${c1.y} ${tx} ${ty} Q ${c2.x} ${c2.y} ${b.x} ${b.y} Z`,points:[a,b,c1,c2,{x:tx,y:ty}]}
}
