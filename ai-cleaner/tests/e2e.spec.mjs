import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const BASE='http://127.0.0.1:4173/ai-cleaner/';
const versionData=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));
const APP_VERSION=String(versionData.version);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoReady(page){
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__AI_CLEANER_APP_READY__===true&&!!window.AICleanerApp,{timeout:15000});
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('body')).toHaveAttribute('aria-busy','false');
}

test('original auto typewriter writes visible text and removes safe hidden characters', async ({ page }) => {
  await gotoReady(page);
  const source='가\u200B나다\u00AD\u061C\nABC🙂e\u0301\u00A0끝👩‍💻';
  const expected='가나다\nABC🙂e\u0301 끝👩‍💻';
  await page.locator('#input').fill(source);
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#typingPreviewPanel')).toBeVisible();
  expect(await page.locator('#typingPreviewPanel').evaluate(el=>!!el.closest('#cleanedPane'))).toBeFalsy();
  await expect(page.locator('#input')).toHaveJSProperty('readOnly',true);
  await expect(page.locator('#cleanProfile')).toBeDisabled();
  await expect(page.locator('#output')).toHaveValue(expected,{timeout:7000});
  await expect(page.locator('#output')).not.toHaveValue(/\u200B|\u00AD|\u061C|\u00A0/);
  await expect(page.locator('#output')).toHaveValue(/👩‍💻$/);
  await expect(page.locator('#typingPreviewText')).toContainText('결과 안전 제거 대상 0개',{timeout:7000});
  await expect(page.locator('#output')).toHaveAttribute('data-typewriter-verified','true',{timeout:7000});
  await page.locator('#techWidget').click();await expect(page.locator('#techSummary')).toContainText('원본 발견');await expect(page.locator('#techSummary')).toContainText('결과 잔여 0');
  await expect(page.locator('#input')).toHaveJSProperty('readOnly',false);
  await expect(page.locator('#cleanProfile')).toBeEnabled();
});

test('mobile typewriter completion button closes the panel and navigates to the result card', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  await page.locator('#input').fill('모바일 자동작성 완료 버튼 테스트입니다. 결과 위치로 바로 이동해야 합니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();await expect(page.locator('#typingPreviewPanel')).toBeVisible();
  await expect(page.locator('#typingPreviewPause')).toHaveText('완료 · 결과 보기',{timeout:7000});
  await page.locator('#typingPreviewPause').click();await expect(page.locator('#typingPreviewPanel')).toBeHidden();
  await expect(page.locator('#output')).toHaveAttribute('data-typewriter-verified','true');
  await expect.poll(async()=>page.locator('#resultCard').evaluate(el=>{const r=el.getBoundingClientRect(),h=document.querySelector('.top')?.getBoundingClientRect().bottom||0;return Math.round(r.top-h);})).toBeGreaterThanOrEqual(0);
  await expect.poll(async()=>page.locator('#resultCard').evaluate(el=>{const r=el.getBoundingClientRect(),h=document.querySelector('.top')?.getBoundingClientRect().bottom||0;return Math.round(r.top-h);})).toBeLessThanOrEqual(30);
});

test('mobile typewriter completion auto-navigates when the result button is not tapped', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  await page.locator('#input').fill('모바일 자동 이동 테스트입니다. 완료 뒤 결과 카드가 헤더 아래에 보여야 합니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#typingPreviewPanel')).toBeHidden({timeout:9000});
  await expect(page.locator('#output')).toHaveAttribute('data-typewriter-verified','true');
  const landing=await page.locator('#resultCard').evaluate(el=>{const r=el.getBoundingClientRect(),h=document.querySelector('.top')?.getBoundingClientRect().bottom||0;return{delta:Math.round(r.top-h),pulse:el.classList.contains('resultDestinationPulse')};});
  expect(landing.delta).toBeGreaterThanOrEqual(0);expect(landing.delta).toBeLessThanOrEqual(30);expect(landing.pulse).toBeTruthy();
});

