import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const BASE='http://127.0.0.1:4173/ai-cleaner/';
const versionData=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));
const APP_VERSION=String(versionData.version);

// Keep request-mocking tests deterministic. Service Worker behavior is exercised in its own explicit context below.
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

async function gotoReady(page){
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__AI_CLEANER_APP_READY__===true&&!!window.AICleanerApp,{timeout:15000});
  await expect(page.locator('html')).toHaveClass(/app-ready/);
  await expect(page.locator('body')).toHaveAttribute('aria-busy','false');
}
async function analyzeNow(page,{silent=false}={}){return page.evaluate(silentArg=>window.AICleanerApp.analyzeNow(silentArg),silent);}

test('original auto typewriter preserves the exact source including hidden and special characters', async ({ page }) => {
  await gotoReady(page);
  const source='가\u200B나다\u00AD\u061C\nABC🙂e\u0301\u00A0끝👩‍💻';
  const expected=source;
  await page.locator('#input').fill(source);
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#typingPreviewPanel')).toBeVisible();
  expect(await page.locator('#typingPreviewPanel').evaluate(el=>!!el.closest('#cleanedPane'))).toBeFalsy();
  await expect(page.locator('#input')).toHaveJSProperty('readOnly',true);
  await expect(page.locator('#cleanProfile')).toBeDisabled();
  await expect(page.locator('#output')).toHaveValue(expected,{timeout:7000});
  await expect(page.locator('#output')).toHaveValue(/👩‍💻$/);
  await expect(page.locator('#typingPreviewText')).toContainText('100% 원문 일치 확인',{timeout:7000});
  await expect(page.locator('#typingPreviewText')).toContainText('추가/삭제/정규화 0개',{timeout:7000});
  await expect(page.locator('#output')).toHaveAttribute('data-typewriter-verified','true',{timeout:7000});
  await page.locator('#techWidget').click();await expect(page.locator('#techSummary')).toContainText('원본 발견');await expect(page.locator('#techSummary')).toContainText('원본 그대로 보존');
  await expect(page.locator('#input')).toHaveJSProperty('readOnly',false);
  await expect(page.locator('#cleanProfile')).toBeEnabled();
});

test('source arrival highlights typewriter as the next step and start navigates immediately while progress stays open', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  const typewriter=page.locator('#typingPreviewButton');await expect(typewriter).toBeDisabled();
  await page.locator('#input').fill('원본이 들어오면 자동작성 원본 새로쓰기를 다음 단계로 안내하고, 누르는 즉시 결과 화면으로 이동해야 합니다.');
  await expect(typewriter).toBeEnabled();await expect(typewriter).toHaveClass(/typewriterRecommended/);await expect(page.locator('#typingBridgeStatus')).toContainText('눌러서 새로쓰기');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await typewriter.click();await expect(page.locator('#typingPreviewPanel')).toBeVisible();await expect(page.locator('#resultCard')).toHaveClass(/typewriterDestinationActive/);
  await expect.poll(async()=>page.locator('#resultCard').evaluate(el=>{const r=el.getBoundingClientRect(),h=document.querySelector('.top')?.getBoundingClientRect().bottom||0;return Math.round(r.top-h);})).toBeGreaterThanOrEqual(0);
  await expect.poll(async()=>page.locator('#resultCard').evaluate(el=>{const r=el.getBoundingClientRect(),h=document.querySelector('.top')?.getBoundingClientRect().bottom||0;return Math.round(r.top-h);})).toBeLessThanOrEqual(30);
  await expect(page.locator('#typingPreviewPanel')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#typingPreviewPanel')).toBeHidden();
});



test('completion priority keeps rewrite quiet until auto typewriter finishes and result tabs expose state', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  const input=page.locator('#input'),rewrite=page.locator('#rewriteWidget'),next=page.locator('#resultNextStep');
  await input.fill('원본 단계에서는 자동작성 버튼이 먼저 안내되고, 완료 뒤에 재작성과 결과 액션이 다음 단계가 되어야 합니다.');
  await analyzeNow(page,{silent:true});
  await expect(page.locator('#typingPreviewButton')).toHaveClass(/typewriterRecommended/);await expect(rewrite).not.toHaveClass(/rewriteReady/);
  await expect(next).toContainText('결과 준비');
  await expect(page.locator('#resultTabCleaned')).toHaveAttribute('aria-selected','true');await expect(page.locator('#resultTabDiff')).toHaveAttribute('aria-selected','false');
  await page.locator('#resultTabCleaned').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#resultTabCleaned')).toHaveAttribute('aria-selected','false');await expect(page.locator('#resultTabDiff')).toHaveAttribute('aria-selected','true');await expect(page.locator('#resultTabDiff')).toBeFocused();
  await page.keyboard.press('ArrowLeft');await expect(page.locator('#resultTabCleaned')).toHaveAttribute('aria-selected','true');await expect(page.locator('#resultTabCleaned')).toBeFocused();
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#output')).toHaveAttribute('data-typewriter-verified','true',{timeout:7000});await expect(next).toContainText('자동작성 완료');await expect(rewrite).toHaveClass(/rewriteReady/);
});

test('completed typewriter state is invalidated by a manual result edit without re-promoting it as the next step', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output'),typewriter=page.locator('#typingPreviewButton'),next=page.locator('#resultNextStep');
  await input.fill('자동작성 검증 뒤 결과를 직접 수정하면 현재 결과는 더 이상 원본과 정확히 같은 자동작성 결과가 아닙니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await typewriter.click();await expect(output).toHaveAttribute('data-typewriter-verified','true',{timeout:7000});
  await expect(page.locator('#typingPreviewPanel')).toBeHidden();await expect(page.locator('#typingPreviewPause')).toHaveText('일시정지');
  await page.locator('#editResult').click();const edited=(await output.inputValue())+' 직접 수정';await output.fill(edited);
  await expect(output).not.toHaveAttribute('data-typewriter-verified','true');await expect(typewriter).not.toHaveClass(/typewriterRecommended/);await expect(page.locator('#typingBridgeStatus')).toContainText('필요할 때 새로쓰기');await expect(next).toContainText('직접 수정 중');
  await page.locator('#editResult').click();await expect(output).toHaveValue(/직접 수정$/);await expect(next).toContainText('결과를 수정했습니다');
});

test('reset immediately after mobile typewriter completion cancels the delayed completion navigation', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  await page.locator('#input').fill('완료 직후 초기화를 선택하면 예약되어 있던 결과 자동 이동이 다시 실행되면 안 됩니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();await expect(page.locator('#typingPreviewPause')).toHaveText('완료 · 결과 보기',{timeout:7000});
  await page.locator('#reset').evaluate(el=>el.click());await expect(page.locator('#input')).toHaveValue('');await expect(page.locator('#output')).toHaveValue('');await expect(page.locator('#typingPreviewPanel')).toBeHidden();await expect(page.locator('#resultNextStep')).toBeHidden();
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1300);expect(await page.evaluate(()=>Math.round(scrollY))).toBeLessThanOrEqual(2);await expect(page.locator('#appToast')).toContainText('글 작업을 초기화했습니다.');
});

