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

test('dragging a library image replaces a panel or creates a new one',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'library.png',mimeType:'image/png',buffer:icon});
  await expect(page.locator('.web-assets button')).toHaveCount(1);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.evaluate(()=>{
    const transfer=new DataTransfer();
    document.querySelector('.web-assets button').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
    const panel=document.querySelector('.web-panel:last-child');
    panel.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    panel.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await expect(page.locator('.web-panel img')).toHaveCount(2);
  await expect(page.locator('.web-panel')).toHaveCount(2);
  await page.evaluate(()=>{
    const transfer=new DataTransfer();
    document.querySelector('.web-assets button').dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:transfer}));
    const canvas=document.querySelector('.web-canvas');
    canvas.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
  });
  await expect(page.locator('.web-panel')).toHaveCount(3);
  await expect(page.locator('.web-assets button')).toHaveCount(1);
});

test('shift selection moves and deletes two panels together with undo',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const layers=page.locator('.web-layers > div > button:first-child');
  await layers.first().click();
  await layers.nth(1).click({modifiers:['Shift']});
  await expect(page.locator('.web-panel.is-group-selected')).toHaveCount(2);
  const panels=page.locator('.web-panel');
  const before=await panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)));
  const zoom=await panels.first().evaluate(item=>Number.parseFloat(item.style.width)/580);
  await page.keyboard.press('ArrowRight');
  await expect.poll(async()=>(await panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)))).map((x,i)=>Math.round((x-before[i])/zoom))).toEqual([1,1]);
  await page.keyboard.press('Control+z');
  await expect.poll(async()=>panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)))).toEqual(before);
  await page.getByRole('button',{name:'왼쪽',exact:true}).click();
  await expect.poll(async()=>panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)))).toEqual([before[1],before[1]]);
  await page.keyboard.press('Control+z');
  await expect.poll(async()=>panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)))).toEqual(before);
  const top=await panels.last().boundingBox();
  await page.mouse.move(top.x+top.width/2,top.y+top.height/2);
  await page.mouse.down();
  await page.mouse.move(top.x+top.width/2+36,top.y+top.height/2+20,{steps:5});
  await page.mouse.up();
  const dragged=await panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)));
  expect(dragged[0]).toBeGreaterThan(before[0]);
  expect(Math.abs((dragged[0]-before[0])-(dragged[1]-before[1]))).toBeLessThan(0.1);
  await page.keyboard.press('Control+z');
  await expect.poll(async()=>panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)))).toEqual(before);
  await page.keyboard.press('Delete');
  await expect(panels).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(panels).toHaveCount(2);
});

test('mobile multi-select mode selects panels without a shift key',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'레이어·속성'}).click();
  await page.getByRole('button',{name:'여러 개 선택'}).click();
  const layers=page.locator('.web-layers > div > button:first-child');
  await layers.nth(1).click();
  await expect(page.locator('.web-panel.is-group-selected')).toHaveCount(2);
  await page.getByRole('button',{name:'선택 마침'}).click();
  await expect(page.locator('.web-panel.is-group-selected')).toHaveCount(2);
});

test('dragging empty canvas selects intersecting panels in either direction',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const canvas=page.locator('.web-canvas');
  const rect=await canvas.boundingBox();
  const zoom=rect.width/690;
  const near={x:rect.x+10*zoom,y:rect.y+10*zoom};
  const far={x:rect.x+660*zoom,y:rect.y+600*zoom};
  await page.mouse.move(near.x,near.y);await page.mouse.down();
  await page.mouse.move(far.x,far.y,{steps:7});
  await expect(page.locator('.web-selection-marquee')).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.web-panel.is-group-selected')).toHaveCount(2);
  await page.mouse.click(near.x,near.y);
  await expect(page.locator('.web-panel.is-group-selected')).toHaveCount(0);
  await page.mouse.move(far.x,far.y);await page.mouse.down();
  await page.mouse.move(near.x,near.y,{steps:7});await page.mouse.up();
  await expect(page.locator('.web-panel.is-group-selected')).toHaveCount(2);
  await page.getByRole('button',{name:'T 텍스트'}).click();
  await page.locator('.web-right .web-metrics label').filter({hasText:'위쪽'}).locator('input').first().fill('800');
  await page.keyboard.down('Shift');
  await page.mouse.move(near.x,near.y);await page.mouse.down();
  await page.mouse.move(far.x,far.y,{steps:7});await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('.web-element.is-group-selected')).toHaveCount(3);
  await page.mouse.click(near.x,near.y);
  await expect(page.locator('.web-element.is-group-selected')).toHaveCount(0);
  await page.keyboard.press('Control+a');
  await expect(page.locator('.web-element.is-group-selected')).toHaveCount(3);
});

