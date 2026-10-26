export const FOUR_SHOTS={auto:'콘티에 맡기기',wide:'전체 장면',medium:'상반신',close:'얼굴 가까이',extreme:'감정 초근접',low:'아래에서 보기',high:'위에서 보기',dutch:'기울어진 액션 구도'} as const
export const FOUR_EMOTIONS={auto:'콘티에 맡기기',happy:'기쁨',shock:'크게 놀람',anger:'분노',sad:'슬픔',awkward:'당황',determined:'결의'} as const
export const FOUR_SPACES={auto:'자동 여백',top:'위쪽 대사 여백',left:'왼쪽 대사 여백',right:'오른쪽 대사 여백'} as const
export type FourDirection={shot:keyof typeof FOUR_SHOTS;emotion:keyof typeof FOUR_EMOTIONS;space:keyof typeof FOUR_SPACES}
export const DEFAULT_FOUR_DIRECTION:FourDirection={shot:'auto',emotion:'auto',space:'auto'}
export function parseFourDirections(value:unknown):FourDirection[]|undefined{
 if(value===undefined)return undefined
 if(!Array.isArray(value)||value.length!==4)throw Error('컷별 연출은 네 컷으로 구성해야 합니다.')
 return value.map(v=>{
  if(!v||typeof v!=='object'||!Object.hasOwn(FOUR_SHOTS,v.shot)||!Object.hasOwn(FOUR_EMOTIONS,v.emotion)||!Object.hasOwn(FOUR_SPACES,v.space))throw Error('컷별 연출 설정이 올바르지 않습니다.')
  return {shot:v.shot,emotion:v.emotion,space:v.space}
 })
}
export function fourDirectionPrompt(value:FourDirection){
 const shots={auto:'',wide:'wide shot, show the environment',medium:'medium shot, waist up',close:'close-up shot of the face',extreme:'extreme close-up, emphasize emotional expression',low:'low angle shot',high:'high angle shot',dutch:'Dutch angle, dynamic tilted composition'}
 const emotions={auto:'',happy:'exaggerated joyful expression',shock:'exaggerated shocked face, wide eyes',anger:'intense angry expression',sad:'tearful sad expression',awkward:'flustered embarrassed expression',determined:'determined expression, focused eyes'}
 const spaces={auto:'',top:'negative space at the top; keep faces below the upper dialogue area',left:'negative space on the left; position characters toward the right',right:'negative space on the right; position characters toward the left'}
 return [value.shot!=='auto'&&`카메라 지정: ${FOUR_SHOTS[value.shot]} (${shots[value.shot]})`,value.emotion!=='auto'&&`표정 지정: ${FOUR_EMOTIONS[value.emotion]} (${emotions[value.emotion]})`,value.space!=='auto'&&`대사 여백 지정: ${FOUR_SPACES[value.space]} (${spaces[value.space]})`].filter(Boolean).join('\n')
}
