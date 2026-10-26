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
async function dropImage(page,selector,buffer){
  await page.evaluate(({selector,bytes})=>{
    const file=new File([new Uint8Array(bytes)],'dropped.png',{type:'image/png'});
    const transfer=new DataTransfer();transfer.items.add(file);
    const target=document.querySelector(selector);
    target.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    target.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  },{selector,bytes:[...buffer]});
}

test('dropping an image on a panel fills it while canvas drop creates another panel',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await dropImage(page,'.web-panel',icon);
  await expect(page.locator('.web-panel img')).toHaveCount(1);
  await expect(page.locator('.web-panel')).toHaveCount(1);
  await dropImage(page,'.web-canvas',icon);
  await expect(page.locator('.web-panel img')).toHaveCount(2);
  await expect(page.locator('.web-panel')).toHaveCount(2);
});

test('mobile image import creates a panel and the library reuses it',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'first.png',mimeType:'image/png',buffer:icon});
  const panel=page.locator('.web-panel');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('img')).toBeVisible();
  await expect(page.locator('.web-app')).toHaveAttribute('data-mobile-tab','canvas');
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.locator('.web-assets button').first().click();
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('img')).toBeVisible();
});

test('several images become separate panels and extend the canvas',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(['one.png','two.png','three.png'].map(name=>({name,mimeType:'image/png',buffer:icon})));
  const panels=page.locator('.web-panel');
  await expect(panels).toHaveCount(3);
  await expect(panels.locator('img')).toHaveCount(3);
  const boxes=await panels.evaluateAll(nodes=>nodes.map(node=>({top:Number.parseFloat(node.style.top),height:Number.parseFloat(node.style.height)})));
  expect(boxes[1].top).toBeGreaterThan(boxes[0].top+boxes[0].height);
  expect(boxes[2].top).toBeGreaterThan(boxes[1].top+boxes[1].height);
  const canvasHeight=await page.locator('.web-canvas').evaluate(node=>Number.parseFloat(node.style.height));
  expect(canvasHeight).toBeGreaterThan(boxes[2].top+boxes[2].height);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await expect(page.locator('.web-assets button')).toHaveCount(3);
});

test('mobile panel can split left and right and undo restores the original',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.getByRole('button',{name:'좌우로 나누기'}).click();
  const panels=page.locator('.web-panel');
  await expect(panels).toHaveCount(2);
  const boxes=await panels.evaluateAll(nodes=>nodes.map(node=>({left:Number.parseFloat(node.style.left),width:Number.parseFloat(node.style.width)})));
  expect(boxes[1].left).toBeGreaterThan(boxes[0].left+boxes[0].width);
  await page.getByRole('button',{name:'되돌리기'}).click();
  await expect(panels).toHaveCount(1);
  await panels.first().click();
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.getByRole('button',{name:'위아래로 나누기'}).click();
  await expect(panels).toHaveCount(2);
  const rows=await panels.evaluateAll(nodes=>nodes.map(node=>({top:Number.parseFloat(node.style.top),height:Number.parseFloat(node.style.height)})));
  expect(rows[1].top).toBeGreaterThan(rows[0].top+rows[0].height);
});

test('splitting an illustrated panel keeps the original image composition in PNG',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const image=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=20;canvas.height=10;const ctx=canvas.getContext('2d');ctx.fillStyle='#f00';ctx.fillRect(0,0,10,10);ctx.fillStyle='#00f';ctx.fillRect(10,0,10,10);return canvas.toDataURL('image/png').split(',')[1]});
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'halves.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
  await page.getByRole('button',{name:'좌우로 나누기'}).click();
  await expect(page.locator('.web-panel img')).toHaveCount(2);
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const png=firstPngFromZip(await (await download).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)}));
  const colors=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);return {left:[...ctx.getImageData(200,300,1,1).data],right:[...ctx.getImageData(500,300,1,1).data]}},png.toString('base64'));
  expect(colors.left[0]).toBeGreaterThan(200);expect(colors.left[2]).toBeLessThan(50);
  expect(colors.right[2]).toBeGreaterThan(200);expect(colors.right[0]).toBeLessThan(50);
});

