/* 달빛운세 — 브라우저 내 무료 운세 체험. 외부 서버로 입력 정보를 전송하지 않습니다. */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const animals = [
    {name:'쥐',emoji:'🐭',label:'쥐띠'}, {name:'소',emoji:'🐮',label:'소띠'},
    {name:'호랑이',emoji:'🐯',label:'호랑이띠'}, {name:'토끼',emoji:'🐰',label:'토끼띠'},
    {name:'용',emoji:'🐲',label:'용띠'}, {name:'뱀',emoji:'🐍',label:'뱀띠'},
    {name:'말',emoji:'🐴',label:'말띠'}, {name:'양',emoji:'🐑',label:'양띠'},
    {name:'원숭이',emoji:'🐵',label:'원숭이띠'}, {name:'닭',emoji:'🐔',label:'닭띠'},
    {name:'개',emoji:'🐶',label:'개띠'}, {name:'돼지',emoji:'🐷',label:'돼지띠'}
  ];
  const periodLabels = {daily:'오늘',weekly:'이번 주',monthly:'이번 달',yearly:'올해',date:'선택한 날'};
  const palette = ['라벤더','황금빛','하늘색','연보라','복숭아색','에메랄드','아이보리','남색','장미색','은빛'];
  const directions = ['동쪽','서쪽','남쪽','북쪽','남동쪽','북서쪽'];
  const headlines = [
    '작은 변화 속에 반가운 기회가 숨어 있어요.', '서두르지 않아도 좋은 흐름이 찾아와요.',
    '오래 품은 생각을 가볍게 시작해 볼 시간이에요.', '마음이 편안해지는 소식이 기다리고 있어요.',
    '대화 한 번이 뜻밖의 길을 열어줄 수 있어요.', '나를 위한 작은 선택이 빛나는 순간이에요.',
    '오늘의 꾸준함이 내일의 자신감이 될 거예요.', '놓쳤다고 생각한 기회가 다시 보일 수 있어요.',
    '주변의 다정한 신호를 한 번 더 살펴보세요.', '새로운 풍경에서 신선한 영감을 얻을 수 있어요.'
  ];
  const opening = [
    '바쁘게 흘러가는 일상에서 잠깐 속도를 늦추면 중요한 힌트를 발견할 수 있겠어요.',
    '익숙한 방법도 좋지만 오늘은 다른 관점에서 바라보는 여유가 힘이 되어줄 거예요.',
    '한동안 망설이던 일에 작은 첫발을 내딛기 좋은 분위기예요.',
    '가까운 사람의 말에 귀 기울이면 생각지 못한 실마리를 만날 수 있어요.',
    '해야 할 일을 차분히 정리할수록 마음의 무게가 한결 가벼워질 수 있어요.',
    '서로 다른 의견 사이에 괜찮은 절충안이 숨어 있을 수 있어요.',
    '조금의 기다림이 오히려 좋은 결과로 이어질 수 있는 흐름이에요.',
    '처음에는 낯설어도 새로운 경험이 앞으로의 선택에 도움이 될 수 있어요.'
  ];
  const closings = [
    '가장 중요한 일 하나에 집중해 보세요. 작은 성취가 하루 전체의 분위기를 바꿉니다.',
    '기대에만 마음을 맡기기보다 준비할 수 있는 것부터 차근차근 챙겨보세요.',
    '지나친 비교는 내려놓고 나만의 속도를 지키는 것이 오늘의 열쇠예요.',
    '서로에게 고맙다는 말을 전해보세요. 관계의 온도가 부드러워질 수 있어요.',
    '새로운 약속이나 지출은 한 번 더 확인하면 한결 편안할 거예요.',
    '여유가 부족했다면 짧은 산책과 휴식으로 생각을 정리해 보세요.',
    '작은 아이디어라도 적어두면 나중에 꽤 쓸모 있는 씨앗이 될 수 있어요.',
    '무언가 선택해야 한다면 마음의 설렘과 현실의 조건을 함께 살펴보세요.'
  ];
  const reassurance = [
    '오늘 모든 걸 완벽하게 해내지 못했어도 괜찮아요. 이미 충분히 애쓰고 있으니까요.',
    '남들과 다른 속도로 걷는다고 뒤처지는 건 아니에요. 지금의 당신도 소중해요.',
    '마음이 복잡했다면 잠깐 숨을 골라도 좋아요. 답을 서두르지 않아도 괜찮습니다.',
    '스스로에게 조금 더 다정해져 보세요. 작은 위로가 다음 걸음의 힘이 되어줄 거예요.',
    '아무도 알아주지 않은 수고가 있었다면, 오늘만큼은 스스로를 토닥여 주세요.',
    '흐린 밤에도 달은 그 자리에 있어요. 지금 보이지 않는다고 희망이 사라진 건 아니에요.'
  ];
  const categoryNames = ['금전운','애정운','일·학업운','건강운'];
  const elementNames = ['목(木)','화(火)','토(土)','금(金)','수(水)'];
  const elementColors = ['#81b99b','#e9a191','#cfbb84','#c5c8e0','#89b2df'];
  const stemElements = {'甲':0,'乙':0,'丙':1,'丁':1,'戊':2,'己':2,'庚':3,'辛':3,'壬':4,'癸':4};
  const branchElements = {'寅':0,'卯':0,'巳':1,'午':1,'辰':2,'戌':2,'丑':2,'未':2,'申':3,'酉':3,'亥':4,'子':4};
  const elementMessage = [
    '성장과 시작을 상징하는 목의 기운이 두드러져요. 배우고 확장하는 마음을 살리되, 계획도 함께 가다듬어 보세요.',
    '표현과 열정을 상징하는 화의 기운이 눈에 띄어요. 반짝이는 추진력을 살리고 충분한 쉼도 챙겨보세요.',
    '균형과 신뢰를 상징하는 토의 기운이 중심을 잡아요. 일상을 꾸준하게 돌보는 태도가 잘 어울려요.',
    '원칙과 정리를 상징하는 금의 기운이 도드라져요. 기준을 세우되 유연한 대화의 여지도 남겨두세요.',
    '관찰과 유연함을 상징하는 수의 기운이 빛나요. 생각을 깊이 하면서도 기회를 놓치지 않게 행동해 보세요.'
  ];
  const dayStemMessage = {
    '甲':'큰 나무처럼 한 방향으로 성장하려는 힘을 상징해요.', '乙':'풀과 꽃처럼 부드럽지만 끈질긴 생명력을 상징해요.',
    '丙':'넓게 비추는 태양처럼 솔직한 에너지를 상징해요.', '丁':'어두운 곳을 밝히는 촛불처럼 섬세한 열정을 상징해요.',
    '戊':'산처럼 든든하게 중심을 지키는 기운을 상징해요.', '己':'밭처럼 주변을 돌보며 가꾸는 기운을 상징해요.',
    '庚':'단단한 쇠처럼 결단과 변화의 힘을 상징해요.', '辛':'세공한 보석처럼 섬세한 감각과 기준을 상징해요.',
    '壬':'넓은 바다처럼 크고 유연한 생각을 상징해요.', '癸':'잔잔한 비처럼 차분한 통찰을 상징해요.'
  };
  const tenGodKorean={'比肩':'비견','劫财':'겁재','劫財':'겁재','食神':'식신','伤官':'상관','傷官':'상관','偏财':'편재','偏財':'편재','正财':'정재','正財':'정재','七杀':'편관','七殺':'편관','偏官':'편관','正官':'정관','偏印':'편인','正印':'정인','日主':'일간'};
  const tenGodMessage={
    '비견':'주관과 독립심을 살리는 힘이에요. 함께 걷는 사람의 관점도 놓치지 않으면 더 든든해져요.',
    '겁재':'경쟁과 협력 사이에서 에너지가 자랄 수 있어요. 비교보다 내 몫의 성장을 먼저 챙겨보세요.',
    '식신':'꾸준히 쌓은 실력과 표현이 힘을 얻는 상징이에요. 작은 결과를 만들어보는 일이 잘 어울려요.',
    '상관':'익숙한 틀 밖에서 새로운 길을 찾는 기운이에요. 날카로운 아이디어를 다정한 말로 건네보세요.',
    '편재':'새로운 기회를 발견하고 여러 가능성을 살피는 기운이에요. 결정 전에는 자원과 한계를 함께 점검해 보세요.',
    '정재':'쌓아 올린 것을 보살피고 안정적으로 관리하는 기운이에요. 매일의 작은 기록이 힘이 될 수 있어요.',
    '편관':'책임과 도전 앞에서 단단해지는 상징이에요. 스스로에게 지나친 압박을 주지 않는 균형이 필요해요.',
    '정관':'원칙과 신뢰, 약속을 지키는 힘이 돋보여요. 나만의 기준에 여유를 더해 보세요.',
    '편인':'남다른 관찰력과 통찰을 기르는 기운이에요. 생각을 현실의 실천으로 이어보면 좋아요.',
    '정인':'배움과 돌봄, 차분한 성장을 상징해요. 받아 온 도움을 나누는 마음이 관계를 따뜻하게 만들어요.',
    '일간':'사주의 중심인 나 자신을 가리켜요.'
  };
  const koreanTenGod=raw=>tenGodKorean[String(raw)]||String(raw||'관계 미상');
  // lunar-javascript의 절기 시각은 UTC+8 현지 시각을 사용합니다.
  // 연·월주는 한국 출생 시각을 해당 기준으로 변환하되, 일·시주는 한국의 실제 시각을 유지합니다.
  // 과거 한국의 UTC+8:30 시기와 서머타임도 Asia/Seoul의 시간대 이력을 우선 사용합니다.
  const seoulOffsetFormat=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',timeZoneName:'longOffset'});
  function seoulOffsetMinutes(ymdhms){
    const [year,month,day,hour,minute]=ymdhms;
    const guess=new Date(Date.UTC(year,month-1,day,hour-9,minute||0));
    const zone=seoulOffsetFormat.formatToParts(guess).find(part=>part.type==='timeZoneName')?.value||'GMT+09:00';
    const match=zone.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    return match?(match[1]==='-'?-1:1)*(Number(match[2])*60+Number(match[3]||0)):540;
  }
  function koreanPillars(solar){
    const y=solar.getYear(),m=solar.getMonth(),d=solar.getDay(),hour=solar.getHour(),minute=solar.getMinute();
    const offset=seoulOffsetMinutes([y,m,d,hour,minute]);
    const chinaTime=new Date(Date.UTC(y,m-1,d,hour,minute)-offset*60000+480*60000);
    const solarForTerms=Solar.fromYmdHms(chinaTime.getUTCFullYear(),chinaTime.getUTCMonth()+1,chinaTime.getUTCDate(),chinaTime.getUTCHours(),chinaTime.getUTCMinutes(),0);
    const localEight=solar.getLunar().getEightChar();
    const termEight=solarForTerms.getLunar().getEightChar();
    return {localEight,termEight,year:termEight.getYear(),month:termEight.getMonth(),day:localEight.getDay(),time:localEight.getTime()};
  }
  function readBirthTime(selectId,exactId){
    const precise=$(exactId)?.value||'';
    if(/^\d{2}:\d{2}$/.test(precise)){
      const [hour,minute]=precise.split(':').map(Number);
      if(hour<=23&&minute<=59)return {hour,minute,unknown:false,precise:true};
    }
    const selected=$(selectId).value;
    return selected==='unknown'||selected==='exact'?{hour:12,minute:0,unknown:true,precise:false}:{hour:Number(selected),minute:0,unknown:false,precise:false};
  }
  /** 기기 기본 시간 입력 UI는 선택적으로만 열어 큰 팝업이나 긴 입력란을 만들지 않습니다. */
  function initPreciseBirthTimes(){
    for(const [id,exactId] of [['sajuTime','sajuExactTime'],['coupleTimeA','coupleExactTimeA'],['coupleTimeB','coupleExactTimeB']]){
      const select=$('#'+id);
      if(!select)continue;
      const early=select.querySelector('[value="0"]');
      if(early)early.textContent='자시 · 00:00~00:59';
      const late=new Option('자시 · 23:00~23:59','23');
      select.add(late);
      const exactOption=new Option('분 단위로 입력한 시각','exact');
      select.add(exactOption);
      const details=document.createElement('details');
      details.className='precise-birth-time';
      details.innerHTML=`<summary>분 단위로 태어난 시각 입력 (선택)</summary><div class="precise-time-row"><label for="${exactId}">태어난 시각</label><input id="${exactId}" type="time" step="60"><small>정확한 시각을 입력하면 위 구간 선택보다 우선 적용해요.</small></div>`;
      select.after(details);
      const exact=$('#'+exactId);
      exact.addEventListener('input',()=>{if(exact.value)select.value='exact';else select.value='unknown';});
      select.addEventListener('change',()=>{if(select.value!=='exact')exact.value='';else details.open=true;});
    }
  }
  let sajuKnowledge=null; // 창작된 분야별 해석 DB. 계산식과 분리하여 교정·확장합니다.
  let recentSaju=null; // 기기 메모리에서만 메뉴 간 연동. 서버/저장소에 남기지 않습니다.
  const kstParts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
  const kstNow = () => { const p = Object.fromEntries(kstParts.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])); return `${p.year}-${p.month}-${p.day}`; };
  const safeDate = (iso,calendar='solar') => {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return false;
    const [y,m,d]=iso.split('-').map(Number);
    if(y<1900||y>2099||m<1||m>12)return false;
    if(calendar==='lunar')return d>=1&&d<=30;
    return d>=1&&d<=new Date(Date.UTC(y,m,0)).getUTCDate();
  };
  /** 출생일에는 월력을 수십 번 넘길 필요가 없는 3칸형 달력 선택기를 사용합니다. */
  function initMoonDateInputs(){
    $$('.moon-date-parts').forEach(group=>{
      const target=$('#'+group.dataset.dateTarget),year=group.querySelector('.moon-year'),month=group.querySelector('.moon-month'),day=group.querySelector('.moon-day');
      for(let m=1;m<=12;m++)month.add(new Option(`${m}월`,String(m)));
      const calendar=()=>{
        if(target.id==='sajuBirth')return $('#sajuCalendarType button.selected')?.dataset.cal||'solar';
        return $('#coupleCalendar'+target.id.slice(-1)).value;
      };
      const sync=()=>{
        const y=Number(year.value),m=Number(month.value),previous=day.value;
        const max=calendar()==='lunar'?30:(Number.isInteger(y)&&y>=1900&&y<=2099&&m>=1&&m<=12?new Date(Date.UTC(y,m,0)).getUTCDate():31);
        day.replaceChildren(new Option('일',''));
        for(let d=1;d<=max;d++)day.add(new Option(`${d}일`,String(d)));
        if(previous&&Number(previous)<=max)day.value=previous;
        target.value=Number.isInteger(y)&&y>=1900&&y<=2099&&m>=1&&m<=12&&day.value?`${y}-${String(m).padStart(2,'0')}-${String(day.value).padStart(2,'0')}`:'';
        group.classList.toggle('complete',Boolean(target.value));
      };
      year.addEventListener('input',sync);month.addEventListener('change',sync);day.addEventListener('change',sync);
      if(target.id==='sajuBirth')$$('#sajuCalendarType button').forEach(btn=>btn.addEventListener('click',()=>queueMicrotask(sync)));
      else $('#coupleCalendar'+target.id.slice(-1)).addEventListener('change',sync);
      sync();
    });
  }
  const isoOf = (date) => date.toISOString().slice(0,10);
  const hash = (value) => {let h=2166136261;for(const ch of String(value)){h ^= ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  const mix = (key,n) => hash(`${key}|${n}|달빛운세`);
  const choose = (arr,key,n) => arr[mix(key,n)%arr.length];
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paragraph = s => escapeHtml(s).replace(/(?<=[.!?])\s+(?=[가-힣“])/gu,'\n');
  const toast = (message) => {const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);};
  async function copyText(text) {try {await navigator.clipboard.writeText(text);toast('결과를 복사했어요 ✧');}catch{toast('복사가 지원되지 않는 환경이에요.');}}

  // 한국식 일반 띠(음력 설 기준) 계산 — 출생 연도만 입력한 간편 선택은 경계의 정확도를 보장하지 않음.
  const zodiacFromYear = (year) => ((year-2020)%12+12)%12;
  let selectedZodiac = 4;
  let selectedPeriod = 'daily';
  let selectedDate = kstNow();
  try {const raw=localStorage.getItem('moonlit-zodiac');if(raw!==null){let saved=Number(raw);if(Number.isInteger(saved)&&saved>=0&&saved<12)selectedZodiac=saved;}}catch{}
  function periodSeed(){
    const d=new Date(`${selectedDate}T12:00:00Z`);
    if(selectedPeriod==='weekly'){const dow=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dow);return isoOf(d);}
    if(selectedPeriod==='monthly')return selectedDate.slice(0,7);
    if(selectedPeriod==='yearly')return selectedDate.slice(0,4);
    return selectedDate;
  }
  function drawZodiacGrid(){
    $('#zodiacCounter').textContent=`${String(selectedZodiac+1).padStart(2,'0')} / 12`;
    $('#zodiacGrid').innerHTML=animals.map((a,i)=>`<button type="button" class="animal-button ${i===selectedZodiac?'selected':''}" aria-pressed="${i===selectedZodiac}" data-animal="${i}"><span class="animal-portrait" aria-hidden="true" style="background-position:${(i%4)*100/3}% ${Math.floor(i/4)*50}%"></span><span>${a.name}띠</span></button>`).join('');
    $$('.animal-button').forEach(b=>b.addEventListener('click',()=>{
      selectedZodiac=Number(b.dataset.animal);
      try{localStorage.setItem('moonlit-zodiac',String(selectedZodiac));}catch{}
      drawZodiacGrid();updateFortune();
      $('#zodiac').dataset.mobileStage='result';
      $('#zodiac').scrollTop=0;
    }));
  }
  function fortuneFor(zodiac,period,seed){
    const key=`${zodiac}/${period}/${seed}`;
    const score=3+mix(key,1)%3; // 3~5점: 가벼운 긍정형 운세 콘텐츠
    const categories=[0,1,2,3].map((i)=>45+mix(key,20+i)%51);
    return {score,categories,headline:choose(headlines,key,2),description:`${choose(opening,key,3)} ${choose(closings,key,4)} ${choose(reassurance,key,8)}`,color:choose(palette,key,5),number:1+mix(key,6)%9,direction:choose(directions,key,7)};
  }
  function updateFortune(){
    const a=animals[selectedZodiac],seed=periodSeed(),f=fortuneFor(selectedZodiac,selectedPeriod,seed);
    $('#chosenAnimal').textContent='';$('#chosenAnimal').classList.add('selected-portrait');
    $('#chosenAnimal').style.backgroundPosition=`${(selectedZodiac%4)*100/3}% ${Math.floor(selectedZodiac/4)*50}%`;
    $('#chosenZodiacName').textContent=a.label;
    $('#fortuneDate').textContent=selectedPeriod==='daily'?`${selectedDate} 오늘의 메시지`:`${seed} · ${periodLabels[selectedPeriod]}`;
    $('#fortuneStars').textContent='★'.repeat(f.score)+'☆'.repeat(5-f.score);
    $('#fortuneScoreText').textContent=['','','','조용히 준비하기 좋은 흐름','기분 좋은 가능성이 보이는 흐름','기운이 반짝이는 흐름'][f.score];
    $('#fortuneHeadline').textContent=f.headline;$('#fortuneDescription').textContent=f.description;
    window.DalbitByeolha?.read(`${a.label} ${periodLabels[selectedPeriod]} 운세입니다. ${f.headline} ${f.description}`);
    $('#fortuneStats').innerHTML=f.categories.map((v,i)=>`<div class="fortune-stat"><span>${categoryNames[i]}</span><b>${v}<small>/100</small></b><div class="stat-meter"><i style="width:${v}%"></i></div></div>`).join('');
    $('#luckyColor').textContent=f.color;$('#luckyNumber').textContent=f.number;$('#luckyDirection').textContent=f.direction;
  }
  function initFortune(){
    drawZodiacGrid();$('#fortuneInputDate').value=selectedDate;updateFortune();
    $$('.period-tab').forEach(btn=>btn.addEventListener('click',()=>{
      selectedPeriod=btn.dataset.period;
      $$('.period-tab').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',String(b===btn));});
      $('#dateChoice').hidden=selectedPeriod!=='date';
      if(selectedPeriod!=='date')selectedDate=kstNow();
      updateFortune();
    }));
    $('#showDateFortune').addEventListener('click',()=>{const v=$('#fortuneInputDate').value;if(!safeDate(v)){toast('날짜를 선택해 주세요.');return;}selectedDate=v;updateFortune();});
    $('#findZodiac').addEventListener('click',()=>{const y=Number($('#birthYear').value);if(!Number.isInteger(y)||y<1900||y>2100){toast('1900~2100 사이 출생 연도를 입력해 주세요.');return;}selectedZodiac=zodiacFromYear(y);drawZodiacGrid();updateFortune();$('#zodiacDialog').close();$('#zodiac').dataset.mobileStage='result';$('#zodiac').scrollTop=0;toast('연도 기준으로 찾았어요. 1~2월생은 음력 설을 확인해 주세요.');});
    $('#zodiacBack').addEventListener('click',()=>{$('#zodiac').dataset.mobileStage='choose';$('#zodiac').scrollTop=0;});
    $('#copyFortune').addEventListener('click',()=>{const a=animals[selectedZodiac],f=fortuneFor(selectedZodiac,selectedPeriod,periodSeed());copyText(`달빛운세 ${a.label} ${periodLabels[selectedPeriod]} 운세\n${f.headline}\n${f.description}\n행운의 색: ${f.color} · 숫자: ${f.number} · 방향: ${f.direction}\n※ 재미로 보는 달빛운세`);});
  }

  // 사주는 lunar-javascript의 24절기·간지 알고리즘을 사용합니다.
  function initSaju(){
    const calButtons=$$('#sajuCalendarType button');let calendar='solar';
    calButtons.forEach(btn=>btn.addEventListener('click',()=>{calendar=btn.dataset.cal;calButtons.forEach(x=>{x.classList.toggle('selected',x===btn);x.setAttribute('aria-checked',String(x===btn));});$('#leapLine').hidden=calendar!=='lunar';}));
    $('#sajuForm').addEventListener('submit',e=>{
      e.preventDefault(); const input=$('#sajuBirth').value,birthTime=readBirthTime('#sajuTime','#sajuExactTime'),unknown=birthTime.unknown;
      if(!safeDate(input,calendar)){toast('출생 연도·월·일을 정확히 입력해 주세요.');return;}
      if(typeof Solar==='undefined'||typeof Lunar==='undefined'){toast('사주 계산 자료를 불러오지 못했어요. 다시 접속해 주세요.');return;}
      const [year,month,day]=input.split('-').map(Number);
      if(year<1900||year>2099){toast('1900~2099 사이 생년월일을 입력해 주세요.');return;}
      const {hour,minute}=birthTime; let solar,lunar;
      try{
        if(calendar==='lunar'){
          const lunarMonth=$('#sajuLeap').checked?-month:month;
          lunar=Lunar.fromYmdHms(year,lunarMonth,day,hour,minute,0);solar=lunar.getSolar();
          if(lunar.getYear()!==year||lunar.getMonth()!==lunarMonth||lunar.getDay()!==day)throw Error('음력 날짜를 확인해 주세요.');
        }else{solar=Solar.fromYmdHms(year,month,day,hour,minute,0);lunar=solar.getLunar();
          if(solar.getYear()!==year||solar.getMonth()!==month||solar.getDay()!==day)throw Error('양력 날짜를 확인해 주세요.');}
      }catch(err){toast(`해당 날짜를 계산할 수 없어요. ${err.message||''}`);return;}
      try{renderSaju(solar,lunar,unknown);}catch{toast('사주 계산 중 오류가 발생했어요. 날짜와 시간을 확인해 주세요.');}
    });
  }
  function renderSaju(solar,lunar,unknown){
    const pillars=koreanPillars(solar),eight=pillars.localEight;
    const pairs=[pillars.year,pillars.month,pillars.day,unknown?null:pillars.time];
    const counts=[0,0,0,0,0],labels=['년주','월주','일주','시주'];
    pairs.forEach(pair=>{if(!pair)return;for(const c of pair){let idx=stemElements[c]??branchElements[c];if(idx!==undefined)counts[idx]++;}});
    const name=$('#sajuName').value.trim().slice(0,20),total=counts.reduce((a,b)=>a+b,0),dominant=counts.indexOf(Math.max(...counts));
    $('#sajuResultTitle').textContent=`${name?name+'님의':'나의'} 사주팔자`;
    $('#sajuDateInfo').textContent=`양력 ${solar.getYear()}.${solar.getMonth()}.${solar.getDay()} · 음력 ${lunar.getYear()}년 ${Math.abs(lunar.getMonth())}월 ${lunar.getDay()}일${lunar.getMonth()<0?' (윤달)':''}${unknown?' · 출생 시간 미상':` · ${String(solar.getHour()).padStart(2,'0')}:${String(solar.getMinute()).padStart(2,'0')} 기준`}`;
    $('#pillarGrid').innerHTML=pairs.map((p,i)=>`<div class="pillar"><span class="pillar-label">${labels[i]}</span><span class="pillar-gan">${p?p[0]:'—'}</span><span class="pillar-ji">${p?p[1]:'—'}</span><small>${p?'천간 · 지지':'시간 미상'}</small></div>`).join('');
    $('#elementsChart').innerHTML=`<h4>오행의 분포 <small style="font:400 10px var(--sans);color:#a69bb9">(천간·지지의 대표 오행)</small></h4>`+counts.map((v,i)=>`<div class="element-line"><span>${elementNames[i]}</span><div class="element-track"><i style="width:${total?(v/total)*100:0}%;background:${elementColors[i]}"></i></div><b>${v}</b></div>`).join('');
    const dayStem=pairs[2]?.[0]||'甲';
    recentSaju={dayStem,name,solarDate:solar.toYmd()};
    const newyearHint=$('#newyearPersonalHint');
    if(newyearHint)newyearHint.textContent='나의 사주 정보가 연결되었어요. 신년운세에서 세운 해석도 함께 볼 수 있어요.';
    const master=sajuKnowledge?.dayMasters?.[dayStem];
    $('#sajuReading').innerHTML=master
      ? `<div class="reading-prologue"><span>나의 일간 · ${escapeHtml(master.name)} ${escapeHtml(dayStem)}</span><h4>${escapeHtml(master.image)}</h4><p>${paragraph(`전통 명리에서는 ${master.core}을 이 일간의 이미지로 읽어요.`)} ${paragraph(`특히 ${master.strength}도 오래 키워 갈 수 있는 강점이에요.`)}</p><p>${paragraph(`한편 ${master.shadow}도 함께 살펴볼 만해요.`)} 한 사람의 모든 모습은 사주만으로 단정할 수 없으니까요.</p></div><div class="reading-prologue"><span>오행의 균형 · ${escapeHtml(elementNames[dominant])}</span><p>${paragraph(elementMessage[dominant])}</p></div>${unknown?'<p class="saju-note">태어난 시간을 알면 네 번째 기둥까지 포함해 다시 살펴볼 수 있어요.</p>':''}`
      : `<b>✧ 일간 ${escapeHtml(dayStem)}의 이야기</b><br>${escapeHtml(dayStemMessage[dayStem]||'나만의 중심을 가꾸는 상징으로 읽을 수 있어요.')}<br><br><b>✧ 두드러지는 오행 — ${elementNames[dominant]}</b><br>${escapeHtml(elementMessage[dominant])}`;
    const relations=[
      {label:'년간 · 뿌리',value:LunarUtil.SHI_SHEN[dayStem+pairs[0][0]]},
      {label:'월간 · 사회',value:LunarUtil.SHI_SHEN[dayStem+pairs[1][0]]},
      ...(!unknown?[{label:'시간 · 표현',value:eight.getTimeShiShenGan()}]:[])
    ].map(x=>({...x,name:koreanTenGod(x.value)}));
    const strongest=relations.find(x=>tenGodMessage[x.name])||relations[0];
    const relationMarkup=relations.map(x=>`<article class="saju-clue"><span>${escapeHtml(x.label)}</span><b>${escapeHtml(x.name)}</b><p>${paragraph(sajuKnowledge?.tenGods?.[x.name]?.core||tenGodMessage[x.name]||'삶의 여러 관계를 되돌아보는 상징으로 살펴보세요.')}</p></article>`).join('');
    // 태어난 절기 월지의 대표 오행과 일간, 지지의 합·충 관계를 계산 근거와 함께 설명합니다.
    const seasonElement=branchElements[pairs[1][1]],selfElement=stemElements[dayStem];
    const elementRelation=seasonElement===selfElement
      ? '태어난 달과 나의 일간이 같은 오행으로 읽혀요. 익숙한 리듬을 든든한 바탕으로 삼을 수 있겠어요.'
      : (seasonElement+1)%5===selfElement
        ? '태어난 달의 대표 오행이 나의 일간을 생하는 관계로 읽혀요. 도움받아 성장하는 경험을 돌아보면 좋겠어요.'
        : (selfElement+1)%5===seasonElement
          ? '나의 일간이 태어난 달의 대표 오행을 생하는 관계로 읽혀요. 주변을 위해 에너지를 쓰는 만큼 회복도 살펴보세요.'
          : (seasonElement+2)%5===selfElement
            ? '태어난 달의 대표 오행이 나의 일간을 극하는 관계로 읽혀요. 부담을 조절하는 방식에 관심을 두면 좋겠어요.'
            : '나의 일간이 태어난 달의 대표 오행을 극하는 관계로 읽혀요. 주도성과 유연함 사이의 균형을 생각해 보세요.';
    const branchPairs=pairs.map((pair,i)=>pair?{label:labels[i],branch:pair[1]}:null).filter(Boolean);
    const interactions=[];
    for(let i=0;i<branchPairs.length;i++)for(let j=i+1;j<branchPairs.length;j++){
      const x=branchPairs[i],y=branchPairs[j],rules=sajuKnowledge?.branchRelations;
      for(const [type,patterns,title] of [['harmony',rules?.harmony,'조화'],['clash',rules?.clash,'변화']]){
        if(x.branch!==y.branch&&patterns?.some(pair=>pair.includes(x.branch)&&pair.includes(y.branch)))interactions.push({title,between:`${x.label} ${x.branch} · ${y.label} ${y.branch}`,message:rules?.[`${type}Message`]});
      }
    }
    const seasonalMarkup=sajuKnowledge?`<section class="saju-depth seasonal-reading"><p class="kicker">SEASON & RELATION</p><h4>태어난 달과 네 기둥의 연결</h4><p class="saju-note">한국 시간대 이력을 적용한 월지 ${escapeHtml(pairs[1][1])}(${elementNames[seasonElement]})와 일간 ${escapeHtml(dayStem)}(${elementNames[selfElement]})를 비교했어요.</p><p class="seasonal-note">${escapeHtml(elementRelation)}</p><div class="branch-interactions">${interactions.length?interactions.slice(0,4).map(x=>`<article><span>${escapeHtml(x.title)}의 관계 · ${escapeHtml(x.between)}</span><p>${paragraph(x.message)}</p></article>`).join(''):'<p class="saju-note">네 기둥에서 대표적인 육합·육충 관계가 따로 잡히지 않았어요. 이것이 관계의 좋고 나쁨을 뜻하지는 않아요.</p>'}</div><details class="personal-calculation"><summary>계산의 범위</summary><p>한국 표준시 이력을 고려해 연·월주 절기 경계를 보정하고, 일·시주는 입력한 현지 시각을 적용했어요. 지장간·격국·용신 전체 판정이나 출생 지역의 진태양시 보정은 포함하지 않았어요. 출생 시간이 미상인 절기 경계일은 결과가 달라질 수 있어요.</p></details></section>`:'';
    const gender=$('#sajuGender').value;
    let cyclesMarkup='<p class="saju-note">전통 대운의 순행·역행은 선택한 기준에 따라 계산해요. 남성 또는 여성을 선택하면 10년 흐름을 살펴볼 수 있어요.</p>';
    let cycleVoice='';
    if(gender!=='unknown'){
      const yun=pillars.termEight.getYun(gender==='male'?1:0,2),cycles=yun.getDaYun(9).slice(1),currentYear=Number(kstNow().slice(0,4));
      const active=cycles.find(d=>d.getStartYear()<=currentYear&&currentYear<=d.getEndYear());
      cyclesMarkup=`<p class="saju-note">${escapeHtml(yun.isForward()?'순행':'역행')}으로 계산한 전통 대운표예요. 나이는 전통식 기준이며 계산법에 따라 시작 시점이 달라질 수 있어요.</p><div class="saju-cycles">${cycles.map(d=>`<div class="saju-cycle ${active===d?'current':''}"><b>${escapeHtml(d.getGanZhi())}</b><span>${d.getStartYear()}~${d.getEndYear()}년</span><small>${d.getStartAge()}~${d.getEndAge()}세</small></div>`).join('')}</div>`;
      cycleVoice=active?`지금은 전통 대운표상 ${active.getGanZhi()} 흐름에 해당합니다. 한 시기의 이름보다 지금 쌓고 있는 경험과 선택이 더 중요해요.`:'대운표를 통해 지나온 과정과 앞으로의 변화를 함께 돌아보세요.';
    }
    const thisYear=Number(kstNow().slice(0,4));
    const yearStories=[thisYear,thisYear+1].map(year=>{
      const y8=Solar.fromYmdHms(year,7,1,12,0,0).getLunar().getEightChar();
      const link=koreanTenGod((typeof LunarUtil!=='undefined'&&LunarUtil.SHI_SHEN)?LunarUtil.SHI_SHEN[dayStem+y8.getYearGan()]:null);
      const yearCore=sajuKnowledge?.tenGods?.[link]?.core;
      const advice=yearCore?`${yearCore}이라는 전통적 상징을 돌아보세요.`:tenGodMessage[link]||'지금의 나에게 필요한 균형과 선택을 살펴보세요.';
      return `<article class="saju-year"><b>${year}년 · ${escapeHtml(y8.getYear())}</b><span>일간과의 관계 · ${escapeHtml(link)}</span><p>${escapeHtml(advice)}</p></article>`;
    }).join('');
    const privateAnalysis=master?`<section class="saju-depth personal-reading"><p class="kicker">YOUR PERSONAL STAR MAP</p><h4>나에게 찾아오는 시간의 결</h4><p class="saju-note">띠만으로 고른 문구가 아니에요. 나의 일간과 실제 날짜의 간지 관계를 계산해, 일·관계·금전·돌봄의 네 갈래를 살펴봅니다.</p><div class="personal-periods" role="group" aria-label="개인별 운세 기간"><button type="button" class="selected" data-personal-period="daily">오늘</button><button type="button" data-personal-period="weekly">이번 주</button><button type="button" data-personal-period="monthly">이번 달</button><button type="button" data-personal-period="yearly">올해</button><button type="button" data-personal-period="date">날짜 선택</button></div><div class="personal-date-control" hidden><label for="personalFortuneDate">운세를 볼 날짜</label><input id="personalFortuneDate" type="date" value="${kstNow()}" min="1900-01-01" max="2099-12-31"></div><div id="personalFlowResult" class="personal-flow-result" aria-live="polite"></div></section>`:'';
    $('#sajuAdvanced').innerHTML=`${privateAnalysis}${seasonalMarkup}<section class="saju-depth"><p class="kicker">YOUR INNER PATTERN</p><h4>내 사주를 더 깊게 읽는 관계</h4><div class="saju-clues">${relationMarkup}</div><p class="saju-note">십성은 태어난 날의 천간을 기준으로 다른 천간의 관계를 읽는 전통 분류예요. 우열이나 성격을 확정하지 않아요.</p></section><section class="saju-depth"><p class="kicker">TEN-YEAR RHYTHM</p><h4>10년의 흐름 · 대운</h4>${cyclesMarkup}</section><section class="saju-depth"><p class="kicker">THE NEXT TWO YEARS</p><h4>올해와 내년의 기운 · 세운</h4><div class="saju-years">${yearStories}</div></section>`;
    if(master)initPersonalPeriods(dayStem,master);
    $('#sajuPlaceholder').hidden=true;$('#sajuResult').hidden=false;$('#sajuDialog').close();$('#sajuResult').scrollIntoView({behavior:'smooth',block:'center'});
    window.DalbitByeolha?.read(master?`전통 명리에서는 ${master.core}을 이 일간의 이미지로 읽어요. ${master.strength}도 소중한 강점이에요. ${master.work} ${elementMessage[dominant]} ${strongest?.name?`${strongest.name}의 의미도 함께 살펴보세요.`:''} ${cycleVoice}`:`${dayStemMessage[dayStem]} ${elementMessage[dominant]} ${cycleVoice}`);
  }

  /** 날짜의 실제 간지와 일간의 십성을 분리 계산하며 결과 문장은 버전 관리된 지식 DB에서 고릅니다. */
  function personalFlow(dayStem,master,period,dateString){
    const current=safeDate(dateString)?dateString:kstNow();
    const [y,m,d]=current.split('-').map(Number);
    const basis=new Date(Date.UTC(y,m-1,d,12));
    if(period==='weekly')basis.setUTCDate(basis.getUTCDate()-(basis.getUTCDay()+6)%7);
    if(period==='yearly')basis.setUTCMonth(6,1); // 입춘 경계 영향을 피한 해당 년도 세운 대표 간지
    const by=basis.getUTCFullYear(),bm=basis.getUTCMonth()+1,bd=basis.getUTCDate();
    const computed=koreanPillars(Solar.fromYmdHms(by,bm,bd,12,0,0));
    const pair=period==='yearly'?computed.year:period==='monthly'?computed.month:computed.day;
    const relation=koreanTenGod(LunarUtil.SHI_SHEN?.[dayStem+pair[0]]);
    const knowledge=sajuKnowledge?.tenGods?.[relation];
    if(!knowledge)throw Error('해석 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    const hint=sajuKnowledge?.branchHints?.[pair[1]]||'현재를 돌아보는';
    const labels={daily:'오늘',weekly:'이번 주',monthly:'이번 달',yearly:`${by}년`,date:'선택한 날'};
    const domain=[['일·공부','work'],['관계·사랑','love'],['금전·생활','money'],['마음 돌봄','wellbeing']];
    const entries=domain.map(([title,key])=>({title,message:`${master[key].replace('이번 주',labels[period])} ${knowledge[key]}`}));
    return {period:labels[period],source:`나의 일간 ${master.name}(${dayStem}) × ${pair} · ${relation}`,theme:knowledge.theme,hint,lead:`${hint} 흐름과 ${knowledge.theme}의 상징이 만나요. ${knowledge.core}이라는 전통적 의미를 함께 돌아볼 수 있어요.`,entries};
  }
  function initPersonalPeriods(dayStem,master){
    const holder=$('#sajuAdvanced'),output=holder.querySelector('#personalFlowResult'),picker=holder.querySelector('#personalFortuneDate'),control=holder.querySelector('.personal-date-control');
    const render=(period,announce=false)=>{
      try{
        const story=personalFlow(dayStem,master,period,period==='date'?picker.value:kstNow());
        output.innerHTML=`<div class="personal-flow-head"><small>${escapeHtml(story.period)}의 흐름 · ${escapeHtml(story.theme)}</small><p>${paragraph(story.lead)}</p></div><div class="personal-domain-grid">${story.entries.map(({title,message})=>`<article class="personal-domain"><span>${escapeHtml(title)}</span><p>${paragraph(message)}</p></article>`).join('')}</div><details class="personal-calculation"><summary>어떤 기준으로 풀었나요?</summary><p>${escapeHtml(story.source)}</p><p>24절기 기준으로 계산된 날짜 간지와 나의 일간 사이의 전통 십성 관계를 사용했어요. 미래 사건이나 성공 가능성을 수치로 예측하는 기능은 아니에요.</p></details>`;
        if(announce)window.DalbitByeolha?.read(`${story.period}의 이야기입니다. ${story.lead} ${story.entries.map(x=>`${x.title}. ${x.message}`).join(' ')}`);
      }catch(e){output.textContent=e.message||'날짜를 확인해 주세요.';}
    };
    holder.querySelectorAll('[data-personal-period]').forEach(button=>button.addEventListener('click',()=>{
      holder.querySelectorAll('[data-personal-period]').forEach(x=>{x.classList.toggle('selected',x===button);x.setAttribute('aria-pressed',String(x===button));});
      const period=button.dataset.personalPeriod;control.hidden=period!=='date';render(period,true);
    }));
    picker.addEventListener('change',()=>render('date',true));
    render('daily');
  }

  // 각 대아르카나 22장 + 소아르카나 56장 = 78장. 카드와 해석은 창작된 한국어 콘텐츠입니다.
  const major = [
    ['바보','The Fool','✧','순수한 시작','새로운 길이 열리고 있어요. 완벽한 준비보다 호기심을 믿고 작은 발걸음을 내디뎌 보세요.','성급한 출발이나 무모함을 살펴보세요. 멈춰서 필요한 준비를 다시 확인하면 좋아요.'],
    ['마법사','The Magician','✦','창조와 실행','이미 가진 능력과 자원을 연결하면 생각을 현실로 옮길 수 있어요.','가능성만 말로 남기지 말고 집중할 한 가지를 정해 보세요.'],
    ['여사제','The High Priestess','☾','직관과 지혜','답을 서두르기보다 내면의 목소리와 숨은 맥락에 귀를 기울여 보세요.','모호한 느낌을 사실처럼 확신하지 말고 한 번 더 확인해 보세요.'],
    ['여황제','The Empress','❀','풍요와 돌봄','관계와 아이디어를 정성껏 가꾸는 시기예요. 스스로에게도 따뜻함을 나눠 주세요.','돌봄이 지나쳐 자신을 소진하지 않도록 경계를 세워보세요.'],
    ['황제','The Emperor','♜','질서와 책임','분명한 기준과 계획이 안정감을 만들어요. 지금 필요한 구조를 세워 보세요.','모든 것을 통제하려는 마음은 없는지 유연성을 돌아보세요.'],
    ['교황','The Hierophant','✢','배움과 전통','믿을 만한 경험과 조언에서 배울 점을 찾아보세요.','익숙한 규칙이 지금도 꼭 필요한지 새롭게 질문해 보세요.'],
    ['연인','The Lovers','♡','선택과 연결','가치관이 맞닿는 관계나 중요한 선택 앞에서 진심을 살펴보세요.','눈앞의 끌림뿐 아니라 장기적인 조화를 생각해 보세요.'],
    ['전차','The Chariot','♞','의지와 전진','목표를 분명히 하고 방향을 지키면 원하는 곳에 가까워질 수 있어요.','속도만 앞서지 않았는지, 목표와 방법이 맞는지 점검해 보세요.'],
    ['힘','Strength','♌','용기와 인내','부드러운 용기가 큰 힘을 내는 때예요. 자신과 타인을 다정하게 대하세요.','억지로 버티고 있다면 도움을 요청해도 괜찮아요.'],
    ['은둔자','The Hermit','✶','성찰과 탐색','소란에서 잠시 벗어나 깊이 생각할 시간을 가져보세요.','혼자 해결하려는 마음이 지나치지 않았는지 살펴보세요.'],
    ['운명의 수레바퀴','Wheel of Fortune','☸','변화의 순환','예상치 못한 흐름에도 배울 기회가 있어요. 바뀌는 리듬에 유연하게 대응하세요.','우연에만 기대기보다 자신이 조절할 수 있는 부분에 집중해 보세요.'],
    ['정의','Justice','⚖','균형과 진실','한쪽의 감정보다 사실과 공정함을 기준 삼아 보세요.','자신이나 상대에게 너무 엄격한 잣대를 들이대고 있지는 않나요?'],
    ['매달린 사람','The Hanged Man','◇','관점의 전환','잠깐 멈추면 다른 가능성이 보일 수 있어요. 속도를 늦추는 것도 선택이에요.','기다림을 핑계로 필요한 결정을 미루고 있지는 않은지 살펴보세요.'],
    ['죽음','Death','☽','끝과 재탄생','낡은 습관을 정리할 때 새로운 문이 열릴 수 있어요. 상징적인 변화의 카드예요.','놓아야 할 것을 붙잡고 있다면 조금씩 정리해 보세요.'],
    ['절제','Temperance','⚗','조화와 회복','다른 것들을 부드럽게 조율하며 적당한 균형점을 찾아보세요.','지금의 불균형을 탓하기보다 생활의 리듬부터 조정해 보세요.'],
    ['악마','The Devil','♄','집착의 자각','무엇에 끌려가는지 알아차리는 순간 선택할 자유가 생겨요.','습관과 집착을 가볍게 보지 말고 도움받을 방법을 찾아보세요.'],
    ['탑','The Tower','⚡','깨달음과 재구성','기존 생각이 흔들리면 더 단단한 기반을 만들 기회도 생겨요.','갑작스러운 감정에 휩쓸리지 말고 사실부터 차근차근 살펴보세요.'],
    ['별','The Star','✷','희망과 영감','조용한 희망이 다시 피어나는 흐름이에요. 회복을 위한 작은 시도를 해보세요.','바라는 모습과 현실 사이에 실천할 수 있는 연결점을 만들어 보세요.'],
    ['달','The Moon','☽','감정과 불확실성','모든 것이 분명하지 않아도 괜찮아요. 감정을 관찰하고 서둘러 단정하지 마세요.','걱정이 사실을 가리지 않도록 확인 가능한 단서에 집중해 보세요.'],
    ['태양','The Sun','☼','기쁨과 생명력','나의 밝은 면을 드러낼 기회예요. 기쁨을 주변과 나눠 보세요.','항상 밝아야 한다는 부담은 내려놓고 솔직한 감정을 인정해 보세요.'],
    ['심판','Judgement','♧','재평가와 성장','지난 경험을 돌아보고 자신에게 필요한 다음 장을 선택해 보세요.','과거에 대한 자책보다 배운 점을 지금에 적용해 보세요.'],
    ['세계','The World','◎','완성과 연결','한 단계의 마무리를 축하해 주세요. 쌓아온 노력이 새로운 시작을 도울 거예요.','완벽한 끝을 기다리기보다 지금까지의 성취를 인정해 보세요.']
  ];
  const suits = [
    {kr:'완드',en:'Wands',symbol:'♜',essence:'열정과 행동',up:'하고 싶은 일을 작은 행동으로 옮겨 보세요.',down:'열정이 조급함으로 바뀌지 않도록 속도를 살펴보세요.'},
    {kr:'컵',en:'Cups',symbol:'♡',essence:'감정과 관계',up:'마음을 솔직하고 부드럽게 전하는 것이 중요해요.',down:'기분에 휩쓸리지 않고 나와 상대의 마음을 함께 살펴보세요.'},
    {kr:'소드',en:'Swords',symbol:'⚔',essence:'생각과 판단',up:'사실을 분명히 하고 차분하게 판단해 보세요.',down:'지나친 걱정과 생각의 반복에서 잠시 거리를 두어 보세요.'},
    {kr:'펜타클',en:'Pentacles',symbol:'✥',essence:'현실과 안정',up:'현실적인 계획과 꾸준한 실천이 도움이 돼요.',down:'당장의 결과만 보지 말고 기반을 돌아보세요.'}
  ];
  const ranks=[['에이스','Ace','새로운 씨앗'],['2','Two','선택과 조화'],['3','Three','협력과 확장'],['4','Four','안정과 정리'],['5','Five','변화와 도전'],['6','Six','나눔과 회복'],['7','Seven','점검과 용기'],['8','Eight','전진과 집중'],['9','Nine','성찰과 성취'],['10','Ten','완성과 무게'],['시종','Page','배움과 소식'],['기사','Knight','움직임과 탐색'],['여왕','Queen','돌봄과 성숙'],['왕','King','책임과 통솔']];
  // 22장 메이저 + 56장 마이너, 78장 모두 각각 독립적으로 그린 WebP 카드 원화입니다.
  const majorArt=(i)=>`./assets/tarot-major-${'abcd'[Math.floor(i/6)]}-${i%6}.webp`;
  const suitArt=['./assets/tarot-major-d-4.webp','./assets/tarot-major-d-5.webp','./assets/tarot-minor-e-0.webp','./assets/tarot-minor-e-1.webp'];
  const courtArt=['./assets/tarot-minor-e-2.webp','./assets/tarot-minor-e-3.webp','./assets/tarot-minor-e-4.webp','./assets/tarot-minor-e-5.webp'];
  const minorArt=(si,ri)=>`./assets/tarot-${['wands','cups','swords','pentacles'][si]}-${ri<8?'a':'b'}-${String(ri<8?ri:ri-8).padStart(2,'0')}.webp`;
  const makeTarotDeck=()=>[...major.map((r,i)=>({id:i,kr:r[0],en:r[1],symbol:r[2],theme:r[3],up:r[4],down:r[5],art:majorArt(i),major:true})),...suits.flatMap((s,si)=>ranks.map((r,ri)=>({id:22+si*14+ri,kr:`${s.kr} ${r[0]}`,en:`${r[1]} of ${s.en}`,symbol:s.symbol,theme:`${s.essence} · ${r[2]}`,up:`${r[2]}의 상징이 ${s.essence}의 영역과 만나요. ${s.up}`,down:`${r[2]}의 의미가 잠시 막혀 있을 수 있어요. ${s.down}`,art:minorArt(si,ri),suitArt:suitArt[si],rank:ri+1,major:false})))];
  const tarotDeck=makeTarotDeck();
  // 마이너 카드 해석은 카드마다 고유한 장면과 의미를 가진 독립 JSON이 기준입니다.
  // 네트워크가 끊기면 내장 문구로 안전하게 돌아가되, 카드를 뽑기 전에 로딩을 기다립니다.
  let tarotReadingsReady=Promise.resolve();
  async function loadTarotReadings(){
    try{
      const response=await fetch('./data/tarot-minor-readings.json',{cache:'default'});
      if(!response.ok)throw Error('readings unavailable');
      const data=await response.json();
      const validCard=row=>Array.isArray(row)&&row.length===3&&row.every((value,index)=>typeof value==='string'&&value.trim().length>=(index===0?4:35)&&value.length<360);
      if(data.schemaVersion!==1||!Array.isArray(data.cards)||data.cards.length!==4||!data.cards.every(suit=>Array.isArray(suit)&&suit.length===14&&suit.every(validCard)))throw Error('invalid readings');
      data.cards.forEach((suit,si)=>suit.forEach(([theme,up,down],ri)=>{
        const card=tarotDeck[22+si*14+ri];
        card.theme=theme;card.up=up;card.down=down;
      }));
    }catch{ /* 오프라인에서는 내장된 기본 풀이로 안전하게 대체합니다. */ }
  }
  // AI 놀이터 이식 시 자산 변경은 버전 관리된 JSON 데이터만 교체하면 됩니다.
  // 네트워크/JSON 오류에서는 위 기본 경로를 유지하므로 리딩 자체가 중단되지 않습니다.
  async function loadTarotArtworkManifest(){
    try{
      const response=await fetch('./data/tarot-artwork.json',{cache:'default'});
      if(!response.ok)throw Error('manifest unavailable');
      const data=await response.json();
      const validPath=path=>typeof path==='string'&&/^\.\/assets\/[a-z0-9-]+\.webp$/.test(path);
      const validList=(list,count)=>Array.isArray(list)&&list.length===count&&list.every(validPath);
      if(data.schemaVersion!==1||!validList(data.majorArtwork,22)||!validList(data.suitArtwork,4)||!validList(data.courtArtwork,4)||!Array.isArray(data.minorArtwork)||data.minorArtwork.length!==4||!data.minorArtwork.every(list=>validList(list,14)))throw Error('invalid manifest');
      tarotDeck.forEach(card=>{
        if(card.major){card.art=data.majorArtwork[card.id];return;}
        const suitIndex=Math.floor((card.id-22)/14),rankIndex=(card.id-22)%14;
        card.suitArt=data.suitArtwork[suitIndex];
        card.art=data.minorArtwork[suitIndex][rankIndex];
      });
    }catch{ /* 정적 내장 목록이 안전한 폴백입니다. */ }
  }
  function renderTarotArtwork(c){
    const rank=c.major?'':`<span class="arcana-rank" aria-hidden="true">${c.rank<=10?String(c.rank).padStart(2,'0'):['PAGE','KNIGHT','QUEEN','KING'][c.rank-11]}</span>`;
    const suit=c.major||c.rank<=10?'':`<img class="arcana-suit-mark" src="${c.suitArt}" alt="" loading="lazy" decoding="async">`;
    return `<img class="arcana-illustration ${c.major?'arcana-major':'arcana-minor'}" src="${c.art}" alt="" loading="eager" decoding="async">${rank}${suit}`;
  }
  const secureRand=(n)=>{if(globalThis.crypto?.getRandomValues){const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]%n;}return Math.floor(Math.random()*n);};
  function shuffled(arr){const list=[...arr];for(let i=list.length-1;i>0;i--){const j=secureRand(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}
  let tarotCategory='general',tarotCount=1,tarotPool=[],drawn=[],tarotPrompt='';
  let ritualEpoch=0,ritualTimers=[],ritualPriorOverflow='';
  const tarotPositions=(count)=>count===1?['오늘의 메시지']:['현재의 상황','도움이 되는 조언','앞으로의 가능성'];
  function setTarotStep(step){
    $('#tarotSettings').hidden=step!=='settings';
    $('#tarotDraw').hidden=step!=='draw';
    $('#tarotResults').hidden=step!=='results';
    $('#tarot').dataset.stage=step;
  }
  function cancelSingleReveal(){
    ritualEpoch++;
    ritualTimers.forEach(clearTimeout);ritualTimers=[];
    $('#singleReveal').hidden=true;$('#singleReveal').removeAttribute('data-phase');
    document.body.style.overflow=ritualPriorOverflow;
  }
  function finishSingleReveal(){
    if($('#singleReveal').hidden)return;
    cancelSingleReveal();
    renderTarotResults(true);setTarotStep('results');
    $('#tarotResults').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
    $('#againTarot').focus({preventScroll:true});
  }
  function showSingleReveal(c){
    cancelSingleReveal();setTarotStep('ceremony');
    const scene=$('#singleReveal'),status=$('#ritualStatus');
    $('#ritualCardArt').innerHTML=`${renderTarotArtwork(c)}<span class="face-caption">${escapeHtml(c.en)}</span>`;
    scene.querySelector('.ritual-card-front').classList.toggle('reversed',c.reversed);
    scene.querySelector('.ritual-heartbeats').removeAttribute('data-beat');
    status.textContent='달빛이 카드 위에 내려앉고 있어요';
    scene.hidden=false;scene.dataset.phase='enter';
    ritualPriorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    $('#ritualSkip').focus({preventScroll:true});
    const epoch=ritualEpoch;
    const at=(delay,fn)=>ritualTimers.push(setTimeout(()=>{if(ritualEpoch===epoch&&!scene.hidden)fn();},delay));
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){finishSingleReveal();return;}
    at(90,()=>scene.dataset.phase='summon');
    at(630,()=>{scene.dataset.phase='heartbeat';status.textContent='두근… 당신의 선택에 별들이 응답해요';});
    at(1050,()=>{scene.querySelector('.ritual-heartbeats').dataset.beat='1';status.textContent='두근…';});
    at(1500,()=>{scene.querySelector('.ritual-heartbeats').dataset.beat='2';status.textContent='두근… 두근…';});
    at(1950,()=>{scene.querySelector('.ritual-heartbeats').dataset.beat='3';status.textContent='두근… 두근… 두근…';});
    at(2500,()=>{scene.dataset.phase='reveal';status.textContent='스르륵… 신비로운 문이 열려요';});
    at(3970,()=>{scene.dataset.phase='finale';status.textContent=`짠! ${c.kr} 카드가 당신에게 찾아왔어요 ✦`;});
    at(4780,finishSingleReveal);
  }
  function renderFan(){
    const visible=tarotPool.slice(0,9),count=visible.length,spread=window.innerWidth<520?235:620;
    $('#tarotFan').innerHTML=visible.map((card,i)=>{
      const offset=(i-(count-1)/2),tx=(offset*spread/(count-1||1)),rot=offset*5;
      return `<button type="button" class="fan-card" data-fan="${i}" aria-label="${i+1}번째 타로 카드 선택" style="--tx:${tx}px;--ty:${Math.abs(offset)*6}px;--rot:${rot}deg;--delay:${i*45}ms;z-index:${i+1}"><span class="tarot-back-art"><span class="back-orbit"></span><span class="back-sun">✺</span></span></button>`;
    }).join('');
    $('#tarotDrawTitle').textContent=`${tarotCount-drawn.length}장의 카드를 골라주세요`;
    $('#selectionDots').innerHTML=Array.from({length:tarotCount},(_,i)=>`<span class="${i<drawn.length?'filled':''}"></span>`).join('');
    $$('.fan-card').forEach(b=>b.addEventListener('click',()=>selectTarot(Number(b.dataset.fan))));
  }
  function selectTarot(index){
    if(drawn.length>=tarotCount)return;
    const card=tarotPool.splice(index,1)[0];if(!card)return;
    drawn.push({...card,reversed:secureRand(100)<35});
    if(drawn.length>=tarotCount){
      if(tarotCount===1)showSingleReveal(drawn[0]);
      else{renderTarotResults();setTarotStep('results');$('#tarotResults').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
    }
    else renderFan();
  }
  function renderTarotResults(alreadyRevealed=false){
    $('#tarotResultQuestion').textContent=tarotPrompt?`당신의 질문 · “${tarotPrompt}”`:'지금 이 순간, 마음에 닿는 이야기를 만나보세요.';
    const positions=tarotPositions(tarotCount);
    $('#drawnCards').classList.toggle('one-card',tarotCount===1);
    const readingParagraph=text=>String(text).split(/(?<=[.!?])\s+(?=[가-힣“])/u).map(sentence=>`<span class="reading-sentence">${escapeHtml(sentence)}</span>`).join('');
    $('#drawnCards').innerHTML=drawn.map((c,i)=>`<article class="drawn-card"><div class="drawn-label">✧ ${positions[i]}</div><div class="reading-card ${alreadyRevealed?'flipped':''}" role="img" aria-label="${escapeHtml(c.kr)} 타로카드"><div class="reading-card-inner"><div class="reading-back"><div class="tarot-back-art"><span class="back-orbit"></span><span class="back-sun">✺</span></div></div><div class="reading-front"><div class="tarot-face-art"><span class="face-arch"></span>${renderTarotArtwork(c)}<span class="face-caption">${escapeHtml(c.en)}</span></div></div></div></div><h4>${escapeHtml(c.kr)}</h4><div class="orientation">✧ ${escapeHtml(c.theme)}</div><p class="card-reading">${readingParagraph(c.reversed?c.down:c.up)}</p></article>`).join('');
    const categoryLabel={general:'지금 나에게 필요한',love:'관계의 마음을 살펴볼',work:'일과 배움의 방향을 되짚을',money:'현실적인 균형을 생각해 볼'}[tarotCategory];
    $('#tarotSummary').textContent=`✧ ${categoryLabel} 작은 힌트가 도착했어요. 혹시 마음이 무거웠다면 이 순간만큼은 조금 내려놓아도 괜찮아요. 카드는 정답을 강요하지 않아요. 당신에게 위로가 되는 한 문장만 조용히 간직해 보세요.`;
    window.DalbitByeolha?.read(drawn.map(c=>`${c.kr}. ${c.reversed?c.down:c.up}`).join(' '));
    if(!alreadyRevealed)requestAnimationFrame(()=>setTimeout(()=>$$('.reading-card').forEach((el,i)=>setTimeout(()=>el.classList.add('flipped'),i*260)),90));
  }
  function initTarot(){
    void loadTarotArtworkManifest();
    tarotReadingsReady=loadTarotReadings();
    $('#ritualParticles').innerHTML=Array.from({length:24},(_,i)=>`<i style="--angle:${i*15}deg;--travel:${145+(i%5)*20}px;--delay:${i%4*70}ms">${i%3===0?'✦':'✧'}</i>`).join('');
    $('#ritualSkip').addEventListener('click',finishSingleReveal);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#singleReveal').hidden){e.preventDefault();finishSingleReveal();}});
    $$('#tarotCategories button').forEach(b=>b.addEventListener('click',()=>{tarotCategory=b.dataset.category;$$('#tarotCategories button').forEach(x=>x.classList.toggle('selected',x===b));}));
    $$('#tarotCount button').forEach(b=>b.addEventListener('click',()=>{tarotCount=Number(b.dataset.count);$$('#tarotCount button').forEach(x=>x.classList.toggle('selected',x===b));}));
    $('#startTarot').addEventListener('click',async()=>{await tarotReadingsReady;cancelSingleReveal();tarotPrompt=$('#tarotQuestion').value.trim().slice(0,90);tarotPool=shuffled(tarotDeck);drawn=[];setTarotStep('draw');renderFan();});
    $('#resetTarotDraw').addEventListener('click',()=>{cancelSingleReveal();setTarotStep('settings');});
    $('#againTarot').addEventListener('click',()=>{
      cancelSingleReveal();tarotPool=shuffled(tarotDeck);drawn=[];setTarotStep('draw');renderFan();
      $('#tarotDraw').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
      $('#tarotDrawTitle').setAttribute('tabindex','-1');
      $('#tarotDrawTitle').focus({preventScroll:true});
    });
    $('#copyTarot').addEventListener('click',()=>copyText(`달빛운세 타로\n${tarotPrompt?`질문: ${tarotPrompt}\n`:''}${drawn.map((c,i)=>`${tarotPositions(tarotCount)[i]}: ${c.kr}\n${c.reversed?c.down:c.up}`).join('\n\n')}\n※ 자기성찰을 위한 타로 리딩`));
  }

  const seasons=[['봄','새싹의 계절','시작하고 싶은 일을 가볍게 시도해 보세요.'],['여름','활력의 계절','주변 사람들과 에너지를 나누되 무리하지 마세요.'],['가을','결실의 계절','차곡차곡 쌓인 경험을 돌아보고 정리해 보세요.'],['겨울','충전의 계절','한 해를 돌아보며 다음 걸음을 준비해 보세요.']];
  const annualStarts=['조용히 뿌리내린 계획이 조금씩 모습을 드러내는 한 해예요.','변화의 바람 속에서도 자신의 기준을 세우는 시간이 중요해요.','사람과의 연결에서 새로운 배움을 발견할 수 있는 한 해예요.','작은 실천들이 모여 큰 자신감이 되는 흐름이에요.','새로운 문을 열기 전에 지나온 길을 정리하는 지혜가 빛나요.'];
  const annualEnds=['특별한 순간만 기다리기보다 평범한 하루를 단단하게 가꾸어 보세요.','큰 기대와 함께 현실적인 목표를 세우면 마음이 한결 가벼워질 거예요.','나의 속도를 지키며 회복과 도전의 균형을 찾아보세요.','스스로를 응원하는 습관이 올해의 든든한 자산이 되어줄 거예요.'];
  function initNewyear(){
    const current=Number(kstNow().slice(0,4)),years=[current,current+1,current+2,current+3];
    $('#newyearYear').innerHTML=years.map(y=>`<option value="${y}" ${y===current+1?'selected':''}>${y}년</option>`).join('');
    $('#newyearZodiac').innerHTML=animals.map((a,i)=>`<option value="${i}" ${i===selectedZodiac?'selected':''}>${a.emoji} ${a.label}</option>`).join('');
    const updateVisual=()=>{$('#newyearTitle').textContent=$('#newyearYear').value;$('#bigYear').textContent=$('#newyearYear').value;};
    $('#newyearYear').addEventListener('change',updateVisual);updateVisual();
    $('#showNewyear').addEventListener('click',()=>{
      const year=Number($('#newyearYear').value),z=Number($('#newyearZodiac').value),key=`annual/${year}/${z}`,a=animals[z];
      $('#newyearResultTitle').textContent=`${year}년 ${a.label}, 새로운 장의 시작`;
      let personal='';
      if(recentSaju){
        const year8=Solar.fromYmdHms(year,7,1,12,0,0).getLunar().getEightChar(),relation=koreanTenGod(LunarUtil.SHI_SHEN[recentSaju.dayStem+year8.getYearGan()]);
        const master=sajuKnowledge?.dayMasters?.[recentSaju.dayStem],god=sajuKnowledge?.tenGods?.[relation];
        personal=`당신의 일간 ${recentSaju.dayStem}${master?`(${master.name})`:''}과 ${year}년의 간지 ${year8.getYear()}를 함께 보면, ${relation}의 상징을 만나요. ${god?`${god.core}. 관계에서는 ${god.love} 생활에서는 ${god.money}`:tenGodMessage[relation]||'변화 속에서 나의 중심을 살펴보세요.'} `;
      }
      $('#newyearResultText').textContent=`${personal}${choose(annualStarts,key,1)} ${choose(annualEnds,key,2)}`;
      $('#seasonGrid').innerHTML=seasons.map((s,i)=>`<article class="season-card"><span>✦ ${s[0]}</span><h4>${s[1]}</h4><p>${choose([s[2],opening[(mix(key,i)+i)%opening.length],closings[(mix(key,i+8)+i)%closings.length]],key,i+20)}</p></article>`).join('');
      $('#newyearAdvice').textContent=`올해의 작은 제안 · ${choose(closings,key,12)}`;
      $('#newyearResult').hidden=false;$('#newyearResult').scrollIntoView({behavior:'smooth',block:'center'});
      window.DalbitByeolha?.read(`${$('#newyearResultText').textContent} ${$('#newyearAdvice').textContent}`);
    });
  }

  // 궁합은 두 사람의 일간 오행을 비교하되 과학적 예측 점수가 아닌 상징적 대화 소재로 안내합니다.
  let coupleCopy=[];
  async function loadCoupleCopy(){
    try{const response=await fetch('./data/couple-copy.json');if(!response.ok)return;
      const data=await response.json();if(data.schemaVersion===1&&Array.isArray(data.messages)&&data.messages.length>=4)coupleCopy=data.messages;
    }catch{/* 내장 위로 문구로 표시 */}
  }
  function initCouple(){
    void loadCoupleCopy();
    ['A','B'].forEach(suffix=>{
      const select=$('#coupleCalendar'+suffix),leap=$('#coupleLeapLine'+suffix);
      const update=()=>{leap.hidden=select.value!=='lunar';if(leap.hidden)$('#coupleLeap'+suffix).checked=false;};
      select.addEventListener('change',update);update();
    });
    const readPerson=suffix=>{
      const date=$('#coupleBirth'+suffix).value;
      const cal=$('#coupleCalendar'+suffix).value;
      if(!safeDate(date,cal))throw Error('두 사람의 출생 연도·월·일을 모두 확인해 주세요.');
      const [year,month,day]=date.split('-').map(Number);
      if(year<1900||year>2099)throw Error('1900~2099년 생년월일을 입력해 주세요.');
      const birthTime=readBirthTime('#coupleTime'+suffix,'#coupleExactTime'+suffix),{hour,minute}=birthTime;
      let solar,lunar;
      if(cal==='lunar'){
        const calendarMonth=$('#coupleLeap'+suffix).checked?-month:month;
        lunar=Lunar.fromYmdHms(year,calendarMonth,day,hour,minute,0);solar=lunar.getSolar();
        if(lunar.getYear()!==year||lunar.getMonth()!==calendarMonth||lunar.getDay()!==day)throw Error('음력 생일이나 윤달 여부를 확인해 주세요.');}
      else{solar=Solar.fromYmdHms(year,month,day,hour,minute,0);lunar=solar.getLunar();
        if(solar.getYear()!==year||solar.getMonth()!==month||solar.getDay()!==day)throw Error('양력 생일을 확인해 주세요.');}
      const pillars=koreanPillars(solar),eight=pillars.localEight,stem=pillars.day?.[0]||'甲',gender=$('#coupleGender'+suffix).value;
      const name=$('#coupleName'+suffix).value.trim().slice(0,20)||'소중한 사람';
      let phase='';
      if(gender!=='unknown'){
        const todayYear=Number(kstNow().slice(0,4));
        const current=pillars.termEight.getYun(gender==='male'?1:0,2).getDaYun(12).slice(1).find(d=>d.getStartYear()<=todayYear&&todayYear<=d.getEndYear());
        if(current)phase=`${name}님의 전통 대운은 ${current.getGanZhi()} 흐름에 해당해요.`;
      }
      return {name,stem,dayBranch:pillars.day?.[1],element:stemElements[stem]??0,solarDate:solar.toYmd(),unknown:birthTime.unknown,phase};
    };
    $('#coupleForm').addEventListener('submit',event=>{
      event.preventDefault();
      if(typeof Solar==='undefined'||typeof Lunar==='undefined'){toast('간지 계산 자료를 먼저 불러와 주세요.');return;}
      let a,b;
      try{a=readPerson('A');b=readPerson('B');}catch(error){toast(error.message||'생년월일을 확인해 주세요.');return;}
      const key=[a.solarDate,b.solarDate].sort().join('|');
      const supporting=(a.element+1)%5===b.element||(b.element+1)%5===a.element;
      const difference=(a.element+2)%5===b.element||(b.element+2)%5===a.element;
      const relation=supporting?'함께 자라는 결':difference?'다름의 조율':'나란한 균형';
      const relationMessage=supporting?'서로의 강점을 북돋는 관계로 읽을 수 있어요. 받기만 하거나 주기만 하지 않도록 살펴보세요.':difference?'서로 다른 방식이 부딪칠 수 있지만, 그 차이를 이해하면 관계의 새로운 힘이 될 수 있어요.':'닮은 부분과 다른 부분을 조율하면서 함께 균형을 만들어갈 수 있어요.';
      const rules=sajuKnowledge?.branchRelations;
      const harmony=a.dayBranch!==b.dayBranch&&rules?.harmony?.some(pair=>pair.includes(a.dayBranch)&&pair.includes(b.dayBranch));
      const clash=a.dayBranch!==b.dayBranch&&rules?.clash?.some(pair=>pair.includes(a.dayBranch)&&pair.includes(b.dayBranch));
      const branchMessage=harmony?`두 사람의 일지 ${a.dayBranch}와 ${b.dayBranch}에는 전통적으로 연결을 상징하는 육합 관계가 있어요. ${rules.harmonyMessage}`:clash?`두 사람의 일지 ${a.dayBranch}와 ${b.dayBranch}에는 변화의 상징인 육충 관계가 있어요. ${rules.clashMessage}`:'두 사람의 일지는 대표적인 육합·육충 조합에 속하지 않아요. 그것만으로 관계의 깊이를 판단하지는 않아요.';
      const msg=coupleCopy.length?coupleCopy[mix(key,9)%coupleCopy.length]:{
        headline:'서로의 다름을 이해하는 시간이 소중해요',
        description:'어떤 날에는 닮은 점이, 어떤 날에는 다른 점이 두 사람에게 새로운 이야기를 건네기도 해요.',
        advice:'서로의 오늘을 한 번 더 다정하게 물어봐 주세요.'
      };
      $('#coupleHeadline').textContent=`${a.name}님과 ${b.name}님, ${msg.headline}`;
      $('#coupleScore').textContent=relation;
      $('#coupleDescription').textContent=`${a.name}님의 일간 ${a.stem}(${elementNames[a.element]})과 ${b.name}님의 일간 ${b.stem}(${elementNames[b.element]})을 오행으로 살펴보면, ${relationMessage}\n\n${branchMessage}\n\n${msg.description}`;
      const phaseMessage=[a.phase,b.phase].filter(Boolean).join(' ');
      $('#coupleAdvice').textContent=`달빛의 작은 제안 · ${msg.advice}${phaseMessage?`\n\n각자의 10년 흐름도 함께 살펴봤어요. ${phaseMessage}`:''}`;
      $('#coupleResult').hidden=false;$('#coupleDialog').close();
      $('#coupleResult').scrollIntoView({behavior:'smooth',block:'center'});
      window.DalbitByeolha?.read(`${msg.headline} ${$('#coupleDescription').textContent} ${$('#coupleAdvice').textContent}`);
    });
  }

  function initNavigation(){
    const toggle=$('#menuToggle'),nav=$('#mobileNav');
    toggle.addEventListener('click',()=>{nav.hidden=!nav.hidden;toggle.setAttribute('aria-expanded',String(!nav.hidden));toggle.setAttribute('aria-label',nav.hidden?'메뉴 열기':'메뉴 닫기');});
    $$('#mobileNav a').forEach(a=>a.addEventListener('click',()=>{nav.hidden=true;toggle.setAttribute('aria-expanded','false');}));
    const names=['home','zodiac','saju','tarot','couple','newyear'];
    const show=(name,updateHistory=false)=>{
      window.DalbitByeolha?.silence();
      const id=names.includes(name)?name:'home';
      if(id==='zodiac'&&document.body.dataset.view!=='zodiac')$('#zodiac').dataset.mobileStage='choose';
      $$('.view-screen').forEach(view=>{const isActive=view.id===id;view.hidden=!isActive;view.classList.toggle('is-active',isActive);if(isActive)view.scrollTop=0;});
      document.body.dataset.view=id;
      $$('.nav-link,.mobile-dock a,#mobileNav a').forEach(a=>{const active=a.getAttribute('href')===`#${id}`;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
      nav.hidden=true;toggle.setAttribute('aria-expanded','false');
      document.querySelector('main')?.scrollTo(0,0);
      if(updateHistory&&location.hash!==`#${id}`)history.pushState({view:id},'',`#${id}`);
    };
    $$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
      const id=(a.getAttribute('href')||'').slice(1);
      if(id==='services'||names.includes(id)){e.preventDefault();show(id==='services'?'home':id,true);}
    }));
    window.addEventListener('popstate',()=>show(location.hash.slice(1)));
    window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
    show(location.hash.slice(1));
    const openDialog=(button,dialog)=>$('#'+button)?.addEventListener('click',()=>$('#'+dialog)?.showModal());
    openDialog('openSajuDialog','sajuDialog');
    openDialog('openZodiacDialog','zodiacDialog');
    openDialog('openCoupleDialog','coupleDialog');
    $$('.moonlit-dialog').forEach(dialog=>{
      dialog.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
      dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    });
  }
  async function loadCopyManifests(){
    const useArray=(target,incoming,expected)=>{if(Array.isArray(incoming)&&incoming.length===expected&&incoming.every(x=>typeof x==='string'))target.splice(0,target.length,...incoming);};
    const load=async(path)=>{const response=await fetch(path,{cache:'default'});if(!response.ok)throw Error('data unavailable');const data=await response.json();if(data.schemaVersion!==1)throw Error('unknown data schema');return data;};
    const loadSaju=async()=>{
      const response=await fetch('./data/saju-knowledge.json',{cache:'default'});
      if(!response.ok)throw Error('saju DB unavailable');
      const data=await response.json();
      const masters='甲乙丙丁戊己庚辛壬癸',gods=['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
      if(data.schemaVersion!==2||!masters.split('').every(k=>data.dayMasters?.[k]&&['name','image','core','strength','shadow','work','love','money','wellbeing'].every(field=>typeof data.dayMasters[k][field]==='string'&&data.dayMasters[k][field].trim().length>0))||!gods.every(k=>data.tenGods?.[k]&&['core','theme','work','love','money','wellbeing'].every(field=>typeof data.tenGods[k][field]==='string'&&data.tenGods[k][field].trim().length>0)))throw Error('invalid saju DB schema');
      return data;
    };
    const outcomes=await Promise.allSettled([load('./data/fortune-copy.json'),load('./data/tarot-meanings.json'),load('./data/newyear-copy.json'),loadSaju()]);
    if(outcomes[0].status==='fulfilled'){
      const d=outcomes[0].value;
      useArray(headlines,d.headlines,10);useArray(opening,d.opening,8);useArray(closings,d.closings,8);useArray(reassurance,d.reassurance,6);
      useArray(palette,d.palette,10);useArray(directions,d.directions,6);useArray(elementMessage,d.elementMessage,5);
      if(d.dayStemMessage&&typeof d.dayStemMessage==='object'&&Object.keys(d.dayStemMessage).length===10)Object.assign(dayStemMessage,d.dayStemMessage);
    }
    if(outcomes[1].status==='fulfilled'){
      const d=outcomes[1].value;
      if(Array.isArray(d.major)&&d.major.length===22&&d.major.every(row=>Array.isArray(row)&&row.length===6))major.splice(0,major.length,...d.major);
      if(Array.isArray(d.suits)&&d.suits.length===4)suits.splice(0,suits.length,...d.suits);
      if(Array.isArray(d.ranks)&&d.ranks.length===14)ranks.splice(0,ranks.length,...d.ranks);
      tarotDeck.splice(0,tarotDeck.length,...makeTarotDeck());
    }
    if(outcomes[2].status==='fulfilled'){
      const d=outcomes[2].value;
      if(Array.isArray(d.seasons)&&d.seasons.length===4)seasons.splice(0,seasons.length,...d.seasons);
      useArray(annualStarts,d.annualStarts,5);useArray(annualEnds,d.annualEnds,4);
    }
    if(outcomes[3].status==='fulfilled')sajuKnowledge=outcomes[3].value;
    else console.warn('사주 해석 DB를 불러오지 못해 기존 계산형 해석으로 표시합니다.');
  }
  async function start(){
    await loadCopyManifests();
    if($('#currentYear'))$('#currentYear').textContent=kstNow().slice(0,4);
    initNavigation();initFortune();initTarot();initMoonDateInputs();initPreciseBirthTimes();initSaju();initNewyear();initCouple();
    if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
      const registerOffline=()=>navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{});
      if(document.readyState==='complete')registerOffline();
      else window.addEventListener('load',registerOffline,{once:true});
    }
    console.info('달빛운세: 78장 타로, 12띠 운세 및 사주 간지 계산 준비 완료.');
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
