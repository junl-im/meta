import {readFourPanelText} from './fourPanelPlan.js'
import {fourDirectionPrompt,type FourDirection} from './fourPanelDirection.js'
export function fourPanelImagePrompt(text:string,index:number,genre:string,characters:Array<{name:string;traits:string}>,direction?:FourDirection){
 const cut=readFourPanelText(text,index)
 return [`웹툰 한 컷. 장르: ${genre}`,`장면: ${cut.scene}`,`행동·구도: ${cut.action}`,cut.prompt&&`이미지 지시: ${cut.prompt}`,direction&&fourDirectionPrompt(direction),characters.length&&`인물 설정 (이번 컷에 필요한 인물만 사용):\n${characters.map(c=>`${c.name}: ${c.traits}`).join('\n')}`,'이미지 안에 글씨·대사·말풍선을 그리지 마세요. 대사를 나중에 넣을 여백을 확보하세요.'].filter(Boolean).join('\n').slice(0,9500)
}
