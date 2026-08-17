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
async function analyzeNow(page,{silent=false}={}){return page.evaluate(silentArg=>window.AICleanerApp.analyzeNow(silentArg),silent);}

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
  await typewriter.click();await expect(output).toHaveAttribute('data-typewriter-verified','true',{timeout:7000});await expect(page.locator('#typingPreviewPause')).toHaveText('완료 · 결과 보기');
  await page.locator('#typingPreviewPause').click();await page.locator('#editResult').click();const edited=(await output.inputValue())+' 직접 수정';await output.fill(edited);
  await expect(output).not.toHaveAttribute('data-typewriter-verified','true');await expect(typewriter).not.toHaveClass(/typewriterRecommended/);await expect(page.locator('#typingBridgeStatus')).toContainText('필요할 때 새로쓰기');await expect(next).toContainText('결과를 수정했습니다');
  await page.locator('#editResult').click();await expect(output).toHaveValue(/직접 수정$/);
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
  expect(sourceGeometry).toHaveLength(3);expect(Math.max(...sourceGeometry.map(x=>x.top))-Math.min(...sourceGeometry.map(x=>x.top))).toBeLessThanOrEqual(2);expect(Math.max(...sourceGeometry.map(x=>x.height))).toBeLessThanOrEqual(38);
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
  await page.locator('#liveScan').uncheck();await input.fill('현재​ 원본입니다.');await expect(output).toHaveValue('이전 결과입니다.');
  await page.locator('#typingPreviewSpeed').evaluate(el=>{el.value='40';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#typingPreviewButton').click();await expect(page.locator('#typingPreviewPanel')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('#typingPreviewPanel')).toBeHidden();await expect(input).toHaveJSProperty('readOnly',false);await expect(output).toHaveValue('현재 원본입니다.');await expect(page.locator('#resultFreshness')).toBeHidden();
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

test('a stale text-file read cannot overwrite newer direct input intent', async ({ page }) => {
  await gotoReady(page);
  await page.evaluate(()=>{window.__originalFileText=File.prototype.text;File.prototype.text=function(){if(this.name==='slow.txt')return new Promise(resolve=>setTimeout(()=>resolve('느린 파일이 뒤늦게 완료되었습니다.'),450));return window.__originalFileText.call(this);};});
  await page.locator('#textFileInput').setInputFiles({name:'slow.txt',mimeType:'text/plain',buffer:Buffer.from('느린 파일이 뒤늦게 완료되었습니다.','utf8')});
  await page.waitForTimeout(40);await page.locator('#input').fill('사용자가 나중에 직접 입력한 최신 원본');await page.waitForTimeout(600);
  await expect(page.locator('#input')).toHaveValue('사용자가 나중에 직접 입력한 최신 원본');await expect(page.locator('#output')).toHaveValue(/사용자가 나중에 직접 입력한 최신 원본/);
  await page.evaluate(()=>{File.prototype.text=window.__originalFileText;delete window.__originalFileText;});await expect.poll(async()=>page.evaluate(()=>window.AICleanerApp.workLock.active.filter(x=>x.name.startsWith('text-import-')).length)).toBe(0);
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

test('AI writing OS compiles a concise provider-neutral execution prompt without dumping full OS files', async ({ page }) => {
  await gotoReady(page);
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#writingTool')).toBeVisible();
  await expect(page.locator('#textTool')).toBeHidden();
  await expect(page.locator('#imageTool')).toBeHidden();
  await expect(page.locator('#osStatus')).toContainText('V6.1');
  await expect(page.locator('#osStaticMode')).toContainText('Prompt Compiler');
  await expect(page.locator('#osProviders .osProvider')).toHaveCount(6);
  await page.evaluate(()=>{window.open=()=>({closed:false});});
  await page.locator('#osTask').fill('Apple Vision Pro 배터리 팁으로 네이버 블로그 글 써줘. 제공하지 않은 체험은 만들지 마.');
  await page.locator('#osSendEnhanced').click();
  await expect(page.locator('#osRouteSummary')).toContainText('분류: 블로그');
  await expect(page.locator('#osRouteSummary')).toContainText('CREATOR_10');
  await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await expect(page.locator('#osCompilerSummary')).toContainText('핵심 규칙');
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/# AI CLEANER OS — EXECUTION PROMPT/);
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/네이버 블로그 전용 규칙/);
  await expect(page.locator('#osTaskPackPreview')).toHaveValue(/사용자가 명시하지 않은 구매, 사용, 방문, 가족 반응, 체감 효과/);
  await expect(page.locator('#osTaskPackPreview')).not.toHaveValue(/===== 00_OPEN_FIRST\.md =====/);
  await expect(page.locator('#osTaskPackPreview')).not.toHaveValue(/===== 07_STATE_AND_UPDATE\.md =====/);
});

test('AI writing OS keeps its task state separate from text cleaner and survives tool round trips', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoReady(page);
  const source='글 다듬기 쪽 원본은 AI 글쓰기 OS와 별개로 유지되어야 합니다.';
  await page.locator('#input').fill(source);
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#writingTool')).toBeVisible();
  await page.locator('#osTask').fill('이 제품 인스타 콘텐츠 만들어줘');
  await page.locator('#osAdvancedSettings > summary').click();
  await page.locator('#osDisplayName').fill('로컬 테스트');
  await page.locator('#osPreferences').fill('문체: 자연스럽게\n이모지: 적게');
  await page.locator('#osSavePrefs').click();
  await page.locator('[data-tool="image"]').click();
  await expect(page.locator('#imageTool')).toBeVisible();
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osTask')).toHaveValue('이 제품 인스타 콘텐츠 만들어줘');
  await expect(page.locator('#osDisplayName')).toHaveValue('로컬 테스트');
  await page.locator('[data-tool="text"]').click();
  await expect(page.locator('#input')).toHaveValue(source);
  const navRows=await page.locator('.toolnav').evaluate(el=>({w:el.getBoundingClientRect().width,children:[...el.children].map(x=>x.getBoundingClientRect())}));
  expect(navRows.children).toHaveLength(3);
  expect(Math.max(...navRows.children.map(r=>r.right))-Math.min(...navRows.children.map(r=>r.left))).toBeLessThanOrEqual(navRows.w+1);
});

test('AI writing OS one-action compiler flow stays simple on mobile', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#writingTool')).toBeVisible();
  await expect(page.locator('.osSimpleSteps')).toContainText('원하는 일 적기');
  await expect(page.locator('.osSimpleSteps')).toContainText('내 AI 고르기');
  await expect(page.locator('.osSimpleSteps')).toContainText('강화해서 보내기');
  expect(await page.locator('#osAdvancedSettings').evaluate(el=>el.open)).toBe(false);
  await expect(page.locator('#osSendEnhanced')).toBeDisabled();
  await expect(page.locator('#osSendRaw')).toBeDisabled();
  await expect(page.locator('#osProviders .osProvider.active')).toHaveText('ChatGPT');
  await expect(page.locator('#osProviderHint')).toContainText('ChatGPT 선택됨');
  await expect(page.locator('#osDeliveryTitle')).toContainText('PC 연결');
  await expect(page.locator('#osSendEnhancedLabel')).toContainText('ChatGPT 열기');
  await page.locator('#osTask').fill('부산 아이와 가볼만한곳 키워드로 자연스러운 네이버 블로그 글 써줘.');
  await expect(page.locator('#osSendEnhanced')).toBeEnabled();
  await expect(page.locator('#osSendRaw')).toBeEnabled();
  await page.evaluate(()=>{window.open=()=>({closed:false});});
  await page.locator('#osSendEnhanced').click();
  await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await expect(page.locator('#osReadyMessage')).toContainText('ChatGPT');
  await expect(page.locator('#osAppliedChips span')).toHaveCount(4);
  await expect(page.locator('#osAfterSend')).toContainText('붙여넣기');
  await expect(page.locator('#osCopyPack')).toBeEnabled();
  await expect(page.locator('#osOpenAi')).toBeEnabled();
  expect(await page.locator('#osAdvancedSettings').evaluate(el=>el.open)).toBe(false);
});

test('AI writing OS shows an honest mobile share plan and sends the compiled prompt through the system share path', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await gotoReady(page);
  await page.evaluate(()=>{
    Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,value:1});
    Object.defineProperty(navigator,'share',{configurable:true,value:async payload=>{window.__osSharedPayload=payload;}});
  });
  await page.locator('[data-tool="writing"]').click();
  await expect(page.locator('#osDeliveryTitle')).toContainText('모바일 연결');
  await expect(page.locator('#osDeliveryHint')).toContainText('ChatGPT 앱을 선택하세요');
  await expect(page.locator('#osDeliveryHint')).toContainText('강제로 열지는 않습니다');
  await expect(page.locator('#osSendEnhancedLabel')).toHaveText('OS로 강화해서 공유하기');
  await page.locator('#osTask').fill('회의 내용을 한 페이지 보고서로 정리해줘.');
  await page.locator('#osSendEnhanced').click();
  await expect(page.locator('#osReadyMessage')).toContainText('시스템 공유');
  const shared=await page.evaluate(()=>window.__osSharedPayload);
  expect(shared.text).toContain('# AI CLEANER OS — EXECUTION PROMPT');
  expect(shared.text).toContain('회의 내용을 한 페이지 보고서로 정리해줘.');
});