test('touch-sized image adjustment moves artwork inside a panel without moving the panel',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'art.png',mimeType:'image/png',buffer:icon});
  const panel=page.locator('.web-panel');
  const before=await panel.boundingBox();
  await panel.getByRole('button',{name:'이미지 위치 조절'}).click();
  const point={x:before.x+before.width*.4,y:before.y+before.height*.5};
  await page.mouse.move(point.x,point.y);await page.mouse.down();
  await page.mouse.move(point.x+38,point.y+22,{steps:5});await page.mouse.up();
  const after=await panel.boundingBox();
  expect(after.x).toBeCloseTo(before.x,0);
  expect(after.y).toBeCloseTo(before.y,0);
  const transform=await panel.locator('img').evaluate(node=>getComputedStyle(node).transform);
  const [,x,y]=transform.match(/matrix\(1, 0, 0, 1, ([\d.]+), ([\d.]+)\)/)||[];
  expect(Number(x)).toBeGreaterThan(30);
  expect(Number(y)).toBeGreaterThan(15);
  await panel.getByRole('button',{name:'위치 조절 끝'}).click();
});

test('image adjustment responds to a phone touch gesture',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  try{
    await page.goto(studio);
    const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
    await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'touch.png',mimeType:'image/png',buffer:icon});
    const panel=page.locator('.web-panel'),before=await panel.boundingBox();
    await panel.getByRole('button',{name:'이미지 위치 조절'}).click();
    const x=before.x+before.width*.4,y=before.y+before.height*.5,cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+32,y:y+24}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const transform=await panel.locator('img').evaluate(node=>getComputedStyle(node).transform);
    expect(Number(transform.match(/matrix\(1, 0, 0, 1, ([\d.]+),/)?.[1])).toBeGreaterThan(20);
    expect((await panel.boundingBox()).x).toBeCloseTo(before.x,0);
  }finally{await context.close()}
});

test('mobile first-use guide starts a panel and a typed bubble can still be dragged',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  const guide=page.locator('.web-empty-guide');
  await expect(guide).toBeVisible();
  await guide.getByRole('button',{name:'첫 컷 만들기'}).click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('.web-panel')).toHaveCount(1);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  const bubble=page.locator('.web-bubble');
  await page.getByRole('textbox',{name:'말풍선에 바로 글쓰기'}).fill('이동 테스트');
  const before=await bubble.boundingBox();
  const handle=bubble.getByRole('button',{name:'선택 요소 이동'});
  const point=await handle.boundingBox();
  await page.mouse.move(point.x+point.width/2,point.y+point.height/2);
  await page.mouse.down();await page.mouse.move(point.x+point.width/2+32,point.y+point.height/2+24,{steps:5});await page.mouse.up();
  const after=await bubble.boundingBox();
  expect(after.x).toBeGreaterThan(before.x+20);
  expect(after.y).toBeGreaterThan(before.y+12);
  await expect(bubble).toContainText('이동 테스트');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('canvas alignment controls center and edge-place a panel without moving a locked one',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.getByRole('button',{name:'가로 가운데'}).click();
  await page.getByRole('button',{name:'위쪽'}).click();
  await expect(page.getByLabel('왼쪽', {exact:true})).toHaveValue('55');
  await expect(page.getByLabel('위쪽',{exact:true})).toHaveValue('0');
  await page.getByRole('button',{name:'오른쪽',exact:true}).click();
  await expect(page.getByLabel('왼쪽',{exact:true})).toHaveValue('110');
  await page.locator('.web-layers .active button[title="잠금 전환"]').click();
  await expect(page.getByRole('button',{name:'왼쪽',exact:true})).toBeDisabled();
});

test('web editor reorders layers and keeps rotation, image filter and text alignment through save',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.locator('.web-layers>div').last().locator('button').first().click();
  const first=page.locator('.web-panel.is-selected');
  const before=Number(await first.evaluate(el=>getComputedStyle(el).zIndex));
  await page.locator('.web-layers .active').getByRole('button',{name:'레이어 앞으로'}).click();
  expect(Number(await first.evaluate(el=>getComputedStyle(el).zIndex))).toBeGreaterThan(before);
  await page.getByLabel('회전 각도').fill('18');
  await expect(first).toHaveCSS('transform',/matrix/);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'color.png',mimeType:'image/png',buffer:icon});
  await page.getByLabel('이미지 필터').selectOption('bw');
  await expect(first.locator('img')).toHaveCSS('filter','grayscale(1)');
  await page.getByRole('button',{name:'T 텍스트'}).click();
  await page.locator('.web-right textarea').fill('정렬 검사');
  await page.getByLabel('글 정렬').selectOption('right');
  await expect(page.locator('.web-text-content')).toHaveCSS('text-align','right');
  const savePromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await savePromise;
  const bytes=await saved.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'styles.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await expect(page.locator('.web-text-content')).toHaveCSS('text-align','right');
  await expect(page.locator('.web-panel img')).toHaveCSS('filter','grayscale(1)');
  const pngPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const png=await pngPromise;
  expect(png.suggestedFilename()).toMatch(/\.zip$/);
});