test('mobile user gesture cancels pending automatic result navigation', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  await page.locator('#input').fill('사용자가 완료 팝업을 확인하는 동안 자동 이동이 화면을 끌고 가면 안 됩니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#typingPreviewPause')).toHaveText('완료 · 결과 보기',{timeout:7000});
  await page.locator('#typingPreviewText').dispatchEvent('pointerdown',{button:0});
  await page.waitForTimeout(1300);
  await expect(page.locator('#typingPreviewPanel')).toBeVisible();
  await page.locator('#typingPreviewPause').click();await expect(page.locator('#typingPreviewPanel')).toBeHidden();
});

test('mobile visual viewport resize keeps expanded panels inside the visible viewport', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  await page.locator('#input').fill('모바일 가시 영역 변화 테스트입니다. 결과와 팝업 위치를 확인합니다.');await page.locator('#analyze').click();
  await page.locator('#rewriteWidget').click();const panel=page.locator('#rewritePanel');await expect(panel).toBeVisible();
  await panel.locator('[data-panel-size="rewritePanel"]').click();await expect(panel).toHaveClass(/mobileExpanded/);
  await page.setViewportSize({width:390,height:520});
  await expect.poll(async()=>page.evaluate(()=>Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-visual-height'))))).toBe(520);
  const geo=await panel.evaluate(el=>{const r=el.getBoundingClientRect(),h=window.visualViewport?.height||innerHeight;return{top:r.top,bottom:r.bottom,height:r.height,viewport:h};});
  expect(geo.top).toBeGreaterThanOrEqual(0);expect(geo.bottom).toBeLessThanOrEqual(geo.viewport+1);expect(geo.height).toBeLessThan(geo.viewport);
});

test('panel expansion state resets when crossing the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  await page.locator('#input').fill('회전 및 breakpoint 전환 테스트입니다.');await page.locator('#analyze').click();await page.locator('#rewriteWidget').click();
  const panel=page.locator('#rewritePanel');await panel.locator('[data-panel-size="rewritePanel"]').click();await expect(panel).toHaveClass(/mobileExpanded/);
  await page.setViewportSize({width:1100,height:700});await expect(panel).not.toHaveClass(/mobileExpanded/);
  await page.setViewportSize({width:390,height:844});await expect(panel).not.toHaveClass(/mobileExpanded/);
});


test('touch devices keep the native editor context menu while direct typing paste protection remains separate', async ({ page }) => {
  await page.addInitScript(()=>{try{Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,get:()=>5});}catch(_){}});await page.setViewportSize({width:390,height:844});await gotoReady(page);
  const nativeAllowed=await page.locator('#input').evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:30,clientY:30})));
  expect(nativeAllowed).toBeTruthy();await expect(page.locator('#textContextMenu')).toBeHidden();
  await page.locator('#input').fill('직접 쓰기 보호 확인');await page.locator('#analyze').click();await page.locator('#rewriteWidget').click();await page.locator('[data-rewrite-tab="verify"]').click();
  await page.locator('#directTyped').evaluate(el=>{const ev=new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertFromPaste',data:'PASTE'});el.dispatchEvent(ev);});await expect(page.locator('#directTyped')).toHaveValue('');
});

test('boot readiness blocks interaction until app wiring is complete', async ({ page }) => {
  await gotoReady(page);
  const ready=await page.evaluate(()=>({
    flag:window.__AI_CLEANER_APP_READY__===true,
    classReady:document.documentElement.classList.contains('app-ready'),
    busy:document.body.getAttribute('aria-busy'),
    inert:document.body.inert,
    appReady:window.AICleanerApp?.ready===true
  }));
  expect(ready).toEqual({flag:true,classReady:true,busy:'false',inert:false,appReady:true});
});

