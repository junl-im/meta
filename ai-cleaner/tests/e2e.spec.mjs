import { test, expect } from '@playwright/test';

test('AI Cleaner v6.8 core browser flow', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/ai-cleaner/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#versionBadge')).toHaveText('v6.8');
  await expect(page.locator('#detailDiagnostics')).not.toHaveAttribute('open', '');

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
  await page.locator('#rewriteApply').click();
  await expect(output).toHaveValue(/19,900원/);

  await page.locator('[data-rewrite-tab="verify"]').click();
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
