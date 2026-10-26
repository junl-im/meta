import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {inflateRawSync} from 'node:zlib';

const playground=process.env.AI_CLEANER_TEST_URL||'http://127.0.0.1:4173/ai-cleaner/';
const studio=new URL('../AIPlayground/WebtoonStudio/',playground).href;
function pngPagesFromZip(bytes){
  let offset=0;const pages=new Map();
  while(offset+30<=bytes.length&&bytes.readUInt32LE(offset)===0x04034b50){
    const method=bytes.readUInt16LE(offset+8),size=bytes.readUInt32LE(offset+18),nameSize=bytes.readUInt16LE(offset+26),extraSize=bytes.readUInt16LE(offset+28);
    const name=bytes.subarray(offset+30,offset+30+nameSize).toString(),start=offset+30+nameSize+extraSize,end=start+size;
    if(name.endsWith('.png'))pages.set(name,method===8?inflateRawSync(bytes.subarray(start,end)):bytes.subarray(start,end));
    offset=end;
  }
  if(!pages.size)throw Error('PNG page missing from export ZIP');
  return pages;
}
const firstPngFromZip=bytes=>pngPagesFromZip(bytes).values().next().value;

test('bubble variants, inline text, context actions and sidebar scroll work',async({page})=>{
  await page.setViewportSize({width:1280,height:650});
  await page.goto(studio);
  await page.getByRole('button',{name:'생각',exact:true}).click();
  await expect(page.locator('.web-bubble')).toHaveCount(1);
  await page.getByRole('textbox',{name:'말풍선에 바로 글쓰기'}).fill('캔버스에서 바로 쓴 대사');
  await expect(page.locator('.web-bubble')).toContainText('캔버스에서 바로 쓴 대사');
  await page.locator('.web-bubble').click({button:'right'});
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menuitem',{name:'복제'}).click();
  await expect(page.locator('.web-bubble')).toHaveCount(2);
  const sidebar=await page.locator('.web-right').evaluate(el=>({height:el.clientHeight,content:el.scrollHeight,overflow:getComputedStyle(el).overflowY,track:getComputedStyle(el).scrollbarColor}));
  expect(sidebar.content).toBeGreaterThan(sidebar.height);
  expect(sidebar.overflow).toBe('auto');
  expect(sidebar.track).toContain('rgb');
  await page.locator('.web-right').evaluate(el=>el.scrollTop=el.scrollHeight);
  expect(await page.locator('.web-right').evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
});

test('new project clears the restored draft',async({page})=>{
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await expect(page.locator('.web-status')).toContainText('임시 원고 저장됨');
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'새 원고'}).click();
  await expect(page.locator('.web-panel')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.web-panel')).toHaveCount(0);
});

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

test('bubble tail moves by touch-sized handle and coordinates survive save and reopen',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  const handle=page.getByRole('button',{name:'말풍선 꼬리 이동'});
  await expect(handle).toBeVisible();
  const before=await handle.boundingBox();
  await page.mouse.move(before.x+20,before.y+20);
  await page.mouse.down();
  await page.mouse.move(before.x+48,before.y+55,{steps:5});
  await page.mouse.up();
  const after=await handle.boundingBox();
  expect(after.x).toBeGreaterThan(before.x+15);
  expect(after.y).toBeGreaterThan(before.y+15);
  await page.getByRole('button',{name:/레이어·속성/}).click();
  const tailX=page.getByRole('spinbutton',{name:'꼬리 좌우'}),tailY=page.getByRole('spinbutton',{name:'꼬리 상하'});
  await expect(tailX).not.toHaveValue('210');
  await tailX.fill('130');await tailY.fill('190');
  const savePromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await savePromise;
  const bytes=await saved.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'tail.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await expect(page.locator('.web-status')).toContainText('열기 완료');
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.locator('.web-layers button').first().click();
  await expect(tailX).toHaveValue('130');await expect(tailY).toHaveValue('190');
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  const pngPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const pngZip=await pngPromise;
  const zipBytes=await pngZip.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  const png=firstPngFromZip(zipBytes);
  expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  const tailPixels=await page.evaluate(async encoded=>{
    const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    let count=0;for(let y=245;y<285;y++)for(let x=170;x<200;x++){const pixel=ctx.getImageData(x,y,1,1).data;if(pixel[0]<200||pixel[1]<200||pixel[2]<200)count++}return count;
  },png.toString('base64'));
  expect(tailPixels).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('mobile canvas fit stays available after manual zoom and rotation',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:320,height:568});
  await page.goto(studio);
  const fit=page.getByRole('button',{name:'너비 맞춤'}),slider=page.locator('.web-toolbar input[type=range]');
  await expect(fit).toBeVisible();await expect(slider).toBeVisible();
  await slider.fill('1.25');
  await expect(page.locator('.web-canvas')).toHaveCSS('width','862.5px');
  await fit.click();
  expect(await page.locator('.web-canvas').evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(290);
  await page.setViewportSize({width:430,height:900});
  await expect.poll(()=>page.locator('.web-canvas').evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThan(300);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(430);
  expect(errors).toEqual([]);
});