test('dirty input cannot use stale result and manual analyze restores coherence', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('첫 결과입니다.');await page.locator('#analyze').click();await expect(output).toHaveValue('첫 결과입니다.');
  await page.locator('#liveScan').uncheck();await input.fill('새 원본​ 입니다.');
  await expect(page.locator('#resultFreshness')).toBeVisible();await expect(page.locator('#resultFreshness')).toContainText('지금 다듬기 필요');
  await expect(output).toHaveClass(/resultStale/);
  for(const id of ['copy','downloadTxt','editResult','undoAll'])await expect(page.locator('#'+id)).toBeDisabled();
  await expect(page.locator('[data-resulttab="diff"]')).toBeDisabled();await expect(page.locator('#analyze')).toBeEnabled();
  await page.locator('#analyze').click();await expect(output).toHaveValue('새 원본 입니다.');
  await expect(page.locator('#resultFreshness')).toBeHidden();await expect(output).not.toHaveClass(/resultStale/);await expect(page.locator('#copy')).toBeEnabled();
  await input.fill('재작성 직전 최신 원본입니다.');await expect(page.locator('#resultFreshness')).toBeVisible();
  await page.locator('#rewriteWidget').click();await expect(page.locator('#rewritePanel')).toBeVisible();await expect(output).toHaveValue('재작성 직전 최신 원본입니다.');await expect(page.locator('#resultFreshness')).toBeHidden();
});

test('typewriter started from dirty input restores the current input result when cancelled', async ({ page }) => {
  await gotoReady(page);const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('이전 결과입니다.');await page.locator('#analyze').click();await expect(output).toHaveValue('이전 결과입니다.');
  await page.locator('#liveScan').uncheck();await input.fill('현재​ 원본입니다.');await expect(output).toHaveValue('이전 결과입니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='40';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();await expect(page.locator('#typingPreviewPanel')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('#typingPreviewPanel')).toBeHidden();await expect(input).toHaveJSProperty('readOnly',false);await expect(output).toHaveValue('현재 원본입니다.');await expect(page.locator('#resultFreshness')).toBeHidden();
});

test('rewrite generation reset cancels an in-flight draft transaction', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('결론적으로 재작성 취소 테스트입니다. 가격은 19,900원입니다.');await page.locator('#analyze').click();
  await page.locator('#rewriteWidget').click();await expect(page.locator('#rewritePanel')).toBeVisible();
  const during=await page.evaluate(async()=>{const p=window.AICleanerRewriteStudio.generate();const disabled=document.querySelector('#rewriteSource').disabled;window.AICleanerRewriteStudio.resetSession();await p;return{disabled,draft:document.querySelector('#rewriteDraft').value,busy:document.querySelector('#rewritePanel').getAttribute('aria-busy')};});
  expect(during.disabled).toBeTruthy();expect(during.draft).toBe('');expect(during.busy).toBe('false');
});

test('rewrite draft locks immediately when original changes behind current-result source', async ({ page }) => {
  await gotoReady(page);const input=page.locator('#input');await input.fill('결론적으로 기존 원본입니다. 가격은 19,900원입니다.');await page.locator('#analyze').click();
  await page.locator('#rewriteWidget').click();await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewriteDraft')).not.toHaveValue('');await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#liveScan').uncheck();await input.fill('결론적으로 바뀐 원본입니다. 가격은 19,900원입니다.');
  await expect(page.locator('#rewriteApply')).toBeDisabled();await expect(page.locator('#rewriteValidation')).toContainText('기준 글이');
});

test('rewrite source change cancels an in-flight draft transaction', async ({ page }) => {
  await gotoReady(page);const input=page.locator('#input');await input.fill('결론적으로 생성 중 취소를 확인합니다. 가격은 19,900원입니다.');await page.locator('#analyze').click();
  await page.locator('#rewriteWidget').click();await page.locator('#rewriteSource').selectOption('original');await page.locator('#rewriteGenerate').click();
  await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','true');
  await input.fill('결론적으로 생성 중 기준 글을 바꿨습니다. 가격은 19,900원입니다.');
  await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','false');await expect(page.locator('#rewritePanelStatus')).toContainText('기준 글이 바뀌어 생성 작업을 취소했습니다.');
  await expect(page.locator('#rewriteDraft')).toHaveValue('');await expect(page.locator('#rewriteApply')).toBeDisabled();
});