test('smart guides snap dragged panels and Alt temporarily bypasses snapping',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.locator('.web-right .web-metrics label').filter({hasText:'왼쪽'}).locator('input').first().fill('160');
  const panels=page.locator('.web-panel');
  const zoom=await panels.first().evaluate(item=>Number.parseFloat(item.style.width)/580);
  const left=()=>panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)));
  const dragSecond=async(alt=false,expectGuide=true)=>{
    const box=await panels.nth(1).boundingBox();
    if(alt)await page.keyboard.down('Alt');
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x+box.width/2-101*zoom,box.y+box.height/2,{steps:6});
    if(expectGuide)await expect(page.locator('.web-snap-guide.vertical')).toBeVisible();
    await page.mouse.up();
    if(alt)await page.keyboard.up('Alt');
  };
  await dragSecond();
  await expect.poll(async()=>{const x=await left();return Math.round((x[1]-x[0])/zoom)}).toBe(0);
  await page.keyboard.press('Control+z');
  await expect.poll(async()=>{const x=await left();return Math.round((x[1]-x[0])/zoom)}).toBe(105);
  await dragSecond(true,false);
  await expect.poll(async()=>{const x=await left();return Math.round((x[1]-x[0])/zoom)}).toBe(4);
  await page.keyboard.press('Control+z');
  await page.getByRole('button',{name:'자석 정렬 켜짐'}).click();
  await expect(page.getByRole('button',{name:'자석 정렬 꺼짐'})).toHaveAttribute('aria-pressed','false');
  await dragSecond(false,false);
  await expect.poll(async()=>{const x=await left();return Math.round((x[1]-x[0])/zoom)}).toBe(4);
});

test('smart snapping keeps a selected group together at the canvas edge',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'▣ 컷'}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const layers=page.locator('.web-layers > div > button:first-child');
  await layers.first().click();
  await layers.nth(1).click({modifiers:['Shift']});
  const panels=page.locator('.web-panel');
  const zoom=await panels.first().evaluate(item=>Number.parseFloat(item.style.width)/580);
  const box=await panels.last().boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2-51*zoom,box.y+box.height/2,{steps:6});
  await expect(page.locator('.web-snap-guide.vertical')).toBeVisible();
  await page.mouse.up();
  await expect.poll(async()=>panels.evaluateAll(items=>items.map(item=>Number.parseFloat(item.style.left)))).toEqual([0,0]);
  await page.keyboard.press('Control+z');
  await expect.poll(async()=>panels.evaluateAll((items,scale)=>items.map(item=>Math.round(Number.parseFloat(item.style.left)/scale)),zoom)).toEqual([55,55]);
});

test('mobile image import creates a panel and the library reuses it',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'first.png',mimeType:'image/png',buffer:icon});
  const panel=page.locator('.web-panel');
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('.web-panel-content img')).toBeVisible();
  await expect(page.locator('.web-app')).toHaveAttribute('data-mobile-tab','canvas');
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.locator('.web-assets button').first().click();
  await expect(panel).toHaveCount(1);
  await expect(panel.locator('.web-panel-content img')).toBeVisible();
});

test('imported portrait stays complete in its panel and PNG export',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  const imageData=await page.evaluate(()=>{
    const canvas=document.createElement('canvas');canvas.width=40;canvas.height=100;
    const ctx=canvas.getContext('2d');
    for(const [y,h,color] of [[0,34,'#ff0000'],[34,33,'#00ff00'],[67,33,'#0000ff']]){ctx.fillStyle=color;ctx.fillRect(0,y,40,h)}
    return canvas.toDataURL('image/png');
  });
  const portrait=Buffer.from(imageData.split(',')[1],'base64');
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const upload=()=>page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'portrait.png',mimeType:'image/png',buffer:portrait});
  await upload();
  const panel=page.locator('.web-panel');
  const image=panel.locator('.web-panel-content img');
  await expect(image).toHaveCSS('object-fit','contain');
  await expect(page.getByRole('button',{name:'원본 전체 보이기'})).toHaveAttribute('aria-pressed','true');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const zip=await (await download).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  const png=firstPngFromZip(zip);
  const colors=await page.evaluate(async base64=>{
    const image=new Image();image.src=`data:image/png;base64,${base64}`;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
    return{top:[...ctx.getImageData(345,120,1,1).data],bottom:[...ctx.getImageData(345,520,1,1).data]};
  },png.toString('base64'));
  expect(colors.top[0]).toBeGreaterThan(200);
  expect(colors.bottom[2]).toBeGreaterThan(200);
  await page.getByRole('button',{name:'컷 채우기',exact:true}).click();
  await expect(image).toHaveCSS('object-fit','cover');
  await panel.getByRole('button',{name:'이미지 위치 조절'}).click();
  const guide=page.locator('.web-image-composition-guide');
  await expect(guide).toBeVisible();
  const guideBox=await guide.boundingBox(),panelBox=await panel.boundingBox();
  expect(guideBox.height).toBeGreaterThan(panelBox.height);
  await panel.getByRole('button',{name:'위치 조절 끝'}).click();
  await expect(guide).toHaveCount(0);
  await page.locator('.web-right .web-metrics label').filter({hasText:'이미지 좌우'}).locator('input').first().fill('55');
  await page.getByRole('button',{name:'원본 전체 보이기'}).click();
  await expect(image).toHaveCSS('object-fit','contain');
  await expect(image).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');
  await page.getByRole('button',{name:'컷 채우기',exact:true}).click();
  await upload();
  await expect(image).toHaveCSS('object-fit','contain');
});

