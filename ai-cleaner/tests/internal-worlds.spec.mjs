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