test('rewrite draft survives an immediate close and reopen before debounce persistence', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('재작성 세션 즉시 재열기 테스트입니다. 가격은 19,900원입니다.');await page.locator('#analyze').click();
  await page.locator('#rewriteWidget').click();await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewriteDraft')).not.toHaveValue('');
  const latest='방금 직접 수정한 초안 19,900원';await page.locator('#rewriteDraft').fill(latest);
  await page.locator('[data-close-panel="rewritePanel"]').click();await page.locator('#rewriteWidget').click();
  await expect(page.locator('#rewriteDraft')).toHaveValue(latest);await expect(page.locator('#rewritePanel')).toBeVisible();
});

test('switching to image tool cancels an in-flight rewrite generation and releases the work lock', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('다른 도구 이동 중 재작성 취소 테스트입니다. 가격은 19,900원입니다.');await page.locator('#analyze').click();await page.locator('#rewriteWidget').click();
  await page.evaluate(()=>{document.querySelector('#rewriteGenerate').click();document.querySelector('[data-tool="image"]').click();});
  await expect(page.locator('#imageTool')).toBeVisible();await expect(page.locator('#rewritePanel')).toBeHidden();await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','false');
  const lock=await page.evaluate(()=>window.AICleanerApp.workLock.isLocked('rewrite-generation'));expect(lock).toBeFalsy();await expect(page.locator('#rewriteDraft')).toHaveValue('');
});

test('mobile text input intent cancels a pending automatic result jump without relying on keydown or pointer events', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);const input=page.locator('#input');
  await input.fill('음성 입력과 IME처럼 input 이벤트만 와도 자동 결과 이동 예약을 취소해야 합니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#typingPreviewPause')).toHaveText('완료 · 결과 보기',{timeout:7000});
  await input.evaluate(el=>{el.value+=' 추가';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(1300);
  await expect(page.locator('#typingPreviewPanel')).toBeVisible();await expect(page.locator('#resultFreshness')).toBeVisible();
  await page.locator('#typingPreviewPause').click();await expect(page.locator('#typingPreviewPanel')).toBeHidden();
});

