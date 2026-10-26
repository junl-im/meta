import type {ComicMode} from './comicPixels.js'
export const COMIC_PRESETS:Array<{id:ComicMode;label:string;description:string}>=[
{id:'cel',label:'또렷한 셀 채색',description:'윤곽을 지키며 색면을 단순화'},
{id:'manga',label:'만화 배경 선·톤',description:'흑백 윤곽과 밝기별 망점'},
{id:'pop',label:'컬러 하프톤',description:'색면 위에 인쇄 코믹 망점'},
{id:'duotone',label:'두 색 회상',description:'남색 그림자와 크림색 명암'},
{id:'webtoon',label:'웹툰 셀 채색',description:'기존 색면·윤곽 조합'},
{id:'clean',label:'맑은 웹툰',description:'부드러운 밝은 색'},
{id:'night',label:'극적 명암',description:'어두운 장면 강조'},
{id:'color',label:'컬러 코믹',description:'색 단계와 윤곽'},
{id:'ink',label:'흑백 펜화',description:'밝은 바탕과 검은 선'},
{id:'tone',label:'흑백 망점',description:'기존 규칙형 톤'},
{id:'pastel',label:'파스텔 코믹',description:'가벼운 밝은 채색'},
{id:'sepia',label:'회상 세피아',description:'따뜻한 갈색 명암'}]