test('mobile source actions stay on one compact row and result tabs align to the right of the result title', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  const sourceGeometry=await page.locator('#sample, .sourceActions .filelabel, #reset').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return{top:Math.round(r.top),bottom:Math.round(r.bottom),height:Math.round(r.height)};}));
  expect(sourceGeometry).toHaveLength(3);expect(Math.max(...sourceGeometry.map(x=>x.top))-Math.min(...sourceGeometry.map(x=>x.top))).toBeLessThanOrEqual(2);expect(Math.min(...sourceGeometry.map(x=>x.height))).toBeGreaterThanOrEqual(40);
  await page.locator('#liveScan').uncheck();await page.locator('#input').fill('결과 상태 안내가 보여도 탭은 같은 줄 오른쪽에 있어야 합니다.');await expect(page.locator('#resultFreshness')).toBeVisible();
  const resultLayout=await page.locator('#resultCard').evaluate(card=>{const title=card.querySelector('.resultTitle').getBoundingClientRect(),tabs=card.querySelector('.tabs').getBoundingClientRect(),head=card.querySelector('.resultHead').getBoundingClientRect();return{titleTop:Math.round(title.top),tabsTop:Math.round(tabs.top),titleRight:Math.round(title.right),tabsLeft:Math.round(tabs.left),headRight:Math.round(head.right),tabsRight:Math.round(tabs.right)};});
  expect(Math.abs(resultLayout.titleTop-resultLayout.tabsTop)).toBeLessThanOrEqual(8);expect(resultLayout.tabsLeft).toBeGreaterThanOrEqual(resultLayout.titleRight-4);expect(resultLayout.tabsRight).toBeLessThanOrEqual(resultLayout.headRight+1);
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
  await page.locator('#input').fill('모바일 가시 영역 변화 테스트입니다. 결과와 팝업 위치를 확인합니다.');await analyzeNow(page);
  await page.locator('#rewriteWidget').click();const panel=page.locator('#rewritePanel');await expect(panel).toBeVisible();
  await panel.locator('[data-panel-size="rewritePanel"]').click();await expect(panel).toHaveClass(/mobileExpanded/);
  await page.setViewportSize({width:390,height:520});
  await expect.poll(async()=>page.evaluate(()=>Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-visual-height'))))).toBe(520);
  const geo=await panel.evaluate(el=>{const r=el.getBoundingClientRect(),h=window.visualViewport?.height||innerHeight;return{top:r.top,bottom:r.bottom,height:r.height,viewport:h};});
  expect(geo.top).toBeGreaterThanOrEqual(0);expect(geo.bottom).toBeLessThanOrEqual(geo.viewport+1);expect(geo.height).toBeLessThan(geo.viewport);
});

test('panel expansion state resets when crossing the mobile breakpoint', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);
  await page.locator('#input').fill('회전 및 breakpoint 전환 테스트입니다.');await analyzeNow(page);await page.locator('#rewriteWidget').click();
  const panel=page.locator('#rewritePanel');await panel.locator('[data-panel-size="rewritePanel"]').click();await expect(panel).toHaveClass(/mobileExpanded/);
  await page.setViewportSize({width:1100,height:700});await expect(panel).not.toHaveClass(/mobileExpanded/);
  await page.setViewportSize({width:390,height:844});await expect(panel).not.toHaveClass(/mobileExpanded/);
});


test('touch devices keep the native editor context menu while direct typing paste protection remains separate', async ({ page }) => {
  await page.addInitScript(()=>{try{Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,get:()=>5});}catch(_){}});await page.setViewportSize({width:390,height:844});await gotoReady(page);
  const nativeAllowed=await page.locator('#input').evaluate(el=>el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:30,clientY:30})));
  expect(nativeAllowed).toBeTruthy();await expect(page.locator('#textContextMenu')).toBeHidden();
  await page.locator('#input').fill('직접 쓰기 보호 확인');await analyzeNow(page);await page.locator('#rewriteWidget').click();await page.locator('[data-rewrite-tab="verify"]').click();
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

test('dirty input stays guarded and internal on-demand analysis restores coherence', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('첫 결과입니다.');await analyzeNow(page);await expect(output).toHaveValue('첫 결과입니다.');
  await page.locator('#liveScan').uncheck();await input.fill('새 원본​ 입니다.');
  await expect(page.locator('#resultFreshness')).toBeVisible();await expect(page.locator('#resultFreshness')).toContainText('다음 작업에서 자동 갱신');
  await expect(output).toHaveClass(/resultStale/);
  for(const id of ['copy','downloadTxt','editResult','undoAll'])await expect(page.locator('#'+id)).toBeDisabled();
  await expect(page.locator('[data-resulttab="diff"]')).toBeDisabled();await expect(page.locator('#analyze')).toHaveCount(0);
  await analyzeNow(page);await expect(output).toHaveValue('새 원본 입니다.');
  await expect(page.locator('#resultFreshness')).toBeHidden();await expect(output).not.toHaveClass(/resultStale/);await expect(page.locator('#copy')).toBeEnabled();
  await input.fill('재작성 직전 최신 원본입니다.');await expect(page.locator('#resultFreshness')).toBeVisible();
  await page.locator('#rewriteWidget').click();await expect(page.locator('#rewritePanel')).toBeVisible();await expect(output).toHaveValue('재작성 직전 최신 원본입니다.');await expect(page.locator('#resultFreshness')).toBeHidden();
});

test('typewriter started from dirty input restores the current input result when cancelled', async ({ page }) => {
  await gotoReady(page);const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('이전 결과입니다.');await analyzeNow(page);await expect(output).toHaveValue('이전 결과입니다.');
  const tail=' 취소 시점 안정화용 긴 원본 문장입니다.'.repeat(30);
  const dirtySource='현재​ 원본입니다.'+tail,cleanCurrent='현재 원본입니다.'+tail;
  await page.locator('#liveScan').uncheck();await input.fill(dirtySource);await expect(output).toHaveValue('이전 결과입니다.');
  // Use the slowest real UI speed plus a long source so CI cannot finish the write before Escape.
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='85';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();await expect(page.locator('#typingPreviewPanel')).toBeVisible();
  await expect(output).toHaveAttribute('aria-busy','true');
  await expect(page.locator('#typingPreviewPanel')).toBeFocused();await page.keyboard.press('Escape');
  await expect(page.locator('#typingPreviewPanel')).toBeHidden();await expect(input).toHaveJSProperty('readOnly',false);await expect(output).toHaveValue(cleanCurrent);await expect(page.locator('#resultFreshness')).toBeHidden();
});

test('rewrite generation reset cancels an in-flight draft transaction', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('결론적으로 재작성 취소 테스트입니다. 가격은 19,900원입니다.');await analyzeNow(page);
  await page.locator('#rewriteWidget').click();await expect(page.locator('#rewritePanel')).toBeVisible();
  const during=await page.evaluate(async()=>{const p=window.AICleanerRewriteStudio.generate();const disabled=document.querySelector('#rewriteSource').disabled;window.AICleanerRewriteStudio.resetSession();await p;return{disabled,draft:document.querySelector('#rewriteDraft').value,busy:document.querySelector('#rewritePanel').getAttribute('aria-busy')};});
  expect(during.disabled).toBeTruthy();expect(during.draft).toBe('');expect(during.busy).toBe('false');
});

test('rewrite draft locks immediately when original changes behind current-result source', async ({ page }) => {
  await gotoReady(page);const input=page.locator('#input');await input.fill('결론적으로 기존 원본입니다. 가격은 19,900원입니다.');await analyzeNow(page);
  await page.locator('#rewriteWidget').click();await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewriteDraft')).not.toHaveValue('');await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#liveScan').uncheck();await input.fill('결론적으로 바뀐 원본입니다. 가격은 19,900원입니다.');
  await expect(page.locator('#rewriteApply')).toBeDisabled();await expect(page.locator('#rewriteValidation')).toContainText('기준 글이');
});