test('image-heavy edit history keeps the imported artwork through repeated metadata edits',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const image=fs.readFileSync(new URL('../assets/icon-v66-512.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'art.png',mimeType:'image/png',buffer:image});
  await expect(page.locator('.web-assets img')).toHaveCount(1);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  const title=page.locator('.web-side label').filter({hasText:'작품명'}).locator('input');
  for(let index=0;index<10;index++)await title.fill(`원고 ${index}`);
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-panel img')).toHaveCount(1);
  await page.getByRole('button',{name:'↶ 되돌리기'}).click();
  await expect(page.locator('.web-panel img')).toHaveCount(1);
  await page.getByRole('button',{name:'↷ 다시'}).click();
  await expect(page.locator('.web-panel img')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('locked bubble resists property edits and deletion, and narration hides the tail controls',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.locator('.web-right textarea').fill('잠금 전 대사');
  await page.getByTitle('잠금 전환').first().click();
  await page.locator('.web-right textarea').fill('잠금 후 대사');
  await page.getByRole('button',{name:'선택 요소 삭제'}).click();
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-bubble')).toContainText('잠금 전 대사');
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.getByTitle('잠금 전환').first().click();
  await page.locator('.web-right select').filter({has:page.locator('option[value="narration"]')}).selectOption('narration');
  await expect(page.locator('.web-tail-controls')).toHaveCount(0);
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await expect(page.locator('.web-tail-handle')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('touch drag adjusts the bubble tail on an emulated phone',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(studio);
    await page.getByRole('button',{name:'도구',exact:true}).click();
    await page.getByRole('button',{name:'◯ 말풍선'}).click();
    const handle=page.getByRole('button',{name:'말풍선 꼬리 이동'}),before=await handle.boundingBox();
    const x=before.x+20,y=before.y+20,cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+45}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const after=await handle.boundingBox();
    expect(after.x).toBeGreaterThan(before.x+10);
    await page.getByRole('button',{name:/레이어·속성/}).click();
    await expect(page.getByRole('spinbutton',{name:'꼬리 좌우'})).not.toHaveValue('210');
    expect(errors).toEqual([]);
  }finally{await context.close()}
});

test('PNG split keeps a bubble tail crossing the page boundary',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.locator('.web-right .web-metrics label').filter({hasText:'위쪽'}).locator('input').first().fill('1850');
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const saved=await downloadPromise;
  const bytes=await saved.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  const pages=pngPagesFromZip(bytes);
  const second=pages.get('002.png');expect(second).toBeTruthy();
  const count=await page.evaluate(async encoded=>{
    const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    let count=0;for(let y=1;y<55;y++)for(let x=210;x<280;x++){const data=ctx.getImageData(x,y,1,1).data;if(data[0]<200||data[1]<200||data[2]<200)count++}return count;
  },second.toString('base64'));
  expect(count).toBeGreaterThan(0);
});

test('speech bubble fill stays continuous from body to tail tip',async({page})=>{
  await page.setViewportSize({width:390,height:568});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await expect(page.locator('.web-bubble-canvas')).toBeVisible();
  const sample=await page.locator('.web-bubble-canvas').evaluate(canvas=>{
    const ctx=canvas.getContext('2d'),pixels=[],scale=canvas.width/310;
    for(let y=125;y<=190;y+=5)pixels.push(ctx.getImageData(Math.round(215*scale),Math.round((y+5)*scale),1,1).data[3]);
    const seam=[...ctx.getImageData(Math.round(215*scale),Math.round(135*scale),1,1).data].slice(0,3);
    return{pixels,seam};
  });
  expect(sample.pixels.every(alpha=>alpha>0)).toBe(true);
  expect(sample.seam.every(channel=>channel>240)).toBe(true);
});

for(const [width,height] of [[320,360],[320,568],[390,568],[430,900]])test(`mobile bottom navigation remains within ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto(studio);
  const bounds=await page.evaluate(()=>({nav:document.querySelector('.web-mobile-nav').getBoundingClientRect().toJSON(),status:document.querySelector('.web-status').getBoundingClientRect().toJSON(),viewport:visualViewport?.height||innerHeight}));
  expect(bounds.nav.top).toBeGreaterThanOrEqual(0);
  expect(bounds.nav.bottom).toBeLessThanOrEqual(bounds.viewport+1);
  expect(bounds.status.bottom).toBeLessThanOrEqual(bounds.viewport+1);
});

for(const [width,height] of [[320,568],[360,740],[390,844],[768,1024],[1280,800]])test(`webtoon workspace fits ${width}x${height}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.goto(studio);
  await expect(page.locator('.web-app')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.locator('.web-return')).toBeVisible();
  if(width<=760){await expect(page.locator('.web-mobile-nav')).toBeVisible();await page.getByRole('button',{name:'도구',exact:true}).click();await expect(page.locator('.web-side:not(.web-right)')).toBeVisible();}
});


test('desktop shortcuts save and undo without stealing text field undo',async({page})=>{
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await expect(page.locator('.web-panel')).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.web-panel')).toHaveCount(0);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.web-panel')).toHaveCount(1);
  const title=page.getByLabel('작품명');
  await title.fill('바뀐 제목');
  await title.press('Control+z');
  await expect(page.locator('.web-panel')).toHaveCount(1);
  const download=page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  expect((await download).suggestedFilename()).toMatch(/\.wtoon$/);
});

