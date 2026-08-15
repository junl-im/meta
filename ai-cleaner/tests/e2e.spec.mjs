import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const BASE='http://127.0.0.1:4173/ai-cleaner/';
const versionData=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8'));
const APP_VERSION=String(versionData.version);

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('original auto typewriter writes visible text and removes safe hidden characters', async ({ page }) => {
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
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

test('foundation flow keeps state, layout and rewrite tools coherent', async ({ page }) => {
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
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
  await page.locator('#analyze').evaluate(el=>el.click());
  await expect(output).not.toHaveValue('');
  await expect(output).not.toHaveValue(/\u200B/);
  await expect(page.locator('#issueCount')).toHaveText('1');

  await page.locator('#issuesWidget').click();
  const apply=page.locator('#issuesPanel [data-apply]').first();
  await expect(apply).toBeVisible();await apply.click();await expect(output).toHaveValue(/그래서/);
  await page.locator('#undoStep').click();await expect(output).toHaveValue(/결론적으로/);
  await page.locator('#redoStep').click();await expect(output).toHaveValue(/그래서/);

  await page.locator('#rewriteWidget').click();await expect(page.locator('#rewritePanel')).toBeVisible();await expect(page.locator('#issuesPanel')).toBeHidden();
  await expect.poll(async()=>page.locator('#rewritePanel').evaluate(el=>getComputedStyle(el).resize)).toBe('none');
  await page.locator('#rewriteGenerate').click();await expect(page.locator('#rewriteDraft')).not.toHaveValue('');
  await expect(page.locator('#rewriteDraft')).toHaveValue(/19,900원/);await expect(page.locator('#rewriteFactSummary')).toContainText('잠금');await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#rewriteSource').selectOption('original');await page.locator('#rewriteGenerate').click();
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
  await input.fill('앞\u200B뒤\u00A0끝');await page.locator('#analyze').evaluate(el=>el.click());
  await expect(output).toHaveValue('앞뒤 끝');
  await expect(page.locator('[data-resulttab="xray"]')).toHaveCount(0);

  await input.fill('');
  await expect(output).toHaveValue('');
  await expect(page.locator('#issuesWidget')).toBeHidden();
  await expect(page.locator('#detailSummary')).toHaveText('분석 전');
});


test('layout bridge floats between two cards without reserving a desktop column', async ({ page }) => {
  await page.setViewportSize({width:1280,height:900});
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
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
  await page.goto(BASE,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.pill')).toContainText(APP_VERSION);
  await page.locator('#input').fill('모바일 팝업 테스트입니다. 하지만 문장이 길어지면 검토 제안이 표시될 수 있습니다. 그리고 결과도 확인합니다.');
  await page.locator('#analyze').evaluate(el => el.click());
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
