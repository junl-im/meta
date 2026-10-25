import {test,expect} from '@playwright/test';

const playground=process.env.AI_CLEANER_TEST_URL||'http://127.0.0.1:4173/ai-cleaner/';

test('AI 놀이터에서 내부 달빛운세로 이동하고 모바일 메뉴로 돌아온다',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await page.goto(playground);
  await expect(page.locator('#homeTool')).toBeVisible();
  await expect(page.locator('.workspaceNav')).toBeHidden();
  await expect(page.locator('.homeWorldGrid a[href="../AIPlayground/DalbitUnse/dist/"]')).toBeVisible();
  await page.locator('.homeToolCard[data-open-tool="text"]').click();
  await expect(page.locator('#openDalbit')).toBeVisible();
  await expect(page.locator('#openMastering')).toHaveAttribute('href',/foxbear-mastering-studio/);
  await expect(page.locator('#openSorion')).toHaveAttribute('href',/AI-/);
  await expect(page.locator('#openRanipang')).toHaveAttribute('href',/cardville/);
  const layout=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,studio:[...document.querySelectorAll('#studioExternalRow>.studioGroup')].map(el=>Math.round(el.getBoundingClientRect().top))}));
  expect(layout.width).toBeLessThanOrEqual(layout.viewport);
  expect(new Set(layout.studio).size).toBe(1);
  await page.locator('#openDalbit').click();
  expect(page.url()).toContain('/AIPlayground/DalbitUnse/dist/');
  await expect(page.locator('#saju')).toBeAttached();
  await page.locator('.mobile-dock .playground-dock').click();
  expect(page.url()).toContain('/ai-cleaner/');
  await expect(page.locator('#homeTool')).toBeVisible();
  await expect(page.locator('.workspaceNav')).toBeHidden();
});

for(const [width,height] of [[320,568],[390,844],[768,1024]])test('사주 결과 '+width+'x'+height+': 핵심 결과와 조작 유지',async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto(new URL('../AIPlayground/DalbitUnse/dist/',playground).href);
  await page.locator('.mobile-dock a[href="#saju"]').click();
  await page.locator('#openSajuDialog').click();
  await page.locator('#sajuName').fill('테스트');
  await page.locator('#sajuForm .moon-year').fill('1992');
  await page.locator('#sajuForm .moon-year').dispatchEvent('change');
  await page.locator('#sajuForm .moon-month').selectOption('7');
  await page.locator('#sajuForm .moon-day').selectOption('15');
  await page.locator('#sajuTime').selectOption('12');
  await page.locator('#sajuForm button[type=submit]').click();
  await expect(page.locator('#sajuResult')).toBeVisible();
  await expect(page.locator('#pillarGrid .pillar')).toHaveCount(4);
  await expect(page.locator('#sajuElementSummary')).toContainText('오행의 결');
  await expect(page.locator('#sajuQuickText')).not.toBeEmpty();
  const bounds=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,again:document.querySelector('#saju .mobile-result-again').getBoundingClientRect().bottom,dock:document.querySelector('.mobile-dock').getBoundingClientRect().top}));
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewport);
  if(width===320)expect(bounds.again).toBeLessThan(bounds.dock);
  await page.locator('#sajuMore > summary').click();
  await expect(page.locator('#sajuMore')).toHaveAttribute('open','');
  await expect(page.locator('#elementsChart')).toBeVisible();
  await page.locator('#sajuMore > summary').click();
  await expect(page.locator('#sajuMore')).not.toHaveAttribute('open','');
  await page.locator('#saju .mobile-result-again').click();
  await expect(page.locator('#sajuDialog')).toBeVisible();
});