test('rewrite source change cancels an in-flight draft transaction', async ({ page }) => {
  await gotoReady(page);const input=page.locator('#input');await input.fill('결론적으로 생성 중 취소를 확인합니다. 가격은 19,900원입니다.');await analyzeNow(page);
  await page.locator('#rewriteWidget').click();await page.locator('#rewriteSource').selectOption('original');await page.locator('#rewriteGenerate').click();
  await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','true');
  await input.fill('결론적으로 생성 중 기준 글을 바꿨습니다. 가격은 19,900원입니다.');
  await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','false');await expect(page.locator('#rewritePanelStatus')).toContainText('기준 글이 바뀌어 생성 작업을 취소했습니다.');
  await expect(page.locator('#rewriteDraft')).toHaveValue('');await expect(page.locator('#rewriteApply')).toBeDisabled();
});


test('rewrite draft survives an immediate close and reopen before debounce persistence', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('재작성 세션 즉시 재열기 테스트입니다. 가격은 19,900원입니다.');await analyzeNow(page);
  await page.locator('#rewriteWidget').click();await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewriteDraft')).not.toHaveValue('');
  const latest='방금 직접 수정한 초안 19,900원';await page.locator('#rewriteDraft').fill(latest);
  await page.locator('[data-close-panel="rewritePanel"]').click();await page.locator('#rewriteWidget').click();
  await expect(page.locator('#rewriteDraft')).toHaveValue(latest);await expect(page.locator('#rewritePanel')).toBeVisible();
});

test('switching to image tool cancels an in-flight rewrite generation and releases the work lock', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('다른 도구 이동 중 재작성 취소 테스트입니다. 가격은 19,900원입니다.');await analyzeNow(page);await page.locator('#rewriteWidget').click();
  await expect(page.locator('#rewritePanel')).toBeVisible();await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','true');
  await page.locator('[data-tool="image"]').click();
  await expect(page.locator('#imageTool')).toBeVisible();await expect(page.locator('#rewritePanel')).toBeHidden();await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','false');
  const lock=await page.evaluate(()=>window.AICleanerApp.workLock.isLocked('rewrite-generation'));expect(lock).toBeFalsy();await expect(page.locator('#rewriteDraft')).toHaveValue('');
});

test('switching tools while rewrite lazy loading is pending cannot reopen the rewrite panel', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('재작성 도구가 늦게 로드되어도 다른 도구 위에 다시 열리면 안 됩니다.');await analyzeNow(page);
  await page.route('**/js/rewrite-studio.js*',async route=>{await new Promise(r=>setTimeout(r,280));await route.continue();});
  await page.locator('#rewriteWidget').click();await page.locator('[data-tool="image"]').click();await expect(page.locator('#imageTool')).toBeVisible();
  await expect.poll(async()=>page.evaluate(()=>!!window.AICleanerRewriteStudio),{timeout:5000}).toBeTruthy();await expect(page.locator('#rewritePanel')).toBeHidden();
});

test('mobile text input intent cancels a pending automatic result jump without relying on keydown or pointer events', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);const input=page.locator('#input');
  await input.fill('음성 입력과 IME처럼 input 이벤트만 와도 자동 결과 이동 예약을 취소해야 합니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('change',{bubbles:true}));});await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#typingPreviewPause')).toHaveText('완료 · 결과 보기',{timeout:7000});
  await input.evaluate(el=>{el.value+=' 추가';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(1300);
  await expect(page.locator('#typingPreviewPanel')).toBeVisible();await expect(input).toHaveValue(/추가$/);
  await page.locator('#typingPreviewPause').click();await expect(page.locator('#typingPreviewPanel')).toBeHidden();
});

test('sample button replaces the source through the shared pipeline and analyzes immediately', async ({ page }) => {
  await gotoReady(page);await page.locator('#liveScan').uncheck();
  await page.locator('#input').fill('이전 원본');await analyzeNow(page);
  await page.locator('#sample').click();
  await expect(page.locator('#input')).toHaveValue(/AI가\u200B 쓴 글에는/);
  await expect(page.locator('#output')).toHaveValue(/AI가 쓴 글에는/);
  await expect(page.locator('#output')).not.toHaveValue(/\u200B|\u200E|\u00A0/);
  await expect(page.locator('#resultFreshness')).toBeHidden();await expect(page.locator('#appToast')).toContainText('샘플을 불러오고 바로 다듬었습니다.');
});

test('text file import uses the same source replacement and freshness pipeline', async ({ page }) => {
  await gotoReady(page);await page.locator('#liveScan').uncheck();
  await page.locator('#textFileInput').setInputFiles({name:'source.txt',mimeType:'text/plain',buffer:Buffer.from('파일\u200B 입력 테스트\u00A0끝','utf8')});
  await expect(page.locator('#input')).toHaveValue('파일\u200B 입력 테스트\u00A0끝');
  await expect(page.locator('#output')).toHaveValue('파일 입력 테스트 끝');
  await expect(page.locator('#resultFreshness')).toBeHidden();await expect(page.locator('#appToast')).toContainText('source.txt 파일을 열고 바로 다듬었습니다.');
});

test('legacy CP949 Korean text import decodes before entering the shared analysis pipeline', async ({ page }) => {
  await gotoReady(page);await page.locator('#liveScan').uncheck();
  const cp949=Buffer.from([191,192,183,161,181,200,32,199,209,177,219,32,198,196,192,207]);
  await page.locator('#textFileInput').setInputFiles({name:'old-korean.txt',mimeType:'text/plain',buffer:cp949});
  await expect(page.locator('#input')).toHaveValue('오래된 한글 파일');
  await expect(page.locator('#output')).toHaveValue('오래된 한글 파일');
  await expect(page.locator('#appToast')).toContainText('EUC-KR/CP949');
});

test('a stale text-file read cannot overwrite newer direct input intent', async ({ page }) => {
  await gotoReady(page);
  await page.evaluate(()=>{window.__originalFileArrayBuffer=File.prototype.arrayBuffer;File.prototype.arrayBuffer=function(){const file=this;if(file.name==='slow.txt')return new Promise((resolve,reject)=>setTimeout(()=>window.__originalFileArrayBuffer.call(file).then(resolve,reject),450));return window.__originalFileArrayBuffer.call(file);};});
  await page.locator('#textFileInput').setInputFiles({name:'slow.txt',mimeType:'text/plain',buffer:Buffer.from('느린 파일이 뒤늦게 완료되었습니다.','utf8')});
  await page.waitForTimeout(40);await page.locator('#input').fill('사용자가 나중에 직접 입력한 최신 원본');await page.waitForTimeout(600);
  await expect(page.locator('#input')).toHaveValue('사용자가 나중에 직접 입력한 최신 원본');await expect(page.locator('#output')).toHaveValue(/사용자가 나중에 직접 입력한 최신 원본/);
  await page.evaluate(()=>{File.prototype.arrayBuffer=window.__originalFileArrayBuffer;delete window.__originalFileArrayBuffer;});await expect.poll(async()=>page.evaluate(()=>window.AICleanerApp.workLock.active.filter(x=>x.name.startsWith('text-import-')).length)).toBe(0);
});