test('panel shape preview matches rounded and ellipse PNG outlines',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const panel=page.locator('.web-panel-content');
  const shape=page.locator('.web-right label').filter({hasText:'컷 모양'}).locator('select');
  await shape.selectOption('ellipse');
  await expect(panel).toHaveCSS('border-radius','50%');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const file=await download;
  const bytes=await file.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  const first=pngPagesFromZip(bytes).get('001.png');
  const pixels=await page.evaluate(async data=>{
    const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    const at=(x,y)=>[...ctx.getImageData(Math.round(x*image.width/690),Math.round(y*image.width/690),1,1).data].slice(0,3);
    return {corner:at(57,102),top:at(345,100),side:at(55,320)};
  },first.toString('base64'));
  expect(pixels.corner.every(value=>value>245)).toBe(true);
  expect(pixels.top.some(value=>value<150)).toBe(true);
  expect(pixels.side.some(value=>value<150)).toBe(true);
  await shape.selectOption('rounded');
  await expect(panel).toHaveCSS('border-radius',/px/);
});

test('panel image flip is editable and survives file round trip',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const image=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=20;canvas.height=10;const ctx=canvas.getContext('2d');ctx.fillStyle='#f00';ctx.fillRect(0,0,10,10);ctx.fillStyle='#00f';ctx.fillRect(10,0,10,10);return canvas.toDataURL('image/png').split(',')[1]});
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'halves.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
  const flip=page.getByRole('button',{name:/이미지 좌우 반전/});
  await expect(flip).toBeVisible();
  await flip.click();
  await expect(flip).toHaveAttribute('aria-pressed','true');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await download;const bytes=await saved.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'flipped.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await page.locator('.web-layers button').first().click();
  await expect(flip).toHaveAttribute('aria-pressed','true');
  const pngDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const png=firstPngFromZip(await (await pngDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)}));
  const colors=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return {left:[...ctx.getImageData(100,300,1,1).data],right:[...ctx.getImageData(580,300,1,1).data]}},png.toString('base64'));
  expect(colors.left[2]).toBeGreaterThan(colors.left[0]);
  expect(colors.right[0]).toBeGreaterThan(colors.right[2]);
});