test('mobile image properties expose full-image and fill choices',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'▣ 컷'}).click();
  const icon=fs.readFileSync(new URL('../assets/music-play.png',import.meta.url));
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({name:'mobile.png',mimeType:'image/png',buffer:icon});
  await page.getByRole('button',{name:'레이어·속성'}).click();
  await expect(page.getByRole('button',{name:'원본 전체 보이기'})).toBeVisible();
  await expect(page.getByRole('button',{name:'컷 채우기',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'원본 전체 보이기'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'컷 채우기',exact:true}).click();
  await expect(page.getByRole('button',{name:'컷 채우기',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'원본 전체 보이기'}).click();
  await expect(page.locator('.web-panel img')).toHaveCSS('object-fit','contain');
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
  const transform=await panel.locator('.web-panel-content img').evaluate(node=>getComputedStyle(node).transform);
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
    const transform=await panel.locator('.web-panel-content img').evaluate(node=>getComputedStyle(node).transform);
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
  await page.getByLabel('글꼴').selectOption('serif');
  await page.getByLabel('굵기').selectOption('900');
  await page.getByLabel('줄 간격').selectOption('1.8');
  await expect(page.locator('.web-text-content')).toHaveCSS('text-align','right');
  await expect(page.locator('.web-text-content')).toHaveCSS('font-family','serif');
  await expect(page.locator('.web-text-content')).toHaveCSS('font-weight','900');
  expect(await page.locator('.web-text-content').evaluate(node=>node.style.lineHeight)).toBe('1.8');
  const savePromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await savePromise;
  const bytes=await saved.createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'styles.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await expect(page.locator('.web-text-content')).toHaveCSS('text-align','right');
  await expect(page.locator('.web-text-content')).toHaveCSS('font-family','serif');
  await expect(page.locator('.web-text-content')).toHaveCSS('font-weight','900');
  await page.locator('.web-text').click();
  await expect(page.getByLabel('줄 간격')).toHaveValue('1.8');
  await expect(page.locator('.web-panel img')).toHaveCSS('filter','grayscale(1)');
  const pngPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const png=await pngPromise;
  expect(png.suggestedFilename()).toMatch(/\.zip$/);
});

test('mobile bubble typography edits the canvas and exports a PNG draft',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(studio);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.locator('.web-right textarea').fill('첫 줄\n둘째 줄');
  await page.getByLabel('글꼴').selectOption('monospace');
  await page.getByLabel('굵기').selectOption('400');
  await page.getByLabel('줄 간격').selectOption('2');
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  const bubble=page.locator('.web-bubble-content');
  await expect(bubble).toHaveCSS('font-family','monospace');
  await expect(bubble).toHaveCSS('font-weight','400');
  expect(await bubble.evaluate(node=>node.style.lineHeight)).toBe('2');
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const first=await (await download).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  const widePng=firstPngFromZip(first);
  expect(widePng.length).toBeGreaterThan(100);
  await page.getByRole('button',{name:/레이어·속성/}).click();
  await page.getByLabel('줄 간격').selectOption('1');
  await page.getByRole('button',{name:'캔버스',exact:true}).click();
  const nextDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const second=await (await nextDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  expect(firstPngFromZip(second).equals(widePng)).toBe(false);
});

test('text effect presets survive save and change the PNG artwork',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'T 텍스트'}).click();
  await page.locator('.web-right textarea').fill('효과 검사');
  await page.getByRole('combobox',{name:'글자 효과'}).selectOption('ink');
  await expect(page.locator('.web-text-content')).toHaveCSS('-webkit-text-stroke-color','rgb(17, 17, 17)');
  const savedDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await (await savedDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'effects.wtoon',mimeType:'application/octet-stream',buffer:saved});
  await page.locator('.web-text').click();
  await expect(page.getByRole('combobox',{name:'글자 효과'})).toHaveValue('ink');
  const inkDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const ink=await (await inkDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.getByRole('combobox',{name:'글자 효과'}).selectOption('plain');
  const plainDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const plain=await (await plainDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  expect(firstPngFromZip(ink).equals(firstPngFromZip(plain))).toBe(false);
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await page.getByRole('combobox',{name:'글자 효과'}).selectOption('neon');
  await expect(page.locator('.web-bubble-content')).not.toHaveCSS('text-shadow','none');
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

test('narrow bubble variants keep their tails attached after resizing and reopening',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  const metrics=page.locator('.web-right .web-metrics input');
  await metrics.nth(2).fill('40');
  await metrics.nth(3).fill('40');
  await page.getByLabel('꼬리 좌우').fill('999');
  await expect(page.getByLabel('꼬리 좌우')).toHaveValue('40');
  await page.getByLabel('꼬리 상하').fill('0');
  await expect(page.getByLabel('꼬리 상하')).toHaveValue('52');
  for(const kind of ['speech','whisper','rounded','radio','cloud','burst','shout','tremble','thought']){
    await page.getByLabel('말풍선 유형').selectOption(kind);
    const bounds=await page.locator('.web-bubble').boundingBox();
    const tip=await page.getByRole('button',{name:'말풍선 꼬리 이동'}).boundingBox();
    expect(tip.x+tip.width/2,kind).toBeGreaterThanOrEqual(bounds.x);
    expect(tip.x+tip.width/2,kind).toBeLessThanOrEqual(bounds.x+bounds.width);
    const canvas=await page.locator('.web-bubble-canvas').evaluate(node=>({width:node.width,height:node.height,alpha:node.getContext('2d').getImageData(Math.floor(node.width/2),Math.floor(node.height/2),1,1).data[3]}));
    expect(canvas.width,kind).toBeGreaterThan(0);
    expect(canvas.height,kind).toBeGreaterThan(canvas.width);
    expect(canvas.alpha,kind).toBeGreaterThan(0);
  }
  await expect(page.locator('.web-status')).toContainText('임시 원고 저장됨');
  await page.reload();
  await expect(page.locator('.web-bubble')).toHaveCount(1);
  await page.locator('.web-bubble').click();
  const bounds=await page.locator('.web-bubble').boundingBox();
  const tip=await page.getByRole('button',{name:'말풍선 꼬리 이동'}).boundingBox();
  expect(tip.x+tip.width/2).toBeLessThanOrEqual(bounds.x+bounds.width);
  const handle=await page.getByRole('button',{name:'크기 조절 se'}).boundingBox();
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height/2);
  await page.mouse.down();
  await page.mouse.move(handle.x+handle.width/2+60,handle.y+handle.height/2+40,{steps:5});
  await page.mouse.up();
  const grown=await page.locator('.web-bubble').boundingBox();
  const movedTip=await page.getByRole('button',{name:'말풍선 꼬리 이동'}).boundingBox();
  expect(grown.width).toBeGreaterThan(bounds.width);
  expect(movedTip.x+movedTip.width/2).toBeLessThanOrEqual(grown.x+grown.width);
});