test('large text file import uses immediate worker-safe background analysis even when live scan is off', async ({ page }) => {
  await gotoReady(page);await page.locator('#liveScan').uncheck();
  const longText=('대용량 파일 백그라운드 분석 테스트입니다. 숨은 문자\u200B도 안전하게 정리합니다. ').repeat(190);expect(longText.length).toBeGreaterThan(6000);
  const before=await page.evaluate(()=>window.AICleanerApp.analysisWorker.getStats());
  await page.locator('#textFileInput').setInputFiles({name:'large.txt',mimeType:'text/plain',buffer:Buffer.from(longText,'utf8')});
  await expect(page.locator('#input')).toHaveValue(longText);await expect(page.locator('#appToast')).toContainText('백그라운드에서 분석');await expect(page.locator('#output')).not.toHaveValue('',{timeout:10000});await expect(page.locator('#output')).not.toHaveValue(/\u200B/);
  const after=await page.evaluate(()=>({supported:window.AICleanerApp.analysisWorker.workerSupported,stats:window.AICleanerApp.analysisWorker.getStats(),pending:window.AICleanerApp.analysisCoordinator.pending}));
  if(after.supported)expect(after.stats.workerSuccess).toBeGreaterThan(before.workerSuccess);else expect(after.stats.fallbackRuns).toBeGreaterThan(before.fallbackRuns);expect(after.pending).toBeFalsy();
});

test('manual analysis failure keeps the source and exposes a recoverable UI state', async ({ page }) => {
  await gotoReady(page);await page.locator('#liveScan').uncheck();await page.locator('#input').fill('분석 오류 경계 테스트');
  await page.evaluate(()=>{window.__originalAnalyzeForTest=window.AICleanerApp.textEngine.analyze;window.AICleanerApp.textEngine.analyze=()=>{throw new Error('forced analysis failure');};});
  await analyzeNow(page);await expect(page.locator('#input')).toHaveValue('분석 오류 경계 테스트');await expect(page.locator('#resultFreshness')).toBeVisible();await expect(page.locator('#textPerf')).toHaveText('오류');await expect(page.locator('#appToast')).toContainText('분석 중 오류');
  await page.evaluate(()=>{window.AICleanerApp.textEngine.analyze=window.__originalAnalyzeForTest;delete window.__originalAnalyzeForTest;});await analyzeNow(page);await expect(page.locator('#resultFreshness')).toBeHidden();
});

test('rejected image input leaves a clear status and releases shared work locks', async ({ page }) => {
  await gotoReady(page);await page.locator('[data-tool="image"]').click();
  await page.locator('#imageInput').setInputFiles({name:'not-image.gif',mimeType:'image/gif',buffer:Buffer.from('GIF89a','ascii')});
  await expect(page.locator('#imageLoadStatus')).toContainText('지원하지 않는 형식');
  await expect.poll(async()=>page.evaluate(()=>window.AICleanerApp.workLock.isLocked())).toBeFalsy();
});

test('switching away while image analyzer lazy loading is pending prevents hidden analysis and releases the work lock', async ({ page }) => {
  await gotoReady(page);await page.locator('[data-tool="image"]').click();
  await page.route('**/js/image-analyzer.js*',async route=>{await new Promise(r=>setTimeout(r,280));await route.continue();});
  const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2q9sAAAAASUVORK5CYII=','base64');
  await page.locator('#imageInput').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:pixel});
  await expect.poll(async()=>page.evaluate(()=>window.AICleanerApp.workLock.isLocked())).toBeTruthy();await page.locator('[data-tool="text"]').click();await expect(page.locator('#textTool')).toBeVisible();
  await expect.poll(async()=>page.evaluate(()=>typeof window.loadImage==='function'),{timeout:5000}).toBeTruthy();await expect.poll(async()=>page.evaluate(()=>window.AICleanerApp.workLock.isLocked())).toBeFalsy();
  await expect(page.locator('#imageResults')).toBeHidden();await expect(page.locator('#imageLoadStatus')).toContainText('중지');
});

test('direct typing progress survives rewrite tab and panel round trips until the original changes', async ({ page }) => {
  await gotoReady(page);await page.locator('#liveScan').uncheck();await page.locator('#input').fill('ABC123');await analyzeNow(page);await page.locator('#rewriteWidget').click();await page.locator('[data-rewrite-tab="verify"]').click();
  await page.locator('#directTyped').click();await page.keyboard.type('ABC');await expect(page.locator('#directTyped')).toHaveValue('ABC');await expect(page.locator('#directProgress')).toHaveText('3 / 6');
  await page.locator('[data-rewrite-tab="draft"]').click();await page.locator('[data-rewrite-tab="verify"]').click();await expect(page.locator('#directTyped')).toHaveValue('ABC');
  await page.locator('[data-close-panel="rewritePanel"]').click();await page.locator('#rewriteWidget').click();await expect(page.locator('#rewriteVerifyPane')).toBeVisible();await expect(page.locator('#directTyped')).toHaveValue('ABC');
  await page.locator('#input').fill('XYZ');await expect(page.locator('#directTyped')).toHaveValue('');
});

test('clearing the source immediately clears stale output and analysis state', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('앞\u200B뒤\u00A0끝');
  await analyzeNow(page,{silent:true});
  await expect(output).toHaveValue('앞뒤 끝');
  await input.fill('');
  await expect(input).toHaveValue('');
  await expect(output).toHaveValue('');
  await expect(page.locator('#issuesWidget')).toBeHidden();
  await expect(page.locator('#reviewWidget')).toBeHidden();
  await expect(page.locator('#techWidget')).toBeHidden();
  await expect(page.locator('#detailSummary')).toHaveText('분석 전');
});

