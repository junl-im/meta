import {test,expect} from '@playwright/test';

const home='http://127.0.0.1:4173/ai-cleaner/';

for(const [name,path,landmark] of [
  ['마음도감','../AIPlayground/MaeumDogam/','곰같은여우의 마음도감'],
  ['곰같은여우의 서재','../NaverNovelShelf/site/','곰같은여우의 소설 서재']
]){
  test(`${name} opens on the same origin and returns to the playground`,async({page})=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.setViewportSize({width:390,height:844});
    await page.goto(home);
    const card=page.locator(`.homeWorldGrid a[href="${path}"]`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page).toHaveURL(new URL(path,home).href);
    await expect(page.locator('.playground-return')).toBeVisible();
    await page.locator('.playground-return').click();
    await expect(page).toHaveURL(home);
    expect(errors).toEqual([]);
  });
}

test('shelf hero illustration loads and Doctor X stays in the verified catalog',async({page})=>{
  await page.goto(new URL('../NaverNovelShelf/site/',home).href);
  const hero=page.locator('.hero-art img');
  await expect.poll(()=>hero.evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);
  const asset=await page.request.get(new URL('./assets/hero-books.webp',page.url()).href);
  expect(asset.status()).toBe(200);
  expect((await asset.body()).length).toBeGreaterThan(1000);
  for(const name of ['library-background.webp','illustrated-icons.webp']){
    const response=await page.request.get(new URL(`./assets/${name}`,page.url()).href);
    expect(response.ok()).toBe(true);
    expect((await response.body()).length).toBeGreaterThan(1000);
    expect(await page.evaluate(async src=>{const image=new Image();image.src=src;await image.decode();return image.naturalWidth},new URL(`./assets/${name}`,page.url()).href)).toBeGreaterThan(0);
  }
  const catalog=await page.evaluate(()=>window.NOVEL_CATALOG);
  expect(catalog.length).toBeGreaterThanOrEqual(28);
  expect(catalog.filter(work=>work.author==='닥터X').map(work=>work.id)).toEqual(expect.arrayContaining(['1245900','1248545','1249473','1250566']));
  await expect(page.locator('.novel-card[data-open-novel="1250566"]')).toBeVisible();
});

test('shelf reads its published feed and updates the visible catalog',async({page})=>{
  const response=await page.request.get(new URL('../NaverNovelShelf/site/catalog-feed.json',home).href);
  expect(response.ok()).toBe(true);
  const feed=await response.json();
  feed.works.push({id:'9999999',title:'새로 확인된 이야기',author_search_identity:'닥터X',league:'challenge',genre:'판타지',official_url:'https://m.novel.naver.com/challenge/list?novelId=9999999',cover_thumbnail_url:feed.works[0].cover_thumbnail_url});
  await page.route('**/NaverNovelShelf/site/catalog-feed.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
  await page.goto(new URL('../NaverNovelShelf/site/',home).href);
  await expect(page.locator('#hero-total')).toHaveText(String(feed.works.length));
  await expect(page.locator('.novel-card[data-open-novel="9999999"]')).toContainText('새로 확인된 이야기');
});

test('shelf keeps its bundled works when the feed is unavailable',async({page})=>{
  await page.route('**/NaverNovelShelf/site/catalog-feed.json',route=>route.fulfill({status:503,body:'temporarily unavailable'}));
  await page.goto(new URL('../NaverNovelShelf/site/',home).href);
  const catalogCount=await page.evaluate(()=>window.NOVEL_CATALOG.length);
  await expect(page.locator('#hero-total')).toHaveText(String(catalogCount));
  await expect(page.locator('.novel-card[data-open-novel="1250566"]')).toBeVisible();
});
