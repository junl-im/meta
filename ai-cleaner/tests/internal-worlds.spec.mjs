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

for (const width of [320, 1280]) test(`shelf groups verified completion states by league at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:width===320?568:800});
  const response=await page.request.get(new URL('../NaverNovelShelf/site/catalog-feed.json',home).href);
  const feed=await response.json();
  const best=feed.works.filter(work=>work.league==='best');
  const challenge=feed.works.filter(work=>work.league==='challenge');
  expect(best.length).toBeGreaterThanOrEqual(2);expect(challenge.length).toBeGreaterThanOrEqual(1);
  for(const work of feed.works)work.publication_status='ongoing';
  best[0].publication_status='completed';
  await page.route('**/NaverNovelShelf/site/catalog-feed.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
  await page.goto(new URL('../NaverNovelShelf/site/',home).href);
  await expect(page.locator('[aria-label="베스트리그 완결"] .novel-card')).toHaveCount(1);
  await expect(page.locator('[aria-label="베스트리그 완결"] .novel-card')).toHaveAttribute('data-open-novel',best[0].id);
  await expect(page.locator('[aria-label="베스트리그 연재중"] .novel-card')).toHaveCount(best.length-1);
  const bestGroups=page.locator('.league-section[aria-label="베스트리그"] .publication-group');
  await expect(bestGroups.nth(0)).toHaveAttribute('aria-label','베스트리그 완결');
  await expect(bestGroups.nth(1)).toHaveAttribute('aria-label','베스트리그 연재중');
  await expect(page.locator('[aria-label="챌린지리그 완결"]')).toHaveCount(0);
  await expect(page.locator('[aria-label="챌린지리그 연재중"] .novel-card')).toHaveCount(challenge.length);
  await page.locator('[data-league="challenge"]').click();
  await expect(page.locator('[aria-label="베스트리그 연재중"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width===320)expect(await page.locator('.novel-grid').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
});

test('older feed without status keeps verified bundled states and labels new works unknown',async({page})=>{
  const response=await page.request.get(new URL('../NaverNovelShelf/site/catalog-feed.json',home).href);
  const feed=await response.json();const completed=feed.works.find(work=>work.publication_status==='completed');
  expect(completed).toBeTruthy();
  for(const work of feed.works)delete work.publication_status;
  feed.works.push({id:'9999999',title:'상태 확인 작품',author_search_identity:'닥터X',league:'challenge',genre:'판타지',official_url:'https://m.novel.naver.com/challenge/list?novelId=9999999',cover_thumbnail_url:feed.works[0].cover_thumbnail_url});
  await page.route('**/NaverNovelShelf/site/catalog-feed.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(feed)}));
  await page.goto(new URL('../NaverNovelShelf/site/',home).href);
  await expect(page.locator(`[aria-label="베스트리그 완결"] [data-open-novel="${completed.id}"]`)).toBeVisible();
  await expect(page.locator('[aria-label="챌린지리그 상태 확인 중"] [data-open-novel="9999999"]')).toBeVisible();
});

for(const kind of ['empty','stale']) test(`shelf retains current works when a ${kind} feed arrives later`,async({page})=>{
  const response=await page.request.get(new URL('../NaverNovelShelf/site/catalog-feed.json',home).href);
  const feed=await response.json();
  const newer=structuredClone(feed);newer.catalog_last_verified='9999-12-31';
  newer.works.push({id:'9999998',title:'확인된 최신 작품',author_search_identity:'닥터X',league:'challenge',genre:'판타지',publication_status:'ongoing',official_url:'https://m.novel.naver.com/challenge/list?novelId=9999998',cover_thumbnail_url:feed.works[0].cover_thumbnail_url});
  const later=structuredClone(feed);later.catalog_last_verified=kind==='empty'?'9999-12-31':'9999-01-01';
  if(kind==='empty')later.works=[];
  let calls=0;
  await page.addInitScript(()=>{const now=Date.now.bind(Date);window.__timeOffset=0;Date.now=()=>now()+window.__timeOffset;});
  await page.route('**/NaverNovelShelf/site/catalog-feed.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(++calls===1?newer:later)}));
  await page.goto(new URL('../NaverNovelShelf/site/',home).href);
  await expect(page.locator('[data-open-novel="9999998"]')).toBeVisible();
  await page.evaluate(()=>{window.__timeOffset=8*60*60*1000;document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(()=>calls).toBe(2);
  await expect(page.locator('[data-open-novel="9999998"]')).toBeVisible();
  await expect(page.locator('#hero-total')).toHaveText(String(newer.works.length));
});