test('empty source stays authoritative after rewrite studio lifecycle callbacks settle', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('결론적으로 재작성 도구를 거친 뒤에도 빈 원본은 최종 상태여야 합니다. 가격은 19,900원입니다.');
  await analyzeNow(page,{silent:true});
  await page.locator('#rewriteWidget').click();
  await page.locator('#rewriteSource').selectOption('original');
  await page.locator('#rewriteGenerate').click();
  await expect(page.locator('#rewritePanel')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#rewriteApply').click();
  await expect(output).not.toHaveValue('');
  await page.locator('#rewriteWidget').click();
  await page.locator('[data-rewrite-tab="verify"]').click();
  await page.locator('[data-close-panel="rewritePanel"]').click();
  await input.fill('앞\u200B뒤\u00A0끝');
  await analyzeNow(page,{silent:true});
  await expect(output).toHaveValue('앞뒤 끝');
  await input.fill('');
  await expect(output).toHaveValue('');
  await page.waitForTimeout(140);
  await expect(output).toHaveValue('');
  await expect(page.locator('#issuesWidget')).toBeHidden();
  await expect(page.locator('#detailSummary')).toHaveText('분석 전');
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
  await analyzeNow(page);
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
  await input.fill('앞\u200B뒤\u00A0끝');await analyzeNow(page);
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
  await analyzeNow(page);
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

test('very narrow mobile width keeps the primary source row and result header inside the viewport', async ({ page }) => {
  await page.setViewportSize({width:320,height:568});await gotoReady(page);await page.locator('#liveScan').uncheck();await page.locator('#input').fill('아주 좁은 화면에서도 원본 버튼과 결과 탭이 화면 밖으로 밀리면 안 됩니다.');
  const geo=await page.evaluate(()=>{const source=[...document.querySelectorAll('#sample,.sourceActions .filelabel,#reset')].map(el=>el.getBoundingClientRect()),head=document.querySelector('.resultHead').getBoundingClientRect(),tabs=document.querySelector('.resultHead .tabs').getBoundingClientRect();return{scrollWidth:document.documentElement.scrollWidth,innerWidth,sourceTops:source.map(r=>Math.round(r.top)),sourceLeft:Math.min(...source.map(r=>r.left)),sourceRight:Math.max(...source.map(r=>r.right)),headLeft:head.left,headRight:head.right,tabsLeft:tabs.left,tabsRight:tabs.right};});
  expect(geo.scrollWidth).toBeLessThanOrEqual(geo.innerWidth+1);expect(Math.max(...geo.sourceTops)-Math.min(...geo.sourceTops)).toBeLessThanOrEqual(2);expect(geo.sourceLeft).toBeGreaterThanOrEqual(0);expect(geo.sourceRight).toBeLessThanOrEqual(geo.innerWidth+1);expect(geo.tabsLeft).toBeGreaterThanOrEqual(geo.headLeft);expect(geo.tabsRight).toBeLessThanOrEqual(geo.headRight+1);
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

test('result checkpoint workspace saves restores and locks restore when the source changes', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('체크포인트 원본입니다. 결론적으로 첫 결과를 보관하고 수정 버전도 따로 남깁니다.');await analyzeNow(page,{silent:true});
  const baseline=await output.inputValue();await expect(page.locator('#checkpointQuickBar')).toBeVisible();await expect(page.locator('#checkpointSave')).toBeEnabled();
  await page.locator('#checkpointSave').click();await expect(page.locator('#checkpointCount')).toHaveText('1');await page.locator('#checkpointOpen').click();
  await expect(page.locator('#checkpointPanel')).toBeVisible();await expect(page.locator('#checkpointList [data-checkpoint-id]')).toHaveCount(1);await expect(page.locator('#checkpointList [data-checkpoint-action="restore"]')).toBeEnabled();
  await page.locator('[data-close-panel="checkpointPanel"]').click();await page.locator('#editResult').click();await output.fill(baseline+'\n직접 수정 버전');await page.locator('#editResult').click();
  await page.locator('#checkpointSave').click();await expect(page.locator('#checkpointCount')).toHaveText('2');await page.locator('#checkpointOpen').click();await expect(page.locator('#checkpointList [data-checkpoint-id]')).toHaveCount(2);
  await page.locator('#checkpointList [data-checkpoint-id]').nth(1).locator('[data-checkpoint-action="restore"]').click();await expect(output).toHaveValue(baseline);await expect(page.locator('#checkpointPanel')).toBeHidden();
  await input.fill('완전히 다른 원본으로 바뀌었습니다. 이전 체크포인트는 복사만 가능해야 합니다.');await page.locator('#checkpointOpen').click();
  await expect(page.locator('#checkpointList [data-checkpoint-action="restore"]')).toHaveCount(2);for(const restore of await page.locator('#checkpointList [data-checkpoint-action="restore"]').all())await expect(restore).toBeDisabled();
});

test('result checkpoints survive a same-tab reload without restoring into an empty source', async ({ page }) => {
  await gotoReady(page);await page.locator('#input').fill('세션 보관함은 같은 탭 새로고침 뒤에도 목록을 다시 불러옵니다.');await analyzeNow(page,{silent:true});await page.locator('#checkpointSave').click();await expect(page.locator('#checkpointCount')).toHaveText('1');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__AI_CLEANER_APP_READY__===true&&!!window.AICleanerApp,{timeout:15000});
  await expect(page.locator('#checkpointQuickBar')).toBeVisible();await expect(page.locator('#checkpointCount')).toHaveText('1');await expect(page.locator('#checkpointOpen')).toBeEnabled();await page.locator('#checkpointOpen').click();
  await expect(page.locator('#checkpointList [data-checkpoint-id]')).toHaveCount(1);await expect(page.locator('#checkpointList [data-checkpoint-action="restore"]')).toBeDisabled();await expect(page.locator('#checkpointList [data-checkpoint-action="copy"]')).toBeEnabled();
});

test('correction suggestions bulk-apply safe edits, resolve overlaps, and leave review-only items', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('**결론적으로** 안내합니다.\n\n\n테스트 테스트 테스트 테스트 테스트 테스트');
  await analyzeNow(page,{silent:true});
  await page.locator('#issuesWidget').click();
  await expect(page.locator('#issueBulkBar')).toBeVisible();
  await expect(page.locator('#issueBulkCount')).toContainText('바로 반영 3개');
  await expect(page.locator('#applyAllIssues')).toBeEnabled();
  await page.locator('#applyAllIssues').click();
  await expect(output).toHaveValue(/그래서 안내합니다\./);
  await expect(output).not.toHaveValue(/\*\*|결론적으로|\n{3,}/);
  await expect(page.locator('#issuesPanelStatus')).toContainText('직접 확인');
  await expect(page.locator('#issueBulkBar')).toBeHidden();
  await expect(page.locator('#issuesPanel [data-apply]')).toHaveCount(0);
  await expect(page.locator('#issuesPanel')).toBeHidden();
  await page.locator('#undoStep').click();
  await expect(output).toHaveValue(/\*\*결론적으로\*\*/);
  await expect(output).toHaveValue(/\n{3,}/);
  await page.locator('#redoStep').click();
  await expect(output).toHaveValue(/그래서 안내합니다\./);
});

test('overlapping individual corrections stay safe and hand off to bulk apply', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('**결론적으로** 안내합니다.');
  await analyzeNow(page,{silent:true});
  await page.locator('#issuesWidget').click();
  const markdown=page.locator('#issues .item').filter({hasText:'마크다운 **'});
  await expect(markdown.locator('[data-apply]')).toBeEnabled();
  await markdown.locator('[data-apply]').click();
  await expect(output).toHaveValue('결론적으로 안내합니다.');
  const transition=page.locator('#issues .item').filter({hasText:'정형 전환어'});
  await expect(transition.locator('.issueOverlap')).toHaveText('겹침 · 일괄');
  await expect(transition.locator('[data-apply]')).toHaveCount(0);
  await page.locator('#applyAllIssues').click();
  await expect(output).toHaveValue('그래서 안내합니다.');
});

test('direct result editing temporarily locks stale correction and restore actions', async ({ page }) => {
  await gotoReady(page);
  const input=page.locator('#input'),output=page.locator('#output');
  await input.fill('결론적으로 안내합니다.');
  await analyzeNow(page,{silent:true});
  await page.locator('#checkpointSave').click();
  await expect(page.locator('#checkpointCount')).toHaveText('1');
  await page.locator('#issuesWidget').click();await expect(page.locator('#issuesPanel')).toBeVisible();
  await page.locator('#editResult').click();
  await expect(output).toHaveJSProperty('readOnly',false);
  await expect(page.locator('#issuesWidget')).toBeHidden();
  await expect(page.locator('#rewriteWidget')).toBeHidden();
  await expect(page.locator('#issuesPanel')).toBeHidden();
  await expect(page.locator('#checkpointOpen')).toBeDisabled();
  await expect(page.locator('#undoStep')).toBeDisabled();
  await expect(page.locator('#resultTabDiff')).toBeDisabled();
  await output.fill('');
  await expect(page.locator('#editResult')).toBeEnabled();
  await output.fill('결론적으로 직접 수정했습니다.');
  await expect(page.locator('#resultNextStep')).toContainText('직접 수정 중');
  await page.locator('#editResult').click();
  await expect(output).toHaveJSProperty('readOnly',true);
  await expect(page.locator('#issuesWidget')).toBeVisible();
  await expect(page.locator('#rewriteWidget')).toBeVisible();
  await expect(page.locator('#checkpointOpen')).toBeEnabled();
  await expect(page.locator('#undoStep')).toBeEnabled();
  await page.locator('#issuesWidget').click();
  await expect(page.locator('#issuesPanel [data-apply]')).toHaveCount(1);
});

