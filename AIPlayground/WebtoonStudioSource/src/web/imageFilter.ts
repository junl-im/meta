import type {PanelElement} from '@core/types'

export function imageFilterCss(filter:PanelElement['imageFilter']):string {
  switch(filter){
    case 'vivid':return 'saturate(1.4) contrast(1.08)'
    case 'soft':return 'saturate(.85) contrast(.92) brightness(1.06)'
    case 'bw':return 'grayscale(1)'
    case 'contrast':return 'contrast(1.4)'
    default:return 'none'
  }
}
