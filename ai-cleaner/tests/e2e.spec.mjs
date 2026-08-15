import { test, expect } from '@playwright/test';



test('original auto typewriter writes into result and verifies exact equality', async ({ page }) => {
  await page.goto('/ai-cleaner/');
  const source='가나다\nABC🙂';
  await page.locator('#input').fill(source);
  await page.locator('#input').dispatchEvent('input');
  await page.locator('#typingPreviewSpeed').selectOption('0');
  await page.locator('#typingPreviewButton').click();
  await expect(page.locator('#output')).toHaveValue(source,{timeout:5000});
  await expect(page.locator('#output')).toHaveAttribute('data-typewriter-verified','true',{timeout:5000});
});
test('AI Cleaner v6.8.2 core browser flow', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/ai-cleaner/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#versionBadge')).toHaveText('v6.8.2');
  await expect(page.locator('#detailDiagnostics')).not.toHaveAttribute('open', '');
  await page.setViewportSize({ width: 820, height: 900 });
  await expect.poll(async () => page.locator('#typingPreviewButton small').evaluate(el => getComputedStyle(el).transform)).toBe('none');
  await expect.poll(async () => page.locator('#typingPreviewButton').evaluate(el => getComputedStyle(el).flexDirection)).toBe('row');
  await page.locator('#rewriteWidget').evaluate(el => { el.hidden=false; });
  await page.locator('#rewriteWidget').click();
  await expect(page.locator('#rewritePanel')).toBeVisible();
  await expect.poll(async () => page.locator('#rewritePanel').evaluate(el => getComputedStyle(el).resize)).toBe('none');
  await page.locator('[data-close-panel="rewritePanel"]').click();

  const input = page.locator('#input');
  const output = page.locator('#output');
  await input.fill('결론적으로 이 문장을 테스트합니다. 가격은 19,900원입니다.\u200B\u00A0');
  await page.locator('#analyze').evaluate(el => el.click());
  await expect(output).not.toHaveValue('');
  await expect(output).not.toHaveValue(/\u200B/);

  await page.locator('#issuesWidget').click();
  const apply = page.locator('#issuesPanel [data-apply]').first();
  await expect(apply).toBeVisible();
  await apply.click();
  await expect(output).toHaveValue(/그래서/);
  await page.locator('#undoStep').click();
  await expect(output).toHaveValue(/결론적으로/);
  await page.locator('#redoStep').click();
  await expect(output).toHaveValue(/그래서/);

  await page.locator('#rewriteWidget').click();
  await expect(page.locator('#rewritePanel')).toBeVisible();
  await page.locator('#rewriteGenerate').click();
  await expect(page.locator('#rewriteDraft')).not.toHaveValue('');
  await expect(page.locator('#rewriteDraft')).toHaveValue(/19,900원/);
  await expect(page.locator('#rewriteFactSummary')).toContainText('잠금');
  await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#rewriteSource').selectOption('original');
  await page.locator('#rewriteGenerate').click();
  await expect(page.locator('#rewriteApply')).toBeEnabled();
  await input.fill('결론적으로 이 문장을 테스트합니다. 가격은 19,900원입니다. 모델은 M60입니다. 변경됨');
  await expect(page.locator('#rewriteApply')).toBeDisabled();
  await expect(page.locator('#rewriteValidation')).toContainText('기준 글이');
  await page.locator('#rewriteGenerate').click();
  await expect(page.locator('#rewriteDraft')).toHaveValue(/M60/);
  await expect(page.locator('#rewriteApply')).toBeEnabled();
  await page.locator('#rewriteApply').click();
  await expect(output).toHaveValue(/19,900원/);
  await expect(page.locator('#rewritePanel')).toBeHidden();
  await expect(page.locator('[data-resulttab="cleaned"]')).toHaveClass(/active/);
  await expect(output).toBeVisible();

  await page.locator('#rewriteWidget').click();
  await expect(page.locator('#rewritePanel')).toBeVisible();
  await page.locator('[data-rewrite-tab="verify"]').click();
  // 원본 그대로 쓰기 defaults to original and blocks clipboard-style insertion.
  await expect(page.locator('#directTarget')).toHaveValue('original');
  await page.locator('#directTyped').focus();
  await page.locator('#directTyped').evaluate(el => { const ev=new InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertFromPaste',data:'PASTE'}); el.dispatchEvent(ev); });
  await expect(page.locator('#directTyped')).toHaveValue('');
  await page.locator('#directTarget').selectOption('output');
  const target = await output.inputValue();
  await page.locator('#directTyped').pressSequentially(target.slice(0, Math.min(6,target.length)), { delay: 5 });
  await expect(page.locator('#directProgress')).toContainText('/');

  await page.locator('[data-resulttab="diff"]').click();
  await expect(page.locator('#diffCount')).not.toHaveText('변경 0곳');

  await input.fill('앞\u200B뒤');
  await page.locator('#analyze').evaluate(el => el.click());
  await page.locator('[data-resulttab="xray"]').click();
  const marker = page.locator('#xrayView [data-xpos]').first();
  await expect(marker).toBeVisible();
  await marker.click();
  await expect.poll(() => input.evaluate(el => el.selectionStart)).toBe(1);
});