test('Blog Factory controller stays out of initial boot and loads only when the tool is opened', async ({ page }) => {
  await gotoReady(page);
  await expect.poll(async()=>page.evaluate(()=>typeof window.AICleanerModules?.createAiWritingOsController)).not.toBe('function');
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#writingTool')).toBeVisible();
  await expect.poll(async()=>page.evaluate(()=>typeof window.AICleanerModules?.createAiWritingOsController),{timeout:5000}).toBe('function');
  await expect.poll(async()=>page.evaluate(()=>window.AICleanerApp.aiWritingOs.loaded)).toBeTruthy();
});

test('Blog Factory Daily Engine handles partial topic data without overstating readiness', async ({ page }) => {
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const topics=Array.from({length:4},(_,i)=>({id:`partial-${i+1}`,rank:20-i,top3:true,title:`부분 주제 ${i+1}`,category:'생활형',whyNow:'오늘 확인',searchIntent:'정보 탐색',angle:'다른 각도',researchNeed:'추가 확인',imageConcept:'생활 장면',priorityScore:80-i}));
  await page.route('**/ai-cleaner/data/daily-topics.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schemaVersion:1,status:'ready',date,timezone:'Asia/Seoul',generatedAtLocal:`${date}T06:20:00+09:00`,webSearchUsed:false,summary:'부분 생성',topics})}));
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osDailyEngineStatus')).toHaveText('부분 준비 · 4/10');
  await expect(page.locator('#osDailyTopics .osDailyTopic')).toHaveCount(4);
  await expect(page.locator('#osDailyTopics .osDailyTopic.top3')).toHaveCount(3);
  await expect(page.locator('#osCopyDailyTopics')).toHaveText('주제 4개 복사');
  await expect(page.locator('#osDailyEngineSummary')).toContainText('4개만 준비');
});

test('Blog Factory Daily Engine renders generated topics and sends a selected topic to daily-one', async ({ page }) => {
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const topics=Array.from({length:10},(_,i)=>({
    id:`topic-${String(i+1).padStart(2,'0')}`,rank:i+1,top3:i<3,title:`자동 주제 ${i+1}`,category:i<3?'시즌형':'에버그린',
    whyNow:`오늘 추천 이유 ${i+1}`,searchIntent:`검색 의도 ${i+1}`,angle:`차별화 각도 ${i+1}`,researchNeed:`확인할 자료 ${i+1}`,imageConcept:`이미지 콘셉트 ${i+1}`,priorityReason:`우선순위 근거 ${i+1}`,priorityScore:95-i
  }));
  await page.route('**/ai-cleaner/data/daily-topics.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schemaVersion:1,status:'ready',date,timezone:'Asia/Seoul',generatedAtLocal:`${date}T06:20:00+09:00`,model:'test-model',engine:'github-actions-openai-responses',webSearchUsed:true,historyCompared:80,summary:'오늘 테스트 주제 10개',topics})}));
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osDailyEngineStatus')).toHaveText('오늘 10개 준비');
  await expect(page.locator('#osDailyTopics .osDailyTopic')).toHaveCount(10);
  await expect(page.locator('#osDailyTopics .osDailyTopic.top3')).toHaveCount(3);
  await expect(page.locator('#osDailyEngineMeta')).toContainText('최근 주제 80개 중복 비교');
  await expect(page.locator('#osDailyEngineMeta')).toContainText('최신 정보 확인 포함');
  await expect(page.locator('#osDailyTopics .osDailyTopicDetails').first()).not.toHaveAttribute('open','');
  await page.locator('#osDailyTopics .osDailyTopicDetails summary').first().click();
  await expect(page.locator('#osDailyTopics .osDailyTopicDetails').first()).toContainText('우선순위 근거 1');
  await page.locator('#osFactoryContext > summary').click();
  await expect(page.locator('#osFacts')).toBeVisible();
  await page.locator('#osFacts').fill('이전 주제의 실제 경험');
  await page.locator('[data-daily-topic-use="0"]').click();
  await expect(page.locator('#osFactoryPresets [data-factory-mode="daily_one"]')).toHaveClass(/active/);
  await expect(page.locator('#osTask')).toHaveValue(/자동 주제 1/);
  await expect(page.locator('#osTask')).toHaveValue(/검색 의도: 검색 의도 1/);
  await expect(page.locator('#osTask')).toHaveValue(/본문 전에 확인할 항목: 확인할 자료 1/);
  await expect(page.locator('#osTask')).toHaveValue(/우선순위 근거: 우선순위 근거 1/);
  await expect(page.locator('#osFacts')).toHaveValue('');
  await expect(page.locator('#osBuildPrompt')).toBeEnabled();
});


test('Blog Factory Daily Engine exposes retry after a fetch failure and recovers on demand', async ({ page }) => {
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  let calls=0;
  await page.route('**/ai-cleaner/data/daily-topics.json*',route=>{
    calls++;
    if(calls===1)return route.fulfill({status:503,contentType:'text/plain',body:'temporary'});
    const topics=Array.from({length:10},(_,i)=>({id:`retry-${i}`,rank:i+1,title:`복구 주제 ${i+1}`,category:'생활형',whyNow:'지금 쓰기 좋음',searchIntent:'정보 탐색',angle:'차별화',researchNeed:'확인 최소',imageConcept:'생활 장면',priorityReason:'실행 가능성이 높음',priorityScore:90-i}));
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schemaVersion:1,status:'ready',date,timezone:'Asia/Seoul',generatedAtLocal:`${date}T06:20:00+09:00`,summary:'복구됨',topics})});
  });
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osDailyEngineStatus')).toHaveText('불러오기 실패');
  await expect(page.locator('#osRefreshDailyTopics')).toBeEnabled();
  await page.locator('#osRefreshDailyTopics').click();
  await expect(page.locator('#osDailyEngineStatus')).toHaveText('오늘 10개 준비');
  await expect(page.locator('#osDailyTopics .osDailyTopic')).toHaveCount(10);
});

