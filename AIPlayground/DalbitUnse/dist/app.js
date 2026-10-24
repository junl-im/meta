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
  const kstParts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
  const kstNow = () => { const p = Object.fromEntries(kstParts.formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value])); return `${p.year}-${p.month}-${p.day}`; };
  const safeDate = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(`${iso}T12:00:00Z`));
  const isoOf = (date) => date.toISOString().slice(0,10);
  const hash = (value) => {let h=2166136261;for(const ch of String(value)){h ^= ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  const mix = (key,n) => hash(`${key}|${n}|달빛운세`);
  const choose = (arr,key,n) => arr[mix(key,n)%arr.length];
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    $$('.animal-button').forEach(b=>b.addEventListener('click',()=>{selectedZodiac=Number(b.dataset.animal);try{localStorage.setItem('moonlit-zodiac',String(selectedZodiac));}catch{}drawZodiacGrid();updateFortune();}));
  }
  function fortuneFor(zodiac,period,seed){
    const key=`${zodiac}/${period}/${seed}`;
    const score=3+mix(key,1)%3; // 3~5점: 가벼운 긍정형 운세 콘텐츠
    const categories=[0,1,2,3].map((i)=>45+mix(key,20+i)%51);
    return {score,categories,headline:choose(headlines,key,2),description:`${choose(opening,key,3)} ${choose(closings,key,4)}`,color:choose(palette,key,5),number:1+mix(key,6)%9,direction:choose(directions,key,7)};
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
    $('#findZodiac').addEventListener('click',()=>{const y=Number($('#birthYear').value);if(!Number.isInteger(y)||y<1900||y>2100){toast('1900~2100 사이 출생 연도를 입력해 주세요.');return;}selectedZodiac=zodiacFromYear(y);drawZodiacGrid();updateFortune();toast('연도 기준으로 찾았어요. 1~2월생은 음력 설을 확인해 주세요.');});
    $('#copyFortune').addEventListener('click',()=>{const a=animals[selectedZodiac],f=fortuneFor(selectedZodiac,selectedPeriod,periodSeed());copyText(`달빛운세 ${a.label} ${periodLabels[selectedPeriod]} 운세\n${f.headline}\n${f.description}\n행운의 색: ${f.color} · 숫자: ${f.number} · 방향: ${f.direction}\n※ 재미로 보는 무료 운세`);});
  }

  // 사주는 lunar-javascript의 24절기·간지 알고리즘을 사용합니다.
  function initSaju(){
    const calButtons=$$('#sajuCalendarType button');let calendar='solar';
    calButtons.forEach(btn=>btn.addEventListener('click',()=>{calendar=btn.dataset.cal;calButtons.forEach(x=>{x.classList.toggle('selected',x===btn);x.setAttribute('aria-checked',String(x===btn));});$('#leapLine').hidden=calendar!=='lunar';}));
    $('#sajuForm').addEventListener('submit',e=>{
      e.preventDefault(); const input=$('#sajuBirth').value,time=$('#sajuTime').value,unknown=time==='unknown';
      if(!safeDate(input)){toast('올바른 생년월일을 입력해 주세요.');return;}
      if(typeof Solar==='undefined'||typeof Lunar==='undefined'){toast('사주 계산 자료를 불러오지 못했어요. 다시 접속해 주세요.');return;}
      const [year,month,day]=input.split('-').map(Number);
      if(year<1900||year>2099){toast('1900~2099 사이 생년월일을 입력해 주세요.');return;}
      const hour=unknown?12:Number(time); let solar,lunar;
      try{
        if(calendar==='lunar'){
          const lunarMonth=$('#sajuLeap').checked?-month:month;
          lunar=Lunar.fromYmdHms(year,lunarMonth,day,hour,0,0);solar=lunar.getSolar();
          if(lunar.getYear()!==year||lunar.getMonth()!==lunarMonth||lunar.getDay()!==day)throw Error('음력 날짜를 확인해 주세요.');
        }else{solar=Solar.fromYmdHms(year,month,day,hour,0,0);lunar=solar.getLunar();
          if(solar.getYear()!==year||solar.getMonth()!==month||solar.getDay()!==day)throw Error('양력 날짜를 확인해 주세요.');}
      }catch(err){toast(`해당 날짜를 계산할 수 없어요. ${err.message||''}`);return;}
      try{renderSaju(solar,lunar,unknown);}catch{toast('사주 계산 중 오류가 발생했어요. 날짜와 시간을 확인해 주세요.');}
    });
  }
  function renderSaju(solar,lunar,unknown){
    const eight=lunar.getEightChar(),pairs=[eight.getYear(),eight.getMonth(),eight.getDay(),unknown?null:eight.getTime()];
    const counts=[0,0,0,0,0],labels=['년주','월주','일주','시주'];
    pairs.forEach(pair=>{if(!pair)return;for(const c of pair){let idx=stemElements[c]??branchElements[c];if(idx!==undefined)counts[idx]++;}});
    const name=$('#sajuName').value.trim().slice(0,20),total=counts.reduce((a,b)=>a+b,0),dominant=counts.indexOf(Math.max(...counts));
    $('#sajuResultTitle').textContent=`${name?name+'님의':'나의'} 사주팔자`;
    $('#sajuDateInfo').textContent=`양력 ${solar.getYear()}.${solar.getMonth()}.${solar.getDay()} · 음력 ${lunar.getYear()}년 ${Math.abs(lunar.getMonth())}월 ${lunar.getDay()}일${lunar.getMonth()<0?' (윤달)':''}${unknown?' · 출생 시간 미상':''}`;
    $('#pillarGrid').innerHTML=pairs.map((p,i)=>`<div class="pillar"><span class="pillar-label">${labels[i]}</span><span class="pillar-gan">${p?p[0]:'—'}</span><span class="pillar-ji">${p?p[1]:'—'}</span><small>${p?'천간 · 지지':'시간 미상'}</small></div>`).join('');
    $('#elementsChart').innerHTML=`<h4>오행의 분포 <small style="font:400 10px var(--sans);color:#a69bb9">(천간·지지의 대표 오행)</small></h4>`+counts.map((v,i)=>`<div class="element-line"><span>${elementNames[i]}</span><div class="element-track"><i style="width:${total?(v/total)*100:0}%;background:${elementColors[i]}"></i></div><b>${v}</b></div>`).join('');
    const dayStem=pairs[2]?.[0]||'甲';
    $('#sajuReading').innerHTML=`<b>✧ 일간 ${escapeHtml(dayStem)}의 이야기</b><br>${escapeHtml(dayStemMessage[dayStem]||'나만의 중심을 가꾸는 상징으로 읽을 수 있어요.')}<br><br><b>✧ 두드러지는 오행 — ${elementNames[dominant]}</b><br>${escapeHtml(elementMessage[dominant])}${unknown?'<br><br>태어난 시간을 알면 시주까지 포함해 다시 확인할 수 있어요.':''}`;
    $('#sajuPlaceholder').hidden=true;$('#sajuResult').hidden=false;$('#sajuResult').scrollIntoView({behavior:'smooth',block:'center'});
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
  const tarotDeck=[...major.map((r,i)=>({id:i,kr:r[0],en:r[1],symbol:r[2],theme:r[3],up:r[4],down:r[5]})),...suits.flatMap((s,si)=>ranks.map((r,ri)=>({id:22+si*14+ri,kr:`${s.kr} ${r[0]}`,en:`${r[1]} of ${s.en}`,symbol:s.symbol,theme:`${s.essence} · ${r[2]}`,up:`${r[2]}의 상징이 ${s.essence}의 영역과 만나요. ${s.up}`,down:`${r[2]}의 의미가 잠시 막혀 있을 수 있어요. ${s.down}`})))];
  const secureRand=(n)=>{if(globalThis.crypto?.getRandomValues){const v=new Uint32Array(1);crypto.getRandomValues(v);return v[0]%n;}return Math.floor(Math.random()*n);};
  function shuffled(arr){const list=[...arr];for(let i=list.length-1;i>0;i--){const j=secureRand(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}
  let tarotCategory='general',tarotCount=1,tarotPool=[],drawn=[],tarotPrompt='';
  const tarotPositions=(count)=>count===1?['오늘의 메시지']:['현재의 상황','도움이 되는 조언','앞으로의 가능성'];
  function setTarotStep(step){$('#tarotSettings').hidden=step!=='settings';$('#tarotDraw').hidden=step!=='draw';$('#tarotResults').hidden=step!=='results';}
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
    if(drawn.length>=tarotCount){renderTarotResults();setTarotStep('results');$('#tarotResults').scrollIntoView({behavior:'smooth',block:'center'});}
    else renderFan();
  }
  function renderTarotResults(){
    $('#tarotResultQuestion').textContent=tarotPrompt?`당신의 질문 · “${tarotPrompt}”`:'지금 이 순간, 마음에 닿는 이야기를 만나보세요.';
    const positions=tarotPositions(tarotCount);
    $('#drawnCards').classList.toggle('one-card',tarotCount===1);
    $('#drawnCards').innerHTML=drawn.map((c,i)=>`<article class="drawn-card"><div class="drawn-label">✧ ${positions[i]}</div><div class="reading-card" role="img" aria-label="${escapeHtml(c.kr)}, ${c.reversed?'역방향':'정방향'}"><div class="reading-card-inner"><div class="reading-back"><div class="tarot-back-art"><span class="back-orbit"></span><span class="back-sun">✺</span></div></div><div class="reading-front ${c.reversed?'reversed':''}"><div class="tarot-face-art"><span class="face-arch"></span><span class="face-stars">✧ ✦</span><span class="face-symbol">${c.symbol}</span><span class="face-caption">${escapeHtml(c.en)}</span></div></div></div></div><h4>${escapeHtml(c.kr)}</h4><div class="orientation">${c.reversed?'↻ 역방향':'↑ 정방향'} · ${escapeHtml(c.theme)}</div><p class="card-reading">${escapeHtml(c.reversed?c.down:c.up)}</p></article>`).join('');
    const categoryLabel={general:'지금 나에게 필요한',love:'관계의 마음을 살펴볼',work:'일과 배움의 방향을 되짚을',money:'현실적인 균형을 생각해 볼'}[tarotCategory];
    $('#tarotSummary').textContent=`✧ ${categoryLabel} 작은 힌트가 도착했어요. 카드가 보여주는 상징을 정답으로 여기기보다, 지금 내 마음에서 가장 크게 울리는 한 문장을 골라보세요.`;
    requestAnimationFrame(()=>setTimeout(()=>$$('.reading-card').forEach((el,i)=>setTimeout(()=>el.classList.add('flipped'),i*260)),90));
  }
  function initTarot(){
    $$('#tarotCategories button').forEach(b=>b.addEventListener('click',()=>{tarotCategory=b.dataset.category;$$('#tarotCategories button').forEach(x=>x.classList.toggle('selected',x===b));}));
    $$('#tarotCount button').forEach(b=>b.addEventListener('click',()=>{tarotCount=Number(b.dataset.count);$$('#tarotCount button').forEach(x=>x.classList.toggle('selected',x===b));}));
    $('#startTarot').addEventListener('click',()=>{tarotPrompt=$('#tarotQuestion').value.trim().slice(0,90);tarotPool=shuffled(tarotDeck);drawn=[];setTarotStep('draw');renderFan();});
    $('#resetTarotDraw').addEventListener('click',()=>setTarotStep('settings'));
    $('#againTarot').addEventListener('click',()=>{tarotPool=shuffled(tarotDeck);drawn=[];setTarotStep('draw');renderFan();});
    $('#copyTarot').addEventListener('click',()=>copyText(`달빛운세 무료 타로\n${tarotPrompt?`질문: ${tarotPrompt}\n`:''}${drawn.map((c,i)=>`${tarotPositions(tarotCount)[i]}: ${c.kr} (${c.reversed?'역방향':'정방향'})\n${c.reversed?c.down:c.up}`).join('\n\n')}\n※ 자기성찰을 위한 타로 리딩`));
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
      $('#newyearResultText').textContent=`${choose(annualStarts,key,1)} ${choose(annualEnds,key,2)}`;
      $('#seasonGrid').innerHTML=seasons.map((s,i)=>`<article class="season-card"><span>✦ ${s[0]}</span><h4>${s[1]}</h4><p>${choose([s[2],opening[(mix(key,i)+i)%opening.length],closings[(mix(key,i+8)+i)%closings.length]],key,i+20)}</p></article>`).join('');
      $('#newyearAdvice').textContent=`올해의 작은 제안 · ${choose(closings,key,12)}`;
      $('#newyearResult').hidden=false;$('#newyearResult').scrollIntoView({behavior:'smooth',block:'center'});
    });
  }

  function initNavigation(){
    const toggle=$('#menuToggle'),nav=$('#mobileNav');
    toggle.addEventListener('click',()=>{nav.hidden=!nav.hidden;toggle.setAttribute('aria-expanded',String(!nav.hidden));toggle.setAttribute('aria-label',nav.hidden?'메뉴 열기':'메뉴 닫기');});
    $$('#mobileNav a').forEach(a=>a.addEventListener('click',()=>{nav.hidden=true;toggle.setAttribute('aria-expanded','false');}));
    const sections=$$('main section[id]');
    const observer=new IntersectionObserver(entries=>{const current=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!current)return;$$('.nav-link').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===`#${current.target.id}`));},{rootMargin:'-25% 0px -55% 0px'});
    sections.forEach(s=>observer.observe(s));
  }
  function start(){
    $('#currentYear').textContent=kstNow().slice(0,4);
    initNavigation();initFortune();initTarot();initSaju();initNewyear();
    console.info('달빛운세: 78장 타로, 12띠 운세 및 사주 간지 계산 준비 완료.');
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
