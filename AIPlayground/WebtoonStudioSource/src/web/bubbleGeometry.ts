import type {BubbleElement} from '@core/types'

type Point={x:number;y:number}

export function bubbleTailPoint(e:Pick<BubbleElement,'w'|'h'|'tailX'|'tailY'>):Point{
  const x=Number.isFinite(e.tailX)?e.tailX!:e.w*.65
  const y=Number.isFinite(e.tailY)?e.tailY!:e.h+35
  return{x:Math.max(0,Math.min(e.w,x)),y:Math.max(e.h+12,y)}
}

export function resizedBubbleTail(e:Pick<BubbleElement,'w'|'h'|'tailX'|'tailY'>,w:number,h:number):Point{
  const tail=bubbleTailPoint(e)
  return{
    x:Math.max(0,Math.min(w,tail.x*w/e.w)),
    y:h+Math.max(12,(tail.y-e.h)*h/e.h)
  }
}