test('bubble tail width and bend survive save and change preview and PNG',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'◯ 말풍선'}).click();
  await page.getByLabel('말풍선 유형').selectOption('radio');
  const before=await page.locator('.web-bubble-canvas').evaluate(canvas=>canvas.toDataURL());
  const baselineDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const baseline=await (await baselineDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.getByRole('slider',{name:'꼬리 폭'}).fill('110');
  await page.getByRole('slider',{name:'꼬리 휘어짐'}).fill('36');
  await expect(page.getByRole('slider',{name:'꼬리 폭'})).toHaveValue('110');
  await expect(page.getByRole('slider',{name:'꼬리 휘어짐'})).toHaveValue('36');
  expect(await page.locator('.web-bubble-canvas').evaluate(canvas=>canvas.toDataURL())).not.toBe(before);
  const changedDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'PNG 초안'}).click();
  const changed=await (await changedDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  expect(firstPngFromZip(changed).equals(firstPngFromZip(baseline))).toBe(false);
  const savedDownload=page.waitForEvent('download');
  await page.getByRole('button',{name:'.wtoon 저장'}).click();
  const saved=await (await savedDownload).createReadStream().then(async stream=>{const chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks)});
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'tail-shape.wtoon',mimeType:'application/octet-stream',buffer:saved});
  await page.locator('.web-bubble').click();
  await expect(page.getByRole('slider',{name:'꼬리 폭'})).toHaveValue('110');
  await expect(page.getByRole('slider',{name:'꼬리 휘어짐'})).toHaveValue('36');
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


test('pen strokes render, survive reload, undo and export on desktop and mobile',async({page})=>{
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:800});
    await page.goto(studio);
    if(width<760)await page.getByRole('button',{name:'도구',exact:true}).click();
    await page.getByRole('button',{name:'✎ 펜 그리기'}).click();
    const surface=page.getByLabel('펜 그리기 영역'),box=await surface.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box.x+35,box.y+45);
    await page.mouse.down();
    await page.mouse.move(box.x+75,box.y+85,{steps:5});
    await page.mouse.up();
    await expect(page.locator('.web-drawing')).toHaveCount(1);
    await expect(page.locator('.web-drawing-canvas')).toHaveCount(1);
    await page.getByRole('button',{name:'↶ 되돌리기'}).click();
    await expect(page.locator('.web-drawing')).toHaveCount(0);
    await page.getByRole('button',{name:'↷ 다시'}).click();
    await expect(page.locator('.web-drawing')).toHaveCount(1);
    await expect(page.locator('.web-status')).toContainText('브라우저 임시 원고 저장됨');
    await page.reload();
    await expect(page.locator('.web-drawing')).toHaveCount(1);
    if(width===1280){
      const download=page.waitForEvent('download');
      await page.getByRole('button',{name:'PNG 초안'}).click();
      expect((await download).suggestedFilename()).toMatch(/\.zip$/);
    }
    if(width<760)await page.getByRole('button',{name:'도구',exact:true}).click();
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'새 원고'}).click();
    await expect(page.locator('.web-drawing')).toHaveCount(0);
  }
});


test('long pen strokes retain the final segment through draft and PNG export',async({page})=>{
  await page.setViewportSize({width:1280,height:800});
  await page.goto(studio);
  await page.getByRole('button',{name:'✎ 펜 그리기'}).click();
  const surface=page.getByLabel('펜 그리기 영역'),box=await surface.boundingBox();
  await page.mouse.move(box.x+30,box.y+40);await page.mouse.down();
  await surface.evaluate((node,{x,y})=>{for(let i=0;i<2700;i++)node.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:1,pointerType:'mouse',clientX:x+(i%2?100:30),clientY:y+40+(i%80)}))},{x:box.x,y:box.y});
  await page.mouse.move(box.x+200,box.y+150);await page.mouse.up();
  await expect(page.locator('.web-drawing')).toHaveCount(1);
  await expect(page.locator('.web-status')).toContainText('브라우저 임시 원고 저장됨');
  const drawing=await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('webtoon-studio-web');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,read=db.transaction('drafts').objectStore('drafts').get('current');read.onsuccess=()=>{resolve(read.result.elements.find(e=>e.type==='drawing'));db.close()};read.onerror=()=>reject(read.error)}}));
  expect(drawing.points.length).toBeGreaterThan(1200);
  expect(drawing.points.length).toBeLessThanOrEqual(2500);
  expect(drawing.x+drawing.points.at(-1).x).toBeGreaterThan(250);
  expect(drawing.y+drawing.points.at(-1).y).toBeGreaterThan(180);
  await page.reload();
  await expect(page.locator('.web-drawing')).toHaveCount(1);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 초안'}).click();
  const png=firstPngFromZip(fs.readFileSync(await (await download).path()));
  const visible=await page.evaluate(async ({data,x,y})=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(Math.floor(x)-5,Math.floor(y)-5,10,10).data;let count=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<100&&pixels[i+1]<120&&pixels[i+2]<130)count++;return count},{data:png.toString('base64'),x:drawing.x+drawing.points.at(-1).x,y:drawing.y+drawing.points.at(-1).y});
  expect(visible).toBeGreaterThan(0);
});

