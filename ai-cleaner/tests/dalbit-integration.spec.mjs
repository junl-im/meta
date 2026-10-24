import {test,expect} from '@playwright/test';

const playground=process.env.AI_CLEANER_TEST_URL||'http://127.0.0.1:4173/ai-cleaner/';

test('AI 놀이터에서 내부 달빛운세로 이동하고 모바일 메뉴로 돌아온다',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await page.goto(playground);
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
  await expect(page.locator('#toolTabText')).toBeVisible();
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
    await expect(page.locator('#openDalbit')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#openDalbit').click();
    await expect(page.locator('.desktop-nav a[href="../../../ai-cleaner/"]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('.desktop-nav a[href="../../../ai-cleaner/"]').click();
    expect(page.url()).toContain('/ai-cleaner/');
  }
});