test('canvas resize handles and editing shortcuts work without hijacking text input',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const panel=page.locator('.web-panel');
  const before=await panel.boundingBox();
  const handle=panel.getByRole('button',{name:'크기 조절 se'});
  const point=await handle.boundingBox();
  await page.mouse.move(point.x+point.width/2,point.y+point.height/2);
  await page.mouse.down();await page.mouse.move(point.x+point.width/2+60,point.y+point.height/2+40,{steps:5});await page.mouse.up();
  const after=await panel.boundingBox();
  expect(after.width).toBeGreaterThan(before.width+30);
  expect(after.height).toBeGreaterThan(before.height+20);
  await page.locator('.web-toolbar').click();
  await page.keyboard.press('Control+d');
  await expect(page.locator('.web-panel')).toHaveCount(2);
  await page.keyboard.press('Delete');
  await expect(page.locator('.web-panel')).toHaveCount(1);
  await page.locator('.web-panel').click({button:'right'});
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.locator('.web-canvas').click({button:'right',position:{x:5,y:5}});
  await expect(page.getByRole('menu',{name:'캔버스 메뉴'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('bubble size can be changed with a touch-sized handle on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  const bubble=page.locator('.web-bubble');
  const before=await bubble.boundingBox();
  const handle=bubble.getByRole('button',{name:'크기 조절 se'});
  const point=await handle.boundingBox();
  await page.mouse.move(point.x+point.width/2,point.y+point.height/2);
  await page.mouse.down();await page.mouse.move(point.x+point.width/2+50,point.y+point.height/2+30,{steps:4});await page.mouse.up();
  const after=await bubble.boundingBox();
  expect(after.width).toBeGreaterThan(before.width+20);
  expect(after.height).toBeGreaterThan(before.height+10);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('bubble variants, inline text, context actions and sidebar scroll work',async({page})=>{
  await page.setViewportSize({width:1280,height:650});
  await page.goto(studio);
  await page.getByRole('button',{name:'생각',exact:true}).click();
  await expect(page.locator('.web-bubble')).toHaveCount(1);
  await page.getByRole('textbox',{name:'말풍선에 바로 글쓰기'}).fill('캔버스에서 바로 쓴 대사');
  await expect(page.locator('.web-bubble')).toContainText('캔버스에서 바로 쓴 대사');
  await page.locator('.web-bubble').click({button:'right',position:{x:5,y:5}});
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

test('blank canvas right-click places elements at the chosen point',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  const canvas=page.locator('.web-canvas');
  await canvas.click({button:'right',position:{x:280,y:340}});
  await expect(page.getByRole('menu',{name:'캔버스 메뉴'})).toBeVisible();
  await page.getByRole('menuitem',{name:'말풍선 추가'}).click();
  const canvasBox=await canvas.boundingBox(),bubbleBox=await page.locator('.web-bubble').boundingBox();
  expect(Math.abs(bubbleBox.x-canvasBox.x-280)).toBeLessThan(3);
  expect(Math.abs(bubbleBox.y-canvasBox.y-340)).toBeLessThan(3);
});

test('selected bubble changes kind in place from thumbnails and right-click',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await page.getByRole('textbox',{name:'말풍선에 바로 글쓰기'}).fill('같은 말풍선 유지');
  await page.getByRole('button',{name:'구름',exact:true}).click();
  await expect(page.getByLabel('말풍선 유형')).toHaveValue('cloud');
  await expect(page.locator('.web-bubble')).toHaveCount(1);
  await page.locator('.web-bubble').click({button:'right',position:{x:5,y:5}});
  await page.getByRole('menuitem',{name:'외침'}).click();
  await expect(page.getByLabel('말풍선 유형')).toHaveValue('shout');
  await expect(page.locator('.web-bubble')).toHaveCount(1);
  await expect(page.locator('.web-bubble')).toContainText('같은 말풍선 유지');
});

test('element copy, cut and paste work from canvas menu and keyboard',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.locator('.web-panel').click({button:'right',position:{x:5,y:5}});
  await page.getByRole('menuitem',{name:'요소 복사'}).click();
  await page.locator('.web-canvas').click({button:'right',position:{x:5,y:5}});
  await page.getByRole('menuitem',{name:'여기에 붙여넣기'}).click();
  await expect(page.locator('.web-panel')).toHaveCount(2);
  await page.keyboard.press('Control+x');
  await expect(page.locator('.web-panel')).toHaveCount(1);
  await page.keyboard.press('Control+v');
  await expect(page.locator('.web-panel')).toHaveCount(2);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.web-panel')).toHaveCount(1);
});

test('mobile tools can paste a copied bubble without intercepting dialogue editing',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.getByRole('button',{name:'요소 복사'}).click();
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▤ 붙여넣기'}).click();
  await expect(page.locator('.web-bubble')).toHaveCount(2);
  const dialogue=page.getByRole('textbox',{name:'말풍선에 바로 글쓰기'});
  await dialogue.fill('대사는 편집 중');
  await dialogue.press('Control+v');
  await expect(page.locator('.web-bubble')).toHaveCount(2);
});

test('copying an illustrated panel preserves its image and undo history',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'art.png',mimeType:'image/png',buffer:icon});
  await expect(page.locator('.web-panel img')).toHaveCount(1);
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await expect(page.locator('.web-panel img')).toHaveCount(2);
  const sources=await page.locator('.web-panel img').evaluateAll(images=>images.map(image=>image.getAttribute('src')));
  expect(sources[0]).toBe(sources[1]);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.web-panel img')).toHaveCount(1);
});