test('pen draws with a real emulated phone touch gesture',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{const page=await context.newPage();await page.goto(studio);
    await page.getByRole('button',{name:'도구',exact:true}).click();
    await page.getByRole('button',{name:'✎ 펜 그리기'}).click();
    const box=await page.getByLabel('펜 그리기 영역').boundingBox(),x=box.x+40,y=box.y+55,cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y:y+45}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.locator('.web-drawing')).toHaveCount(1);
    await page.getByRole('button',{name:'✎ 펜 종료'}).click();
    await expect(page.getByLabel('펜 그리기 영역')).toHaveCount(0);
    await expect(page.locator('.web-status')).toContainText('브라우저 임시 원고 저장됨');
    await page.reload();await expect(page.locator('.web-drawing')).toHaveCount(1);
  }finally{await context.close()}
});


test('PC erasure and restore records mask only their own layer in editor and PNG',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto(studio);
  const project={schemaVersion:4,title:'마스크 검사',episode:'1화',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[
    {id:'under',type:'panel',x:100,y:100,w:200,h:150,z:1,fill:'#0000ff',strokeWidth:0},
    {id:'above',type:'panel',x:100,y:100,w:200,h:150,z:2,fill:'#ff0000',strokeWidth:0,erasures:[{points:[{x:100,y:30},{x:100,y:120}],width:40,soft:false},{points:[{x:80,y:75},{x:120,y:75}],width:12,soft:false,restore:true}]},
  ],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'pc-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await expect(page.locator('.web-erased-artwork')).toHaveCount(1);
  const surface=await page.locator('.web-canvas').boundingBox(),scale=surface.width/690;
  const screenshot=await page.screenshot({clip:{x:Math.round(surface.x+100*scale),y:Math.round(surface.y+100*scale),width:Math.round(200*scale),height:Math.round(150*scale)}});
  const sample=async(buffer,points)=>page.evaluate(async({data,points})=>{const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return points.map(([x,y])=>Array.from(ctx.getImageData(Math.round(x),Math.round(y),1,1).data))},{data:buffer.toString('base64'),points});
  const [erased,restored,solid]=await sample(screenshot,[[100*scale,55*scale],[100*scale,75*scale],[40*scale,55*scale]]);
  expect(erased[2]).toBeGreaterThan(200);expect(erased[0]).toBeLessThan(50);
  expect(restored[0]).toBeGreaterThan(200);expect(restored[2]).toBeLessThan(50);
  expect(solid[0]).toBeGreaterThan(200);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 초안'}).click();
  const png=firstPngFromZip(fs.readFileSync(await (await download).path()));
  const [outErased,outRestored,outSolid]=await sample(png,[[200,155],[200,175],[140,155]]);
  expect(outErased[2]).toBeGreaterThan(200);expect(outErased[0]).toBeLessThan(50);
  expect(outRestored[0]).toBeGreaterThan(200);expect(outRestored[2]).toBeLessThan(50);expect(outSolid[0]).toBeGreaterThan(200);
  await page.locator('[data-element-id=\"above\"]').click();
  await page.getByRole('button',{name:'이 요소의 지운 영역 복원'}).click();
  await expect(page.locator('.web-erased-artwork')).toHaveCount(0);
  await page.getByRole('button',{name:'↶ 되돌리기'}).click();
  await expect(page.locator('.web-erased-artwork')).toHaveCount(1);
});


test('PC masked bubble and drawing retain controls and survive a project file round trip',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(studio);
  const project={schemaVersion:4,title:'마스크 저장',episode:'1화',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[
    {id:'bubble',type:'bubble',kind:'speech',text:'대사',x:100,y:80,w:260,h:120,z:1,fill:'#ffffff',stroke:'#000000',tailX:150,tailY:180,erasures:[{points:[{x:130,y:20},{x:130,y:110}],width:28,soft:true}]},
    {id:'line',type:'drawing',x:100,y:350,w:250,h:60,z:2,points:[{x:10,y:30},{x:230,y:30}],stroke:'#000000',strokeWidth:12,erasures:[{points:[{x:100,y:0},{x:100,y:60}],width:20,soft:false}]},
  ],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'desktop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await expect(page.locator('.web-erased-artwork')).toHaveCount(2);
  await page.locator('[data-element-id="bubble"]').click();
  await expect(page.getByRole('button',{name:'말풍선 꼬리 이동'})).toBeVisible();
  await expect(page.getByRole('button',{name:'크기 조절 se'})).toBeVisible();
  const save=page.waitForEvent('download');await page.getByRole('button',{name:'.wtoon 저장'}).click();const bytes=fs.readFileSync(await (await save).path());
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'again.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await expect(page.locator('.web-erased-artwork')).toHaveCount(2);
  await page.locator('[data-element-id="bubble"]').click();await expect(page.getByRole('button',{name:'말풍선 꼬리 이동'})).toBeVisible();
});


