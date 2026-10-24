import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const js=readFileSync('dist/app.js','utf8');
const css=readFileSync('dist/art.css','utf8');
const from=js.indexOf('  const compactMedia=');
const to=js.indexOf('  // 한국식 일반 띠',from);
assert(from>=0&&to>from,'모바일 결과 코드가 있어야 합니다.');

const map=new Map();
class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.parent=null;this.open=false;this.listeners=new Map();}
  set id(value){this._id=value;map.set('#'+value,this);}
  get id(){return this._id;}
  remove(){if(this.parent){const index=this.parent.children.indexOf(this);if(index>=0)this.parent.children.splice(index,1);this.parent=null;}}
  append(...elements){for(const element of elements){assert(element instanceof Element,'노드가 있어야 합니다.');element.remove();element.parent=this;this.children.push(element);}}
  before(element){assert(this.parent,'상위 요소가 있어야 합니다.');element.remove();const index=this.parent.children.indexOf(this);element.parent=this.parent;this.parent.children.splice(index,0,element);}
  after(element){assert(this.parent,'상위 요소가 있어야 합니다.');element.remove();const index=this.parent.children.indexOf(this);element.parent=this.parent;this.parent.children.splice(index+1,0,element);}
  addEventListener(type,listener){this.listeners.set(type,listener);}
}
const make=id=>{const el=new Element();el.id=id;return el;};
const fortune=make('fortune-content'),fortuneText=make('fortuneDescription'),fortuneStats=make('fortuneStats');
fortune.append(fortuneText,fortuneStats,make('lucky-row'));
const saju=make('sajuResult'),elements=make('elementsChart'),sajuReading=make('sajuReading'),advanced=make('sajuAdvanced'),sajuNote=make('saju-note');
map.set('#sajuResult .calculation-note',sajuNote);saju.append(elements,sajuReading,advanced,sajuNote);
const newyear=make('newyearResult'),head=make('newyear-head'),annualText=make('newyearResultText'),seasonGrid=make('seasonGrid'),advice=make('newyearAdvice');
head.append(annualText);newyear.append(head,seasonGrid,advice);
const couple=make('coupleResult'),coupleText=make('coupleDescription'),coupleAdvice=make('coupleAdvice'),coupleNote=make('couple-note');
map.set('#coupleResult .calculation-note',coupleNote);couple.append(coupleText,coupleAdvice,coupleNote);

let resize;
const media={matches:true,addEventListener:(type,callback)=>{assert.equal(type,'change');resize=callback;}};
const sandbox={window:{matchMedia:()=>media},document:{createElement:tag=>new Element(tag)},$:(selector)=>map.get(selector)};
vm.runInNewContext(`${js.slice(from,to)}\ninitMobileReadings();`,sandbox,{timeout:1000});
for(const [detailId,expected] of [
  ['zodiacMore',[fortuneText,fortuneStats]],
  ['sajuMore',[elements,sajuReading,advanced,sajuNote]],
  ['newyearMore',[annualText,seasonGrid,advice]],
  ['coupleMore',[coupleText,coupleAdvice,coupleNote]],
]){
  const detail=map.get('#'+detailId);
  assert(detail,'접힌 상세 영역이 만들어져야 합니다.');
  assert.equal(detail.open,false,'모바일에서는 상세 영역을 먼저 접어 둡니다.');
  assert.deepEqual(detail.children.slice(1),expected,'기존 상세 결과를 빼놓거나 복제하면 안 됩니다.');
  assert.equal(detail.children[0].tag,'summary','키보드로도 여는 요약 버튼이어야 합니다.');
}
for(const id of ['fortuneQuickText','sajuQuickText','newyearQuickText','coupleQuickText'])assert(map.has('#'+id),`요약 텍스트 누락: ${id}`);
for(const el of [fortuneText,fortuneStats,elements,sajuReading,advanced,sajuNote,annualText,seasonGrid,advice,coupleText,coupleAdvice,coupleNote])assert(el.parent,'모든 원본 풀이 노드가 남아 있어야 합니다.');
media.matches=false;resize();
for(const id of ['zodiacMore','sajuMore','newyearMore','coupleMore'])assert.equal(map.get('#'+id).open,true,'PC에서는 원본 풀이를 펼쳐야 합니다.');

assert(css.includes("#newyear[data-mobile-stage='result'] .newyear-shell{display:none}"),'신년운세 결과에서 큰 선택 무대를 숨겨야 합니다.');
assert(css.includes("#saju[data-mobile-stage='result'] .section-heading{display:none}"),'사주 결과에서 중복 소개를 숨겨야 합니다.');
assert(css.includes("#couple[data-mobile-stage='result'] .section-heading"),'궁합 결과에서 중복 소개를 숨겨야 합니다.');
assert(js.indexOf('initMobileReadings();initNavigation();initFortune()')!==-1,'운세 결과 렌더보다 앞서 펼침 영역을 준비해야 합니다.');
console.log('모바일 결과 회귀 검증 통과 · 4개 결과 접기/펼치기 · 12개 원본 풀이 보존 · PC 복원 · 화면 단계 연결');