test('foundation flow keeps state, layout and rewrite tools coherent', async ({ page }) => {
  await gotoReady(page);
  await expect(page.locator('#versionBadge')).toHaveText('v'+APP_VERSION);
  const modules=await page.evaluate(()=>({
    history:!!window.AICleanerApp?.historyStore,
    lock:!!window.AICleanerApp?.workLock,
    panels:!!window.AICleanerApp?.panelManager,
    typewriter:!!window.AICleanerApp?.typewriterEngine,
    bus:!!window.AICleanerApp?.eventBus
  }));
  expect(modules).toEqual({history:true,lock:true,panels:true,typewriter:true,bus:true});
  await expect(page.locator('#detailDiagnostics')).not.toHaveAttribute('open','');
  await page.setViewportSize({width:820,height:900});
  await expect.poll(async()=>page.locator('#typingPreviewButton small').evaluate(el=>getComputedStyle(el).transform)).toBe('none');
  await expect.poll(async()=>page.locator('#typingPreviewButton').evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');

  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('결론적으로 이 문장을 테스트합니다. 가격은 19,900원입니다.\u200B\u00A0');
  await page.locator('#analyze').click();
  await expect(output).not.toHaveValue('');
  await expect(output).not.toHaveValue(/\u200B/);
  await expect(page.locator('#issueCount')).toHaveText('1');
  await expect(page.locator('#v62ReviewList [data-review-card]')).toHaveCount(0);
  await page.locator('#reviewWidget').click();await expect(page.locator('#reviewPanel')).toBeVisible();await expect(page.locator('#reviewWidget')).toHaveAttribute('aria-expanded','true');await expect(page.locator('#v62ReviewList [data-review-card]')).toHaveCount(1);

  await page.locator('#issuesWidget').click();await expect(page.locator('#reviewPanel')).toBeHidden();await expect(page.locator('#reviewWidget')).toHaveAttribute('aria-expanded','false');await expect(page.locator('#issuesWidget')).toHaveAttribute('aria-expanded','true');
  const apply=page.locator('#issuesPanel [data-apply]').first();
  await expect(apply).toBeVisible();await apply.click();await expect(output).toHaveValue(/그래서/);
  await page.locator('#undoStep').click();await expect(output).toHaveValue(/결론적으로/);
  await page.locator('#redoStep').click();await expect(output).toHaveValue(/그래서/);

  await page.locator('#rewriteWidget').click();await expect(page.locator('#rewritePanel')).toBeVisible();await expect(page.locator('#issuesPanel')).toBeHidden();
  await expect.poll(async()=>page.locator('#rewritePanel').evaluate(el=>getComputedStyle(el).resize)).toBe('none');
  await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewriteDraft')).not.toHaveValue('');
  await expect(page.locator('#rewriteDraft')).toHaveValue(/19,900원/);await expect(page.locator('#rewriteFactSummary')).toContainText('잠금');await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#rewriteSource').selectOption('original');await page.locator('#rewriteGenerate').click();
  await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','true');await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#rewriteDraft')).not.toHaveValue('');await expect(page.locator('#rewriteApply')).toBeEnabled();
  await input.fill('결론적으로 이 문장을 테스트합니다. 가격은 19,900원입니다. 모델은 M60입니다. 변경됨');
  await expect(page.locator('#rewriteApply')).toBeDisabled();await expect(page.locator('#rewriteValidation')).toContainText('기준 글이');
  await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewriteDraft')).toHaveValue(/M60/);await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#rewriteApply').click();await expect(output).toHaveValue(/19,900원/);await expect(page.locator('#rewritePanel')).toBeHidden();
  await expect(page.locator('[data-resulttab="cleaned"]')).toHaveClass(/active/);await expect(output).toBeVisible();

  await page.locator('#rewriteWidget').click();await page.locator('[data-rewrite-tab="verify"]').click();
  await expect(page.locator('#directTarget')).toHaveValue('original');await expect(page.locator('#directTarget')).toBeDisabled();
  await page.locator('#directTyped').evaluate(el=>{const ev=new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertFromPaste',data:'PASTE'});el.dispatchEvent(ev);});
  await expect(page.locator('#directTyped')).toHaveValue('');

  await page.locator('[data-close-panel="rewritePanel"]').click();
  await input.fill('앞\u200B뒤\u00A0끝');await page.locator('#analyze').click();
  await expect(output).toHaveValue('앞뒤 끝');
  await expect(page.locator('[data-resulttab="xray"]')).toHaveCount(0);

  await input.fill('');
  await expect(output).toHaveValue('');
  await expect(page.locator('#issuesWidget')).toBeHidden();
  await expect(page.locator('#detailSummary')).toHaveText('분석 전');
});


test('layout bridge floats between two cards without reserving a desktop column', async ({ page }) => {
  await page.setViewportSize({width:1280,height:900});
  await gotoReady(page);
  const geo=await page.locator('.workspace').evaluate((ws)=>{
    const cards=[...ws.querySelectorAll(':scope > .card')];
    const bridge=ws.querySelector('.bridgeAction');
    const a=cards[0].getBoundingClientRect(),b=cards[1].getBoundingClientRect(),w=ws.getBoundingClientRect(),br=bridge.getBoundingClientRect();
    const style=getComputedStyle(ws),bs=getComputedStyle(bridge);
    return {columns:style.gridTemplateColumns,gap:parseFloat(style.columnGap),cardGap:b.left-a.right,widthDelta:Math.abs(a.width-b.width),bridgePosition:bs.position,bridgeCenter:br.left+br.width/2,workspaceCenter:w.left+w.width/2};
  });
  expect(geo.columns.trim().split(/\s+/)).toHaveLength(2);
  expect(geo.gap).toBeLessThanOrEqual(26);
  expect(geo.cardGap).toBeLessThanOrEqual(26);
  expect(geo.widthDelta).toBeLessThan(3);
  expect(geo.bridgePosition).toBe('absolute');
  expect(Math.abs(geo.bridgeCenter-geo.workspaceCenter)).toBeLessThan(2);

  await page.setViewportSize({width:820,height:900});
  await expect.poll(async()=>page.locator('.bridgeAction').evaluate(el=>getComputedStyle(el).position)).toBe('relative');
  await expect.poll(async()=>page.locator('#typingPreviewButton').evaluate(el=>getComputedStyle(el).flexDirection)).toBe('row');
});


