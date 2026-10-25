import {test,expect} from '@playwright/test';
import fs from 'node:fs';

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
  await expect(page).toHaveURL(/\/ai-cleaner\/(?:\?.*)?$/);
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

test('webtoon draft and imported panel image survive reload and file round trip',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'panel.png',mimeType:'image/png',buffer:icon});
  await expect(page.locator('.web-assets img')).toHaveCount(1);
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await expect(page.locator('.web-right .web-layers')).toContainText('컷');
  await expect(page.locator('.web-status')).toContainText('임시 원고 저장됨');
  await page.reload();
  await expect(page.locator('.web-status')).toContainText('임시 원고를 복원했습니다.');
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await expect(page.locator('.web-assets img')).toHaveCount(1);
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-panel img')).toHaveCount(1);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await downloadPromise;
  const bytes=await saved.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  expect(bytes.includes(Buffer.from('project.json'))).toBe(true);
  expect(bytes.includes(Buffer.from('assets/0001.png'))).toBe(true);
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'image-roundtrip.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await expect(page.locator('.web-status')).toContainText('열기 완료');
  await expect(page.locator('.web-panel img')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('webtoon edit history, layer visibility and damaged-file handling work without losing the draft',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'T 텍스트'}).click();
  await expect(page.locator('.web-text')).toHaveCount(1);
  await page.getByRole('button',{name:'레이어·속성 ●'}).click();
  await page.locator('.web-right textarea').fill('되돌릴 대사');
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-text')).toContainText('되돌릴 대사');
  await page.getByRole('button',{name:'↶ 되돌리기'}).click();
  await expect(page.locator('.web-text')).not.toContainText('되돌릴 대사');
  await page.getByRole('button',{name:'↷ 다시'}).click();
  await expect(page.locator('.web-text')).toContainText('되돌릴 대사');
  await page.getByRole('button',{name:'레이어·속성 ●'}).click();
  await page.getByTitle('숨김 전환').first().click();
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-text')).toHaveCount(0);
  await page.getByRole('button',{name:'레이어·속성 ●'}).click();
  await page.getByTitle('숨김 전환').first().click();
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-text')).toContainText('되돌릴 대사');
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'broken.wtoon',mimeType:'application/octet-stream',buffer:Buffer.from('not-a-zip')});
  await expect(page.locator('.web-status')).not.toContainText('열기 완료');
  await expect(page.locator('.web-text')).toContainText('되돌릴 대사');
  expect(errors).toEqual([]);
});

for(const [width,height] of [[320,568],[360,740],[390,844],[768,1024],[1280,800]])test(`webtoon workspace fits ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto(studio);
  await expect(page.locator('.web-app')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.locator('.web-return')).toBeVisible();
  if(width<=760){await expect(page.locator('.web-mobile-nav')).toBeVisible();await page.getByRole('button',{name:'도구',exact:true}).click();await expect(page.locator('.web-side:not(.web-right)')).toBeVisible();}
});