test('mobile rotation handle turns a bubble and undo restores its angle',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  const bubble=page.locator('.web-bubble'),handle=bubble.getByRole('button',{name:'회전 조절'});
  const before=await handle.boundingBox();
  await page.mouse.move(before.x+before.width/2,before.y+before.height/2);
  await page.mouse.down();
  await page.mouse.move(before.x+before.width/2+85,before.y+before.height/2+70,{steps:6});
  await page.mouse.up();
  await expect(bubble).not.toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('button',{name:/레이어·속성/}).click();
  const angle=Number(await page.getByLabel('회전 각도').inputValue());
  expect(Math.abs(angle)).toBeGreaterThan(5);
  await page.locator('.web-right h2').filter({hasText:'선택 요소'}).click();
  await page.keyboard.press('Control+z');
  await expect(page.getByLabel('회전 각도')).toHaveValue('0');
});

test('all ten bubble kinds draw distinct outlines in the editor',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  const thumbnails=await page.locator('.web-bubble-types canvas').evaluateAll(nodes=>nodes.map(canvas=>canvas.toDataURL()));
  expect(new Set(thumbnails).size).toBe(10);
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  const kinds=['speech','thought','shout','whisper','narration','cloud','burst','tremble','radio','rounded'];
  const images=[];
  for(const kind of kinds){
    await page.getByLabel('말풍선 유형').selectOption(kind);
    images.push(await page.locator('.web-bubble-canvas').evaluate(canvas=>canvas.toDataURL()));
  }
  expect(new Set(images).size).toBe(kinds.length);
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
  await expect(page.locator('.web-mark')).toHaveCSS('background-image',/home-icon-webtoon(?:-[\w-]+)?\.png/);
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

test('decorative bubble tails have no dark join line inside the shape',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  for(const kind of ['cloud','burst','shout','tremble']){
    await page.getByLabel('말풍선 유형').selectOption(kind);
    const seam=await page.locator('.web-bubble-canvas').evaluate(canvas=>{
      const ctx=canvas.getContext('2d'),scale=canvas.width/310;
      return [115,120,125,130,135,140,145,150].map(y=>[...ctx.getImageData(Math.round(185*scale),Math.round((y+5)*scale),1,1).data]);
    });
    expect(seam.every(([red,green,blue,alpha])=>alpha===255&&red>240&&green>240&&blue>240),kind).toBe(true);
  }
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