test('Blog Factory marks stale Daily Engine topics for today freshness verification', async ({ page }) => {
  const yesterday=new Date(Date.now()-86400000);
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(yesterday);
  const topics=[{id:'stale-1',rank:1,title:'지난 자동 주제',category:'시즌형',whyNow:'이전 추천',searchIntent:'정보 탐색',angle:'각도',researchNeed:'운영시간 재확인',imageConcept:'현장',priorityReason:'이전 기준 우선',priorityScore:90}];
  await page.route('**/ai-cleaner/data/daily-topics.json*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schemaVersion:1,status:'ready',date,timezone:'Asia/Seoul',generatedAtLocal:`${date}T06:20:00+09:00`,topics})}));
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osDailyEngineStatus')).toContainText('지난 데이터');
  await page.locator('[data-daily-topic-use="0"]').click();
  await expect(page.locator('#osTask')).toHaveValue(/오늘 기준 최신성 재확인 필요/);
});

test('Blog Factory builds today topics prompt and never exposes provider launch controls', async ({ page }) => {
  await gotoReady(page);
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#writingTool')).toBeVisible();
  await expect(page.locator('#textTool')).toBeHidden();
  await expect(page.locator('#imageTool')).toBeHidden();
  await expect(page.locator('[data-tool="writing"]')).toHaveText('블로그 팩토리');
  await expect(page.locator('#osStatus')).toBeVisible();await expect(page.locator('#osStatus')).not.toContainText('V7');
  await expect(page.locator('#osStaticMode')).toContainText('오늘의 주제 자동 준비');
  await expect(page.locator('#osFactoryPresets [data-factory-mode="daily_topics"]')).toHaveClass(/active/);
  await expect(page.locator('#osProviders')).toHaveCount(0);
  await expect(page.locator('#osOpenAi')).toHaveCount(0);
  await expect(page.locator('#osSendRaw')).toHaveCount(0);
  await page.locator('#osTask').fill('육아 · 아이와 갈 곳 · 생활정보 · 주말 나들이');
  await page.locator('#osBuildPrompt').click();
  await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await expect(page.locator('#osReadyMessage')).toContainText('오늘의 주제 발굴 프롬프트');
  await expect(page.locator('#osCompilerSummary')).toContainText('주제 10개 + TOP 3');
  await expect(page.locator('#osPromptMetrics')).toContainText('자');
  await expect(page.locator('#osPromptMetrics')).toContainText('줄');
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/# BLOG FACTORY — TODAY TOPIC PROMPT/);
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/오늘의 탐색 각도/);
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/완성 본문은 쓰지 말고 오늘 작성 후보 10개/);
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/TOP 3/);
  await expect(page.locator('#osTaskPackPreview')).not.toHaveValue(/===== 00_OPEN_FIRST\.md =====/);
  await expect(page.locator('#osTaskPackPreview')).not.toHaveValue(/===== 07_STATE_AND_UPDATE\.md =====/);
});

test('Blog Factory keeps its task state separate from text cleaner and survives tool round trips', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoReady(page);
  const source='글 다듬기 쪽 원본은 블로그 팩토리와 별개로 유지되어야 합니다.';
  await page.locator('#input').fill(source);
  await page.locator('[data-tool="writing"]').click();
  await page.locator('#osTask').fill('육아 · 아이와 갈 곳 · 생활정보');
  await page.locator('#osAdvancedSettings > summary').click();
  await page.locator('#osDisplayName').fill('로컬 테스트');
  await page.locator('#osPreferences').fill('문체: 자연스럽게\n이모지: 적게');
  await page.locator('#osSavePrefs').click();
  await page.locator('[data-tool="image"]').click();
  await expect(page.locator('#imageTool')).toBeVisible();
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osTask')).toHaveValue('육아 · 아이와 갈 곳 · 생활정보');
  await expect(page.locator('#osDisplayName')).toHaveValue('로컬 테스트');
  await page.locator('[data-tool="text"]').click();
  await expect(page.locator('#input')).toHaveValue(source);
  const navRows=await page.locator('.toolnav').evaluate(el=>({w:el.getBoundingClientRect().width,children:[...el.children].map(x=>x.getBoundingClientRect())}));
  expect(navRows.children).toHaveLength(4);
  expect(Math.max(...navRows.children.map(r=>r.right))-Math.min(...navRows.children.map(r=>r.left))).toBeLessThanOrEqual(navRows.w+1);
});

test('Blog Factory copy-first flow stays simple on mobile', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('.osSimpleSteps')).toContainText('자동 주제');
  await expect(page.locator('.osSimpleSteps')).toContainText('하나 선택');
  await expect(page.locator('.osSimpleSteps')).toContainText('글 프롬프트');
  await expect(page.locator('.osSimpleSteps')).toContainText('복사');
  await expect(page.locator('#osBuildPrompt')).toBeDisabled();
  await expect(page.locator('#osCopyPack')).toBeDisabled();
  await page.locator('#osTask').fill('아이와 주말 나들이 · 실내 체험 · 생활정보');
  await expect(page.locator('#osBuildPrompt')).toBeEnabled();
  await page.locator('#osBuildPrompt').click();
  await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await expect(page.locator('#osTaskPackPreview')).toBeVisible();
  await expect(page.locator('#osCopyPack')).toBeEnabled();
  await expect(page.locator('#osAfterSend')).toContainText('직접 선택');
  expect(await page.locator('#osAdvancedSettings').evaluate(el=>el.open)).toBe(false);
});

test('Blog Factory switches pipeline semantics across topic and production modes', async ({ page }) => {
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osFactoryPipeline')).toContainText('TOP 3');
  await expect(page.locator('#osImageCount')).toBeDisabled();
  await page.locator('#osFactoryPresets [data-factory-mode="idea_bank"]').click();
  await expect(page.locator('#osImageCount')).toBeDisabled();
  await expect(page.locator('#osFactoryPipeline')).toContainText('20개 정렬');
  await expect(page.locator('#osFactoryPipeline')).toContainText('다음 7일');
  await page.locator('#osTask').fill('육아와 주말 나들이 쪽에서 다음 20개 소재를 비축');
  await page.locator('#osBuildPrompt').click();
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/완성 이미지 패키지는 만들지 않는다/);
  await expect(page.locator('#osTaskPackPreview')).not.toHaveValue(/- 이미지 5장 패키지/);
  await page.locator('#osFactoryPresets [data-factory-mode="free"]').click();
  await expect(page.locator('#osFactoryPipeline')).toContainText('목표·형식');
  await expect(page.locator('#osFactoryPipeline')).toContainText('직접 사용');
  await page.locator('#osFactoryPresets [data-factory-mode="daily_one"]').click();
  await expect(page.locator('#osImageCount')).toBeEnabled();
  await expect(page.locator('#osFactoryPipeline')).toContainText('Creator-10');
});

test('Blog Factory invalidates a built prompt when mode profile or seed changes', async ({ page }) => {
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await page.locator('#osTask').fill('생활정보 · 육아 · 주말 나들이');
  await page.locator('#osBuildPrompt').click();await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await page.locator('#osFactoryPresets [data-factory-mode="daily_one"]').click();await expect(page.locator('#osTaskPackResult')).toBeHidden();
  await page.locator('#osBuildPrompt').click();await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await page.locator('#osAdvancedSettings > summary').click();
  await page.locator('#osMode').selectOption('quick');await expect(page.locator('#osTaskPackResult')).toBeHidden();
  await page.locator('#osBuildPrompt').click();await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await page.locator('#osDisplayName').fill('새 프로필');await expect(page.locator('#osTaskPackResult')).toBeHidden();
  await page.locator('#osTask').fill('완전히 다른 관심 분야');await expect(page.locator('#osTaskPackResult')).toBeHidden();
});

test('Blog Factory daily auto preparation persists seed and restores same-day prompt', async ({ page }) => {
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await page.locator('#osTask').fill('육아 · 아이와 갈 곳 · 생활정보');
  await page.locator('#osAutoDaily').check();
  await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await expect(page.locator('#osAutoDailyStatus')).toContainText('오늘 프롬프트가 이미 준비');
  const firstPrompt=await page.locator('#osTaskPackPreview').inputValue();
  expect(firstPrompt).toContain('오늘의 탐색 각도');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__AI_CLEANER_APP_READY__===true&&!!window.AICleanerApp,{timeout:15000});
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osTask')).toHaveValue('육아 · 아이와 갈 곳 · 생활정보');
  await expect(page.locator('#osAutoDaily')).toBeChecked();
  await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(firstPrompt);
});

