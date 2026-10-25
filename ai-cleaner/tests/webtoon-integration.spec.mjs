import {test,expect} from '@playwright/test';

const playground=process.env.AI_CLEANER_TEST_URL||'http://127.0.0.1:4173/ai-cleaner/';
const studio=new URL('../AIPlayground/WebtoonStudio/',playground).href;

test('illustrated playground card opens the isolated webtoon studio and returns home',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(playground);
  const card=page.locator('.homeWorldGrid a[href="../AIPlayground/WebtoonStudio/"]');
  await expect(card).toBeVisible();
  await expect(card.locator('img')).toHaveJSProperty('naturalWidth',320);
  await card.click();
  await expect(page).toHaveURL(studio);
  await expect(page.locator('.web-app')).toBeVisible();
  await expect(page.locator('.web-mark')).toHaveCSS('background-image',/home-icon-webtoon\.png/);
  await page.locator('.web-return').click();
  await expect(page).toHaveURL(playground);
  await expect(page.locator('#homeTool')).toBeVisible();
});

test('webtoon studio edits, saves and exports on a narrow mobile screen',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:320,height:568});
  await page.goto(studio);
  await expect(page.locator('.web-app')).toBeVisible();
  await expect(page.locator('.web-mobile-nav')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await expect(page.locator('.web-panel')).toHaveCount(1);
  await expect(page.locator('.web-bubble')).toHaveCount(1);
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.locator('.web-right textarea').fill('웹툰 편집 검사');
  const savePromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await savePromise;
  expect(saved.suggestedFilename()).toMatch(/\.wtoon$/);
  const bytes=await saved.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  expect(bytes.subarray(0,2).toString()).toBe('PK');
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'roundtrip.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await expect(page.locator('.web-status')).toContainText('열기 완료');
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-bubble')).toHaveCount(1);
  const pngPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const png=await pngPromise;
  expect(png.suggestedFilename()).toMatch(/\.zip$/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(errors).toEqual([]);
});