test('web eraser removes parts of pen strokes and single dots, with undo and reload',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto(studio);
  await page.getByRole('button',{name:'✎ 펜 그리기'}).click();
  let surface=page.getByLabel('펜 그리기 영역'),box=await surface.boundingBox();
  await page.mouse.move(box.x+45,box.y+60);await page.mouse.down();await page.mouse.move(box.x+200,box.y+60,{steps:8});await page.mouse.up();
  await page.mouse.click(box.x+150,box.y+125);
  await expect(page.locator('.web-drawing')).toHaveCount(2);
  await page.getByRole('button',{name:'지우개',exact:true}).click();
  surface=page.getByLabel('지우개 영역');box=await surface.boundingBox();
  await page.mouse.move(box.x+90,box.y+35);await page.mouse.down();await page.mouse.move(box.x+90,box.y+85,{steps:5});await page.mouse.up();
  await expect(page.locator('.web-erased-artwork')).toHaveCount(1);
  await page.mouse.click(box.x+150,box.y+125);
  await expect(page.locator('.web-erased-artwork')).toHaveCount(2);
  await page.getByRole('button',{name:'↶ 되돌리기'}).click();await expect(page.locator('.web-erased-artwork')).toHaveCount(1);
  await page.getByRole('button',{name:'↷ 다시'}).click();await expect(page.locator('.web-erased-artwork')).toHaveCount(2);
  await expect(page.locator('.web-status')).toContainText('브라우저 임시 원고 저장됨');
  await page.reload();await expect(page.locator('.web-erased-artwork')).toHaveCount(2);
});

test('mobile eraser respects selected scope and locked layers',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await page.goto(studio);
 const project={schemaVersion:4,title:'지우개 범위',episode:'1',canvas:{width:690,height:700,background:'#fff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[{id:'target',type:'panel',x:80,y:80,w:300,h:250,z:2,fill:'#ff0000',strokeWidth:0},{id:'locked',type:'panel',x:80,y:80,w:300,h:250,z:1,fill:'#0000ff',strokeWidth:0,locked:true}],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
 await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'erase.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.locator('[data-element-id="target"]').click();
 await page.getByRole('button',{name:'도구',exact:true}).click();await page.getByRole('button',{name:'지우개',exact:true}).click();
 await page.getByRole('button',{name:'도구',exact:true}).click();await page.getByLabel('지우기 대상').selectOption('selected');await page.getByRole('button',{name:'캔버스',exact:true}).click();
 const surface=page.getByLabel('지우개 영역'),box=await surface.boundingBox(),x=box.x+110,y=box.y+90,cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+35,y:y+30}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('[data-element-id="target"] .web-erased-artwork')).toHaveCount(1);
 await expect(page.locator('[data-element-id="locked"] .web-erased-artwork')).toHaveCount(0);
 await page.getByRole('button',{name:'지우개 종료'}).click();await expect(surface).toHaveCount(0);
 }finally{await context.close()}
});


test('soft eraser and restore brush preserve a panel through PNG and file round trip',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto(studio);
  const project={schemaVersion:4,title:'부분 복원',episode:'1',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[{id:'target',type:'panel',x:80,y:80,w:300,h:250,z:1,fill:'#ff0000',strokeWidth:0}],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  await page.locator('[data-element-id="target"]').click();
  await page.getByRole('button',{name:'부드러운 지우개',exact:true}).click();
  await page.getByLabel('지우기 대상').selectOption('selected');
  const surface=page.getByLabel('부드러운 지우개 영역'),box=await surface.boundingBox(),scale=box.width/690;
  await page.mouse.move(box.x+200*scale,box.y+120*scale);await page.mouse.down();await page.mouse.move(box.x+200*scale,box.y+190*scale,{steps:6});await page.mouse.up();
  await expect(page.locator('.web-erased-artwork')).toHaveCount(1);
  const pixel=async()=>{const d=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 초안'}).click();const png=firstPngFromZip(fs.readFileSync(await (await d).path()));return page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return Array.from(ctx.getImageData(200,150,1,1).data)},png.toString('base64'))};
  const erased=await pixel();expect(erased[1]).toBeGreaterThan(100);
  await page.getByRole('button',{name:'복원 붓',exact:true}).click();
  const restore=page.getByLabel('복원 붓 영역'),b=await restore.boundingBox();
  await page.mouse.move(b.x+180*scale,b.y+150*scale);await page.mouse.down();await page.mouse.move(b.x+220*scale,b.y+150*scale,{steps:5});await page.mouse.up();
  const restored=await pixel();expect(restored[0]).toBeGreaterThan(200);expect(restored[1]).toBeLessThan(erased[1]-50);
  await page.getByRole('button',{name:'↶ 되돌리기'}).click();const undone=await pixel();expect(undone[1]).toBeGreaterThan(100);
  await page.getByRole('button',{name:'↷ 다시'}).click();
  const save=page.waitForEvent('download');await page.getByRole('button',{name:'.wtoon 저장'}).click();const bytes=fs.readFileSync(await (await save).path());
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'restore.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  const reopened=await pixel();expect(reopened[1]).toBeLessThan(erased[1]-50);
});

test('mobile restore brush responds to touch and preserves locked overlapping elements',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await page.goto(studio);
 const project={schemaVersion:4,title:'모바일 복원',episode:'1',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[{id:'target',type:'panel',x:80,y:80,w:300,h:250,z:2,fill:'#ff0000',strokeWidth:0,erasures:[{points:[{x:100,y:20},{x:100,y:200}],width:60,soft:false}]},{id:'locked',type:'panel',x:80,y:80,w:300,h:250,z:1,fill:'#0000ff',strokeWidth:0,locked:true,erasures:[{points:[{x:100,y:20},{x:100,y:200}],width:60,soft:false}]}],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
 await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'touch-restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.locator('[data-element-id="target"]').click();await page.getByRole('button',{name:'도구',exact:true}).click();await page.getByRole('button',{name:'복원 붓',exact:true}).click();
 await page.getByRole('button',{name:'도구',exact:true}).click();await page.getByLabel('복원 대상').selectOption('selected');await page.getByRole('button',{name:'캔버스',exact:true}).click();
 const surface=page.getByLabel('복원 붓 영역'),box=await surface.boundingBox(),scale=box.width/690,x=box.x+180*scale,y=box.y+150*scale,cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+25,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('.web-status')).toContainText('요소의 지운 부분을 복원');
 await expect(page.locator('[data-element-id="locked"] .web-erased-artwork')).toHaveCount(1);
 await page.getByRole('button',{name:'복원 붓 종료'}).click();await expect(surface).toHaveCount(0);
 }finally{await context.close()}
});