test('Blog Factory copy fallback never opens a provider and selects prompt when clipboard is blocked', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoReady(page);
  await page.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('clipboard blocked');}}});
    document.execCommand=()=>false;
    window.__openCount=0;window.open=()=>{window.__openCount++;return{closed:false};};
  });
  await page.locator('[data-tool="writing"]').click();
  await page.locator('#osTask').fill('생활정보 · 정리수납 · 절약');
  await page.locator('#osBuildPrompt').click();
  await page.locator('#osCopyPack').click();
  expect(await page.evaluate(()=>window.__openCount)).toBe(0);
  await expect(page.locator('#osTaskPackPreview')).toBeFocused();
});



test('service worker keeps the core text cleaner available after the network drops', async ({ browser }) => {
  // Normal E2E contexts block SW so page.route() mocks cannot be bypassed by a controller.
  // This one test opts into a fresh SW-enabled context and owns its lifecycle explicitly.
  const context=await browser.newContext({serviceWorkers:'allow'});
  const page=await context.newPage();
  try{
    await page.emulateMedia({reducedMotion:'reduce'});
    await gotoReady(page);
    await page.waitForFunction(async()=>{if(!('serviceWorker' in navigator))return false;const reg=await navigator.serviceWorker.ready;return !!reg?.active;},{timeout:10000});
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:10000});
    const scope=await page.evaluate(async()=>String((await navigator.serviceWorker.ready).scope));
    expect(scope).toContain('/ai-cleaner/');
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded',timeout:15000});
    await page.waitForFunction(()=>window.__AI_CLEANER_APP_READY__===true&&!!window.AICleanerApp,{timeout:15000});
    await page.locator('#input').fill('오프라인에서도 기본 텍스트 정리는 열려야 합니다.');
    await analyzeNow(page,{silent:true});
    await expect(page.locator('#output')).not.toHaveValue('');
  } finally {
    await context.setOffline(false).catch(()=>{});
    await context.close();
  }
});

test('top-level tool tabs support roving keyboard focus and synchronized panel state', async ({ page }) => {
  await gotoReady(page);
  const text=page.locator('#toolTabText'),image=page.locator('#toolTabImage'),writing=page.locator('#toolTabWriting'),reach=page.locator('#toolTabReach');
  await expect(text).toHaveAttribute('role','tab');await expect(text).toHaveAttribute('aria-selected','true');await expect(text).toHaveAttribute('tabindex','0');await expect(page).toHaveTitle(/AI 글 다듬기 \| 곰같은여우의 AI 놀이터/);
  await expect(image).toHaveAttribute('aria-selected','false');await expect(image).toHaveAttribute('tabindex','-1');
  await text.focus();await page.keyboard.press('ArrowRight');
  await expect(image).toBeFocused();await expect(image).toHaveAttribute('aria-selected','true');await expect(page.locator('#imageTool')).toBeVisible();await expect(page.locator('#textTool')).toBeHidden();await expect(page).toHaveTitle(/AI 이미지 검사 \| 곰같은여우의 AI 놀이터/);
  await page.keyboard.press('ArrowRight');await expect(writing).toBeFocused();await expect(writing).toHaveAttribute('aria-selected','true');await expect(page.locator('#writingTool')).toBeVisible();await expect(page).toHaveTitle(/블로그 팩토리 \| 곰같은여우의 AI 놀이터/);
  await page.keyboard.press('End');await expect(reach).toBeFocused();await expect(reach).toHaveAttribute('aria-selected','true');await expect(page.locator('#reachTool')).toBeVisible();await expect(page).toHaveTitle(/GomFox Reach \| 곰같은여우의 AI 놀이터/);
  await page.keyboard.press('Home');await expect(text).toBeFocused();await expect(text).toHaveAttribute('aria-selected','true');await expect(page.locator('#textTool')).toBeVisible();await expect(page.locator('#writingTool')).toBeHidden();
});

test('GomFox Reach 3.0 builds a search plan, accepts multiple sources, and produces an evidence pack', async ({ page }) => {
  await gotoReady(page);await page.locator('#toolTabReach').click();
  await expect(page.locator('#reachTool')).toBeVisible();
  await expect(page.locator('#reachReadyBar')).toBeVisible();
  await expect(page.locator('#reachQuestion')).toBeVisible();
  await expect(page.locator('#reachPlan')).toBeVisible();
  await expect(page.locator('#reachUrls')).toBeVisible();
  await expect(page.locator('#reachFetchMany')).toBeVisible();
  await expect(page.locator('#reachRaw')).toBeVisible();
  await expect(page.locator('#reachAddCurrent')).toBeVisible();
  await expect(page.locator('#reachSources')).toBeVisible();
  await expect(page.locator('#reachClaims')).toBeVisible();
  await expect(page.locator('#reachConflicts')).toBeVisible();
  await expect(page.locator('#reachEvidencePack')).toBeVisible();
  await page.waitForFunction(()=>!!window.GomFoxReach,{timeout:10000});
  await expect(page.locator('#reachEngineBadge')).toContainText('Research Engine 연결 완료');
  await page.locator('#reachQuestion').fill('서울시 육아 지원 정책의 실제 신청 조건은 무엇인가?');
  await page.locator('#reachPlan').click();
  await expect(page.locator('#reachQueries .reachQueryItem')).toHaveCount(5);
  await expect(page.locator('#reachOpenSearch')).toBeEnabled();
  await page.locator('#reachManualLabel').fill('서울시 공식 안내');
  await page.locator('#reachRaw').fill('서울시는 2026년 9월 1일부터 육아 지원 신청을 받습니다. 지원 대상은 서울 거주 가구이며 신청 기준은 공식 안내문에서 확인해야 합니다. 지원 금액은 가구별 조건에 따라 달라질 수 있습니다.');
  await page.locator('#reachAddCurrent').click();
  await page.locator('#reachManualLabel').fill('추가 확인 출처');
  await page.locator('#reachRaw').fill('서울시 육아 지원은 2026년 9월 1일 신청 시작으로 안내됐습니다. 서울 거주 가구가 주요 대상이며 세부 조건은 공고문을 확인해야 합니다. 지원 금액은 조건별로 다릅니다.');
  await page.locator('#reachAddCurrent').click();
  await expect(page.locator('#reachSources .reachSourceItem')).toHaveCount(2);
  await expect(page.locator('#reachAnalyze')).toBeEnabled();
  await page.locator('#reachAnalyze').click();
  await expect(page.locator('#reachResultStatus')).toHaveText('교차검증 완료');
  await expect(page.locator('#reachClaims')).not.toContainText('반복되는 주장과 근거를 찾습니다');
  await expect(page.locator('#reachEvidencePack')).not.toContainText('교차검증을 실행하면');
  await expect(page.locator('#reachCopyAll')).toBeEnabled();
  await expect(page.locator('#reachSaveTxt')).toBeEnabled();
});

test('Blog Factory keeps compact presets and disclosure targets inside narrow mobile viewports', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});await gotoReady(page);await page.locator('#toolTabWriting').click();
  const presets=page.locator('#osFactoryPresets button');
  const first390=await presets.nth(0).boundingBox(),second390=await presets.nth(1).boundingBox(),third390=await presets.nth(2).boundingBox();
  expect(first390&&second390&&third390).toBeTruthy();expect(Math.abs(first390.y-second390.y)).toBeLessThan(2);expect(third390.y).toBeGreaterThan(first390.y+10);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  expect(await page.locator('#osFactoryContext > summary').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({width:320,height:568});
  const first320=await presets.nth(0).boundingBox(),second320=await presets.nth(1).boundingBox();
  expect(first320&&second320).toBeTruthy();expect(second320.y).toBeGreaterThan(first320.y+10);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