test('mobile compact panels open small and expand on demand', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoReady(page);
  await expect(page.locator('.pill')).toContainText(APP_VERSION);
  await page.locator('#input').fill('모바일 팝업 테스트입니다. 하지만 문장이 길어지면 검토 제안이 표시될 수 있습니다. 그리고 결과도 확인합니다.');
  await page.locator('#analyze').click();
  await page.locator('#rewriteWidget').click();
  const panel=page.locator('#rewritePanel');
  await expect(panel).toBeVisible();
  const compact=await panel.evaluate(el=>({h:el.getBoundingClientRect().height,vh:innerHeight,expanded:el.classList.contains('mobileExpanded')}));
  expect(compact.expanded).toBeFalsy();
  expect(compact.h).toBeLessThan(compact.vh*0.6);
  const size=panel.locator('[data-panel-size="rewritePanel"]');
  await expect(size).toBeVisible();
  await size.click();
  const expanded=await panel.evaluate(el=>({h:el.getBoundingClientRect().height,vh:innerHeight,expanded:el.classList.contains('mobileExpanded')}));
  expect(expanded.expanded).toBeTruthy();
  expect(expanded.h).toBeGreaterThan(compact.h+120);
  await size.click();
  await expect(panel).not.toHaveClass(/mobileExpanded/);
});

test('narrow mobile header and result actions avoid vertical crowding', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  const geo=await page.evaluate(()=>{const top=document.querySelector('.top').getBoundingClientRect(),hero=document.querySelector('.hero').getBoundingClientRect(),actions=getComputedStyle(document.querySelector('.resultActions'));return{headerHeight:top.height,headerBottom:top.bottom,heroTop:hero.top,resultColumns:actions.gridTemplateColumns.trim().split(/\s+/).length};});
  expect(geo.headerHeight).toBeGreaterThan(68);expect(geo.heroTop).toBeGreaterThanOrEqual(geo.headerBottom);expect(geo.resultColumns).toBe(2);
});

test('long live analysis runs through worker-safe adapter', async ({ page }) => {
  await gotoReady(page);
  const longText=('긴 문장 자동 분석 테스트입니다. 숨은 문자\u200B도 정리합니다. ').repeat(180);
  expect(longText.length).toBeGreaterThan(6000);
  await page.locator('#input').fill(longText);
  await expect(page.locator('#output')).not.toHaveValue('',{timeout:10000});
  const info=await page.evaluate(()=>({
    supported:window.AICleanerApp.analysisWorker.workerSupported,
    stats:window.AICleanerApp.analysisWorker.getStats(),
    governor:window.AICleanerApp.analysisPerformance.getStats()
  }));
  if(info.supported)expect(info.stats.workerSuccess).toBeGreaterThanOrEqual(1);
  else expect(info.stats.fallbackRuns).toBeGreaterThanOrEqual(1);
  expect(info.stats.pending).toBe(0);
  expect(info.stats.workerTimeouts).toBe(0);
  expect(info.governor.completed).toBeGreaterThanOrEqual(1);
  await expect(page.locator('#output')).not.toHaveValue(/\u200B/);
});