test('AI writing OS invalidates a compiled prompt when provider mode or profile changes', async ({ page }) => {
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();await page.evaluate(()=>{window.open=()=>({closed:false});});
  await page.locator('#osTask').fill('이 제품 인스타 콘텐츠를 만들어줘.');await page.locator('#osSendEnhanced').click();await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await page.locator('#osProviders [data-provider="claude"]').click();await expect(page.locator('#osTaskPackResult')).toBeHidden();await page.locator('#osSendEnhanced').click();await expect(page.locator('#osReadyMessage')).toContainText('Claude');
  await page.locator('#osAdvancedSettings > summary').click();await page.locator('#osMode').selectOption('quick');await expect(page.locator('#osTaskPackResult')).toBeHidden();await page.locator('#osSendEnhanced').click();await expect(page.locator('#osTaskPackResult')).toBeVisible();
  await page.locator('#osDisplayName').fill('새 프로필');await expect(page.locator('#osTaskPackResult')).toBeHidden();await expect(page.locator('#osSendEnhanced')).toBeEnabled();
});

test('AI writing OS remembers the selected AI and keeps the original two tools untouched after reload', async ({ page }) => {
  await gotoReady(page);await page.locator('[data-tool="writing"]').click();
  await page.locator('#osProviders [data-provider="claude"]').click();await expect(page.locator('#osProviders .osProvider.active')).toHaveText('Claude');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__AI_CLEANER_APP_READY__===true&&!!window.AICleanerApp,{timeout:15000});
  await page.locator('[data-tool="writing"]').click();await expect(page.locator('#osProviders .osProvider.active')).toHaveText('Claude');
  await page.locator('[data-tool="text"]').click();await expect(page.locator('#textTool')).toBeVisible();
  await page.locator('[data-tool="image"]').click();await expect(page.locator('#imageTool')).toBeVisible();
});