test('PC brush opacity survives web preview, PNG and project round trip',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto(studio);
  const project={schemaVersion:4,title:'브러시 원고',episode:'1',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[{id:'line',type:'drawing',x:100,y:100,w:200,h:50,z:1,brush:'watercolor',opacity:.25,points:[{x:20,y:25},{x:180,y:25}],stroke:'#000000',strokeWidth:12}],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'pc-brush.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  const canvas=page.locator('.web-drawing-canvas');await expect(canvas).toHaveCount(1);
  const alpha=await canvas.evaluate(c=>c.getContext('2d').getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data[3]);expect(alpha).toBeGreaterThan(35);expect(alpha).toBeLessThan(85);
  const out=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 초안'}).click();const png=firstPngFromZip(fs.readFileSync(await (await out).path()));
  const shade=await page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(200,125,1,1).data[0]},png.toString('base64'));expect(shade).toBeGreaterThan(165);expect(shade).toBeLessThan(220);
  await page.locator('[data-element-id="line"]').click();await expect(page.getByLabel('선 브러시 종류')).toHaveValue('watercolor');await expect(page.getByLabel('선 불투명도')).toHaveValue('0.25');
  await page.getByLabel('선 브러시 종류').selectOption('pencil');await page.getByLabel('선 불투명도').fill('0.5');
  const save=page.waitForEvent('download');await page.getByRole('button',{name:'.wtoon 저장'}).click();const bytes=fs.readFileSync(await (await save).path());
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'brush.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await page.locator('[data-element-id="line"]').click();await expect(page.getByLabel('선 브러시 종류')).toHaveValue('pencil');await expect(page.getByLabel('선 불투명도')).toHaveValue('0.5');
});

test('mobile touch creates a stroke with the chosen brush and opacity',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await page.goto(studio);await page.getByRole('button',{name:'도구',exact:true}).click();await page.getByRole('button',{name:'✎ 펜 그리기'}).click();
 await page.getByRole('button',{name:'도구',exact:true}).click();await page.getByLabel('브러시 종류').selectOption('marker');await page.getByLabel('펜 불투명도').fill('0.4');await page.getByRole('button',{name:'캔버스',exact:true}).click();
 const box=await page.getByLabel('펜 그리기 영역').boundingBox(),x=box.x+45,y=box.y+55,cdp=await context.newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+45,y:y+35}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(page.locator('.web-drawing')).toHaveCount(1);await expect(page.locator('.web-status')).toContainText('브라우저 임시 원고 저장됨');
 const stroke=await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('webtoon-studio-web');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,read=db.transaction('drafts').objectStore('drafts').get('current');read.onsuccess=()=>{resolve(read.result.elements.find(e=>e.type==='drawing'));db.close()};read.onerror=()=>reject(read.error)}}));
 expect(stroke.brush).toBe('marker');expect(stroke.opacity).toBeCloseTo(.4);
 }finally{await context.close()}
});


test('PC polygon panels clip artwork consistently in editor and PNG and survive saving',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto(studio);
  const red=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=10;c.height=10;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,10,10);return c.toDataURL()});
  const project={schemaVersion:4,title:'컷 모양',episode:'1',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[{id:'panel',type:'panel',x:100,y:100,w:200,h:150,z:1,fill:'#ffffff',stroke:'#000000',strokeWidth:4,shape:'slant-left',image:red,imageFit:'cover'}],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'pc-panel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
  const panel=page.locator('[data-element-id="panel"]');await expect(panel.locator('.web-panel-outline')).toHaveCount(1);
  await page.addStyleTag({content:'.web-resize-handle,.web-rotate-handle{visibility:hidden!important}'});
  const sample=async(buffer,points)=>page.evaluate(async({data,points})=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return points.map(([a,b])=>Array.from(x.getImageData(Math.round(a),Math.round(b),1,1).data))},{data:buffer.toString('base64'),points});
  const verify=async()=>{const b=await panel.boundingBox(),scale=b.width/200,shot=await panel.screenshot();const [outside,inside]=await sample(shot,[[4*scale,4*scale],[100*scale,75*scale]]);expect(outside[0]).toBeGreaterThan(220);expect(outside[1]).toBeGreaterThan(220);expect(inside[0]).toBeGreaterThan(200);expect(inside[1]).toBeLessThan(40);const download=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 초안'}).click();const png=firstPngFromZip(fs.readFileSync(await (await download).path()));const [out,inset]=await sample(png,[[104,104],[200,175]]);expect(out[1]).toBeGreaterThan(220);expect(inset[0]).toBeGreaterThan(200);expect(inset[1]).toBeLessThan(40)};
  await verify();await panel.click({position:{x:100,y:70}});await expect(page.getByLabel('컷 모양')).toHaveValue('slant-left');
  await page.getByLabel('컷 모양').selectOption('diamond');await verify();
  await page.getByLabel('컷 모양').selectOption('polygon');await page.getByLabel('컷 다각형 꼭짓점').fill('50,0 100,100 0,100');await page.getByLabel('컷 다각형 꼭짓점').blur();await verify();
  const save=page.waitForEvent('download');await page.getByRole('button',{name:'.wtoon 저장'}).click();const bytes=fs.readFileSync(await (await save).path());
  await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'polygon.wtoon',mimeType:'application/octet-stream',buffer:bytes});
  await panel.click({position:{x:100,y:70}});await expect(page.getByLabel('컷 모양')).toHaveValue('polygon');await expect(page.getByLabel('컷 다각형 꼭짓점')).toHaveValue('50,0 100,100 0,100');await verify();
});

