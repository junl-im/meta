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
  const catalog=await page.evaluate(()=>window.NOVEL_CATALOG);
  expect(catalog).toHaveLength(27);
  expect(catalog.filter(work=>work.author==='닥터X').map(work=>work.id).sort()).toEqual(['1245900','1248545']);
});