test('띠·신년·타로·궁합의 모바일 기본 흐름과 재선택이 유지된다',async({page})=>{
  await page.setViewportSize({width:375,height:667});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(new URL('../AIPlayground/DalbitUnse/dist/',playground).href);
  await page.locator('.mobile-dock a[href="#zodiac"]').click();
  await expect(page.locator('#zodiacGrid .animal-button')).toHaveCount(12);
  await page.locator('#zodiacGrid .animal-button').first().click();
  await expect(page.locator('#fortunePanel')).toBeVisible();
  await page.locator('.period-tab[data-period="weekly"]').click();
  await expect(page.locator('.period-tab[data-period="weekly"]')).toHaveAttribute('aria-selected','true');
  await page.locator('#zodiacBack').click();
  await expect(page.locator('#zodiacGrid')).toBeVisible();

  await page.locator('.mobile-dock a[href="#newyear"]').click();
  await page.locator('#showNewyear').click();
  await expect(page.locator('#newyearResult')).toBeVisible();
  await expect(page.locator('#seasonGrid')).toBeAttached();
  await page.locator('#newyearMore > summary').click();
  await expect(page.locator('#seasonGrid')).toBeVisible();
  await page.locator('#newyear .mobile-result-again').click();
  await expect(page.locator('#showNewyear')).toBeVisible();

  await page.locator('.mobile-dock a[href="#tarot"]').click();
  await page.locator('#startTarot').click();
  await expect(page.locator('#tarotFan .fan-card')).toHaveCount(9);
  await page.locator('#tarotFan .fan-card').last().click();
  await expect(page.locator('#tarotResults')).toBeVisible();
  await expect(page.locator('#againTarot')).toBeVisible();
  await page.locator('#againTarot').click();
  await expect(page.locator('#tarotFan .fan-card')).toHaveCount(9);

  await page.locator('.mobile-dock a[href="#couple"]').click();
  await page.locator('#openCoupleDialog').click();
  await expect(page.locator('#coupleDialog')).toBeVisible();
  await page.locator('#coupleDialog [data-close-dialog]').click();
  await expect(page.locator('#coupleDialog')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test('궁합 두 사람 입력 후 핵심 결과와 상세 보기·재입력이 유지된다',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('../AIPlayground/DalbitUnse/dist/',playground).href);
  await page.locator('.mobile-dock a[href="#couple"]').click();
  await page.locator('#openCoupleDialog').click();
  for(const [name,year] of [['A','1992'],['B','1995']]){
    await page.locator('#coupleName'+name).fill(name==='A'?'별':'달');
    await page.locator('#coupleForm [data-date-target="coupleBirth'+name+'"] .moon-year').fill(year);
    await page.locator('#coupleForm [data-date-target="coupleBirth'+name+'"] .moon-year').dispatchEvent('change');
    await page.locator('#coupleForm [data-date-target="coupleBirth'+name+'"] .moon-month').selectOption('7');
    await page.locator('#coupleForm [data-date-target="coupleBirth'+name+'"] .moon-day').selectOption('15');
  }
  await page.locator('#coupleForm button[type=submit]').click();
  await expect(page.locator('#coupleResult')).toBeVisible();
  await expect(page.locator('#coupleQuickText')).not.toBeEmpty();
  await page.locator('#coupleMore > summary').click();
  await expect(page.locator('#coupleDescription')).toBeVisible();
  await page.locator('#couple .mobile-result-again').click();
  await expect(page.locator('#coupleDialog')).toBeVisible();
});

test('화면 회전 후 메뉴와 사주 결과가 가로로 넘치지 않는다',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(new URL('../AIPlayground/DalbitUnse/dist/',playground).href);
  await page.locator('.mobile-dock a[href="#saju"]').click();
  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('#openSajuDialog')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(844);
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('배경음 설정은 유지되고 음성 낭독은 새 방문마다 기본 꺼짐이다',async({page})=>{
  await page.goto(new URL('../AIPlayground/DalbitUnse/dist/',playground).href);
  await page.locator('#musicToggle').click();
  await page.locator('#voiceToggle').click();
  await expect(page.locator('#musicToggle')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#voiceToggle')).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(page.locator('#musicToggle')).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('#voiceToggle')).toHaveAttribute('aria-pressed','false');
});

test('태블릿·PC 상단 메뉴도 내부 왕복 경로를 제공한다',async({page})=>{
  for(const width of [900,1024,1280]){
    await page.setViewportSize({width,height:800});
    await page.goto(playground);
    await page.locator('.homeToolCard[data-open-tool="text"]') .click();
    await expect(page.locator('#openDalbit')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#openDalbit').click();
    await expect(page.locator('.desktop-nav a[href="../../../ai-cleaner/"]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('.desktop-nav a[href="../../../ai-cleaner/"]').click();
    expect(page.url()).toContain('/ai-cleaner/');
  }
});


test('새 상단 메뉴는 주요 화면 너비에서 읽히고 가로로 넘치지 않는다',async({page})=>{
  for(const width of [320,360,375,390,412,430,768,1024,1280]){
    await page.setViewportSize({width,height:844});
    await page.goto(playground);
    await page.locator('.homeToolCard[data-open-tool="text"]') .click();
    const bounds=await page.evaluate(()=>({
      viewport:innerWidth,
      width:document.documentElement.scrollWidth,
      cards:[...document.querySelectorAll('.workspaceNav .studioCard')].map(el=>({right:el.getBoundingClientRect().right,visible:el.getBoundingClientRect().width>0}))
    }));
    expect(bounds.width,`${width}px document overflow`).toBeLessThanOrEqual(bounds.viewport);
    expect(bounds.cards.every(card=>card.visible&&card.right<=bounds.viewport+1),`${width}px menu clipping`).toBe(true);
    await expect(page.locator('.brandName')).toContainText('AI 놀이터');
  }
});

test('별하 브리지는 긴 결과를 나눠 읽고 다른 화면은 열지 않는다',async({page})=>{
  await page.route('**/AI-/bridge/byeolha.html',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><script>
    const channel='dalbit-byeolha';
    function wav(){const samples=800,view=new DataView(new ArrayBuffer(44+samples*2));
      function text(at,value){for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i))}
      text(0,'RIFF');view.setUint32(4,36+samples*2,true);text(8,'WAVE');text(12,'fmt ');
      view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
      view.setUint32(24,8000,true);view.setUint32(28,16000,true);view.setUint16(32,2,true);
      view.setUint16(34,16,true);text(36,'data');view.setUint32(40,samples*2,true);
      return new Blob([view.buffer],{type:'audio/wav'})}
    addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.channel!==channel)return;
      if(event.data.type==='speak'){
        parent.postMessage({channel,type:'progress',id:event.data.id,message:'chunk:'+event.data.text.length},location.origin);
        parent.postMessage({channel,type:'audio',id:event.data.id,blob:wav()},location.origin);
      }
    });
    parent.postMessage({channel,type:'ready'},location.origin);
  </script>`}));
  await page.goto(new URL('../AIPlayground/DalbitUnse/dist/',playground).href);
  await page.locator('#voiceToggle').click();
  await expect(page.locator('iframe[title="별하 음성 연결"]')).toHaveCount(1);
  const chunks=await page.evaluate(async()=>{
    const lengths=[];
    const onProgress=event=>{const match=String(event.detail).match(/^chunk:(\d+)$/);if(match)lengths.push(Number(match[1]))};
    window.addEventListener('sorion:byeolha-progress',onProgress);
    try{await window.SoriOn.voices.byeolha.speak({text:'가나다라마바사. '.repeat(190),voice:'byeolha',style:'mystical-gentle'});}
    finally{window.removeEventListener('sorion:byeolha-progress',onProgress)}
    return lengths;
  });
  expect(chunks.length).toBeGreaterThanOrEqual(3);
  expect(Math.max(...chunks)).toBeLessThanOrEqual(500);
  expect(chunks.reduce((sum,length)=>sum+length,0)).toBeGreaterThan(1000);
  expect(page.url()).toContain('/AIPlayground/DalbitUnse/dist/');
});