test('mobile lets a user choose a hexagonal panel shape',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await page.goto(studio);await page.getByRole('button',{name:'도구',exact:true}).click();await page.getByRole('button',{name:'▣ 컷'}).click();await page.getByRole('button',{name:/레이어·속성/}).click();await page.getByLabel('컷 모양').selectOption('hexagon');await page.getByRole('button',{name:'캔버스',exact:true}).click();await expect(page.locator('.web-panel-outline')).toHaveCount(1);await expect(page.locator('.web-panel-content')).toHaveCSS('clip-path',/polygon/)}finally{await context.close()}
});


test('asymmetric split preserves image composition and erasure positions',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto(studio);
 const red=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=10;c.height=10;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,10,10);return c.toDataURL()});
 const project={schemaVersion:4,title:'분할 보존',episode:'1',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[{id:'original',type:'panel',x:80,y:80,w:300,h:250,z:1,fill:'#ffffff',strokeWidth:0,image:red,imageFit:'cover',erasures:[{points:[{x:240,y:20},{x:240,y:180}],width:30,soft:false}]}],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
 await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'split.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 const original=page.locator('[data-element-id="original"]');await original.click({position:{x:50,y:50}});
 await page.getByLabel('컷 분할 위치').fill('0.3');await page.getByLabel('컷 사이 간격').fill('20');await page.getByRole('button',{name:'좌우로 나누기'}).click();
 await expect(page.locator('.web-panel')).toHaveCount(2);await expect(page.locator('.web-status')).toContainText('컷을 좌우로 나눴습니다');
 const data=await page.locator('.web-panel').evaluateAll(nodes=>nodes.map(n=>({left:parseFloat(n.style.left),width:parseFloat(n.style.width)})));const zoom=await page.locator('.web-canvas').evaluate(n=>parseFloat(n.style.width)/690);
 expect(data[0].width/zoom).toBeCloseTo(80,0);expect((data[1].left-data[0].left-data[0].width)/zoom).toBeCloseTo(20,0);expect(data[1].width/zoom).toBeCloseTo(200,0);
 const out=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 초안'}).click();const png=firstPngFromZip(fs.readFileSync(await (await out).path()));
 const colors=await page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return [[320,160],[290,160],[170,160]].map(([a,b])=>Array.from(x.getImageData(a,b,1,1).data))},png.toString('base64'));
 expect(colors[0][1]).toBeGreaterThan(220);expect(colors[1][0]).toBeGreaterThan(220);expect(colors[1][1]).toBeLessThan(40);expect(colors[2][1]).toBeGreaterThan(220);
 await page.getByRole('button',{name:'↶ 되돌리기'}).click();await expect(page.locator('.web-panel')).toHaveCount(1);
});

test('mobile diagonal split keeps both parts and exports the gap',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{const page=await context.newPage();await page.goto(studio);
 const project={schemaVersion:4,title:'사선 분할',episode:'1',canvas:{width:690,height:700,background:'#ffffff'},scenes:[{id:'scene_root',name:'장면',startY:0,collapsed:false}],elements:[{id:'original',type:'panel',x:80,y:80,w:300,h:250,z:1,fill:'#ff0000',strokeWidth:0}],assets:[],settings:{snap:false,guides:true,gridSize:10,smartSnapDistance:8}};
 await page.locator('input[type=file][accept=".wtoon,.json"]').setInputFiles({name:'diagonal.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.locator('[data-element-id="original"]').click();await page.getByRole('button',{name:/레이어·속성/}).click();await page.getByLabel('컷 사이 간격').fill('20');await page.getByRole('button',{name:'사선으로 나누기'}).click();
 await expect(page.locator('.web-panel')).toHaveCount(2);await expect(page.locator('.web-panel-outline')).toHaveCount(2);
 const out=page.waitForEvent('download');await page.getByRole('button',{name:'PNG 초안'}).click();const png=firstPngFromZip(fs.readFileSync(await (await out).path()));
 const colors=await page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return [[120,100],[350,300],[230,205]].map(([a,b])=>Array.from(x.getImageData(a,b,1,1).data))},png.toString('base64'));
 expect(colors[0][1]).toBeLessThan(40);expect(colors[1][1]).toBeLessThan(40);expect(colors[2][1]).toBeGreaterThan(220);
 await page.getByRole('button',{name:'↶ 되돌리기'}).click();await expect(page.locator('.web-panel')).toHaveCount(1);
 }finally{await context.close()}
});
