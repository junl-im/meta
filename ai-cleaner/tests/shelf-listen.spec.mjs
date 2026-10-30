import {test, expect} from '@playwright/test';

const base=process.env.AI_CLEANER_TEST_URL||'http://127.0.0.1:4173/ai-cleaner/';
const listen=new URL('../NaverNovelShelf/site/listen.html',base).href;
async function choose(page,id,value){const widget=page.locator(`.illustrated-select[data-select-id="${id}"]`);await widget.locator('.illustrated-select-trigger').click();await widget.locator(`[role="option"][data-value="${value}"]`).click();}

test('illustrated voice choices support keyboard selection and closing',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto(listen);
  const widget=page.locator('.illustrated-select[data-select-id="library-expression"]');
  const trigger=widget.locator('.illustrated-select-trigger');await trigger.focus();await page.keyboard.press('ArrowDown');
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(trigger).toContainText('차분하게');await expect(trigger).toHaveAttribute('aria-expanded','false');
  await expect(page.locator('#library-expression')).toHaveValue('calm');
  await trigger.click();await page.keyboard.press('Escape');await expect(trigger).toHaveAttribute('aria-expanded','false');
});

test('listening room keeps controls and optional sections usable on narrow screens',async({page})=>{
  const asset=await page.request.get(new URL('assets/listening-play-medallion.png',listen).href);
  expect(asset.ok()).toBe(true);expect(asset.headers()['content-type']).toContain('image/png');
  for(const width of [320,360,390,430,768,1280]){
    await page.setViewportSize({width,height:800});await page.goto(listen);
    await expect(page.locator('#manual-entry')).not.toHaveAttribute('open','');
    await expect(page.locator('#other-voices')).not.toHaveAttribute('open','');
    await expect(page.locator('#local-ai-play')).toBeVisible();
    await expect(page.locator('#pause-resume')).toHaveCSS('background-image',/listening-play-medallion\.png/);
    const size=await page.locator('#local-ai-play').boundingBox();expect(size.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.locator('#pause-resume').click();
    await expect(page.locator('#manual-entry')).toHaveAttribute('open','');
    await expect(page.locator('#manuscript-text')).toBeFocused();
    const checkbox=await page.locator('#clean-for-reading').boundingBox();
    expect(checkbox.width).toBeLessThanOrEqual(24);expect(checkbox.height).toBeLessThanOrEqual(24);
    await expect(page.locator('#manuscript-text')).toBeVisible();
    await page.locator('#other-voices > summary').click();await expect(page.locator('#device-play')).toBeVisible();
  }
});

test('chapter handoff, non-destructive cleanup and device playback',async({page})=>{
  await page.addInitScript(()=>{
    window.__spoken=[];
    Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{paused:false,getVoices:()=>[{lang:'ko-KR'}],cancel(){},pause(){this.paused=true},resume(){this.paused=false},speak(utterance){window.__spoken.push({text:utterance.text,rate:utterance.rate});utterance.onstart?.()}}});
    window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
    HTMLMediaElement.prototype.pause=function(){};
    HTMLMediaElement.prototype.load=function(){};
  });
  for(const width of [320,390,768,1280]){
    await page.setViewportSize({width,height:800});
    await page.goto(listen);
    await page.locator('#manual-entry').evaluate(el=>{el.open=true});
    await page.locator('#other-voices').evaluate(el=>{el.open=true});
    const source=('첫 줄 **강조**와 숨은\u200b 공백.\n다음 문단입니다. ').repeat(10);
    await page.evaluate(text=>window.postMessage({type:'GOMFOX_SORION_CHAPTER_IMPORTED_V1',chapter:{novelId:'1247361',volumeNo:'39',url:'https://m.novel.naver.com/challenge/detail?novelId=1247361&volumeNo=39',title:'39화',text}},location.origin),source);
    await expect(page.locator('#manuscript-text')).toHaveValue(source);
    await expect(page.locator('#text-scan')).toContainText('낭독에만 정리 적용');
    await expect(page.locator('#reader-text')).not.toContainText('**');
    await page.locator('#speed').fill('1.2');
    await page.locator('#device-play').click();
    const spoken=await page.evaluate(()=>window.__spoken.at(-1));
    expect(spoken.rate).toBe(1.2);
    expect(spoken.text).not.toContain('**');
    expect(spoken.text).not.toContain('\u200b');
    await expect(page.locator('#player-message')).toContainText('소리온 AI 성우가 아닙니다');
    await page.locator('#pause-resume').click();
    expect(await page.evaluate(()=>speechSynthesis.paused)).toBe(true);
    await page.locator('#pause-resume').click();
    expect(await page.evaluate(()=>speechSynthesis.paused)).toBe(false);
    await page.locator('#clean-for-reading').uncheck();
    await expect(page.locator('#reader-text')).toContainText('**');
    await expect(page.locator('#manuscript-text')).toHaveValue(source);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('library voices synthesize short segments and use the chosen reading mood',async({page})=>{
  await page.addInitScript(()=>{
    window.__requests=[];
    window.Worker=class {
      postMessage(request){window.__requests.push(request);queueMicrotask(()=>this.onmessage?.({data:{id:request.id,type:'audio',blob:new Blob(['audio'],{type:'audio/wav'})}}))}
      terminate(){window.__terminated=true}
    };
    HTMLMediaElement.prototype.load=function(){};
    HTMLMediaElement.prototype.pause=function(){};
    HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve()};
  });
  await page.goto(listen);
  await page.locator('#manual-entry').evaluate(el=>{el.open=true});
  await page.locator('#manuscript-text').fill('여우가 말했다. '.repeat(80));
  await page.waitForTimeout(300);
  await choose(page,'library-voice','library-male');
  await choose(page,'library-expression','vivid');
  await page.locator('#pause-resume').click();
  await expect.poll(()=>page.evaluate(()=>window.__requests.length)).toBeGreaterThan(0);
  await expect(page.locator('#playback-mode')).toHaveText('듣는 서재 AI');
  const first=await page.evaluate(()=>window.__requests[0]);
  expect(first.voiceId).toBe('library-male');
  expect(first.speed).toBeCloseTo(1.08);
  expect(first.text.length).toBeLessThanOrEqual(120);
  await expect.poll(()=>page.evaluate(()=>window.__requests.length)).toBe(4);
  await page.locator('#sorion-audio').evaluate(el=>el.dispatchEvent(new Event('ended')));
  await expect.poll(()=>page.evaluate(()=>window.__requests.length)).toBe(5);
  await page.locator('#stop-play').click();
  expect(await page.evaluate(()=>window.__terminated)).toBe(true);
});

test('voice preparation shows stages and cancellation closes the dialog',async({page})=>{
  await page.addInitScript(()=>{window.Worker=class{postMessage(request){this.onmessage?.({data:{id:request.id,type:'progress',message:'한국어 WAV 엔진 불러오는 중 · Text Encoder 2/4'}})}terminate(){window.__cancelled=true}}});
  await page.goto(listen);await page.locator('.voice-info').evaluate(el=>el.open=true);await page.locator('#local-ai-prepare').click();
  await expect(page.locator('#voice-loading')).toBeVisible();await expect(page.locator('#voice-loading-progress')).toHaveAttribute('value','2');
  await page.locator('#voice-loading-cancel').click();await expect(page.locator('#voice-loading')).toBeHidden();expect(await page.evaluate(()=>window.__cancelled)).toBe(true);
});

test('stopping cancels queued synthesis without starting later requests',async({page})=>{
  await page.addInitScript(()=>{
    window.__bufferRequests=[];
    window.Worker=class{postMessage(request){window.__bufferRequests.push(request);if(window.__bufferRequests.length===1)queueMicrotask(()=>this.onmessage?.({data:{id:request.id,type:'audio',blob:new Blob(['audio'],{type:'audio/wav'})}}))}terminate(){window.__bufferTerminated=true}};
    HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.pause=function(){};HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve()};
  });
  await page.goto(listen);await page.locator('#manual-entry').evaluate(el=>el.open=true);
  await page.locator('#manuscript-text').fill('여우가 책을 읽습니다. '.repeat(80));await page.waitForTimeout(250);await page.locator('#local-ai-play').click();
  await expect.poll(()=>page.evaluate(()=>window.__bufferRequests.length)).toBe(2);
  await page.locator('#stop-play').click();await page.waitForTimeout(250);
  expect(await page.evaluate(()=>window.__bufferRequests.length)).toBe(2);expect(await page.evaluate(()=>window.__bufferTerminated)).toBe(true);
});

test('slow synthesis prepares a second segment before starting playback',async({page})=>{
  await page.addInitScript(()=>{
    window.__adaptiveRequests=[];window.__adaptivePlayed=false;
    window.Worker=class{postMessage(request){window.__adaptiveRequests.push(request);this.onmessage?.({data:{id:request.id,type:'progress',message:'음성 파일 생성 중'}});const bytes=new ArrayBuffer(64),v=new DataView(bytes);v.setUint32(0,0x52494646,false);v.setUint32(28,2000,true);v.setUint32(40,20,true);setTimeout(()=>this.onmessage?.({data:{id:request.id,type:'audio',blob:new Blob([bytes],{type:'audio/wav'})}}),60)}terminate(){}};
    HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.pause=function(){};HTMLMediaElement.prototype.play=function(){window.__adaptivePlayed=true;this.dispatchEvent(new Event('play'));return Promise.resolve()};
  });
  await page.goto(listen);await page.locator('#manual-entry').evaluate(el=>el.open=true);
  await page.locator('#manuscript-text').fill('여우가 책을 읽습니다. '.repeat(80));await page.waitForTimeout(250);await page.locator('#local-ai-play').click();
  await expect(page.locator('#voice-loading-status')).toContainText('다음 부분');
  expect(await page.evaluate(()=>window.__adaptivePlayed)).toBe(false);
  await expect.poll(()=>page.evaluate(()=>window.__adaptivePlayed)).toBe(true);
  expect(await page.evaluate(()=>window.__adaptiveRequests.length)).toBeGreaterThanOrEqual(2);
});

test('local narration resumes at the saved segment and accepts older saved positions',async({page})=>{
  await page.addInitScript(()=>{
    window.__resumeRequests=[];
    window.Worker=class{postMessage(request){window.__resumeRequests.push(request);queueMicrotask(()=>this.onmessage?.({data:{id:request.id,type:'audio',blob:new Blob(['audio'],{type:'audio/wav'})}}))}terminate(){}};
    HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.pause=function(){};HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve()};
  });
  await page.goto(listen);await page.locator('#manual-entry').evaluate(el=>el.open=true);
  const source='첫번째 문장입니다. '.repeat(14)+'두번째 문장입니다. '.repeat(14)+'세번째 문장입니다. '.repeat(14);
  await page.locator('#manuscript-text').fill(source);await page.waitForTimeout(250);await page.locator('#local-ai-play').click();
  await expect.poll(()=>page.evaluate(()=>window.__resumeRequests.length)).toBeGreaterThan(1);
  const second=await page.evaluate(()=>window.__resumeRequests[1].text);
  await page.locator('#sorion-audio').evaluate(el=>el.dispatchEvent(new Event('ended')));
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('gomfox-sorion-progress-v1::')).part)).toBe(1);
  await page.reload();await page.locator('#manual-entry').evaluate(el=>el.open=true);await page.locator('#manuscript-text').fill(source);await page.waitForTimeout(250);
  await page.locator('#local-ai-play').click();await expect.poll(()=>page.evaluate(()=>window.__resumeRequests.length)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.__resumeRequests[0].text)).toBe(second);
  await page.reload();await page.evaluate(()=>localStorage.setItem('gomfox-sorion-progress-v1::','0'));
  await page.locator('#manual-entry').evaluate(el=>el.open=true);await page.locator('#manuscript-text').fill(source);await page.waitForTimeout(250);
  await page.locator('#local-ai-play').click();await expect.poll(()=>page.evaluate(()=>window.__resumeRequests.length)).toBeGreaterThan(0);
  expect(await page.evaluate(()=>window.__resumeRequests[0].text)).not.toBe(second);
});

test('switching chapters does not overwrite the new chapter saved position',async({page})=>{
  await page.goto(listen);await page.locator('#manual-entry').evaluate(el=>el.open=true);
  await page.locator('#episode-name').fill('첫 회차');await page.locator('#episode-name').dispatchEvent('change');
  await page.locator('#manuscript-text').fill('여우가 숲속의 책을 읽습니다. '.repeat(100));await page.waitForTimeout(250);
  await page.evaluate(()=>localStorage.setItem('gomfox-sorion-progress-v1::다음 회차',JSON.stringify({index:0,part:2})));
  await page.locator('#episode-name').fill('다음 회차');await page.locator('#episode-name').dispatchEvent('change');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('gomfox-sorion-progress-v1::다음 회차')));
  expect(saved).toEqual({index:0,part:2});
});

test('episode chooser lists only the selected work and opens official chapter links',async({page})=>{
  await page.setViewportSize({width:320,height:700});
  await page.route('https://r.jina.ai/**',async route=>{
    const page2=route.request().url().includes('page=2');
    const rows=Array.from({length:page2?1:10},(_,i)=>`*   [책갈피 ${page2?29:39-i}화. 시험 회차 2026.10.29 별점 10.0](https://m.novel.naver.com/challenge/detail?novelId=1247361&volumeNo=${page2?29:39-i}#nafullscreen)`);
    rows.push('*   [다른 작품](https://m.novel.naver.com/challenge/detail?novelId=1249999&volumeNo=1)');
    await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'text/plain',body:rows.join('\n')});
  });
  await page.goto(listen);
  await choose(page,'work-select','1247361');
  await expect(page.locator('#episode-list a')).toHaveCount(10);
  await expect(page.locator('#episode-list a').first()).toHaveAttribute('href',/novelId=1247361.*volumeNo=39/);
  await expect(page.locator('#episode-list')).not.toContainText('다른 작품');
  await page.locator('#episode-more').click();
  await expect(page.locator('#episode-list a')).toHaveCount(11);
  await expect(page.locator('#episode-more')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('episode lookup failure offers the official work page',async({page})=>{
  await page.route('https://r.jina.ai/**',route=>route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*'},body:'unavailable'}));
  await page.goto(listen);
  await choose(page,'work-select','1247361');
  await expect(page.locator('#episode-status')).toHaveText('목록을 불러오지 못했어요');
  await expect(page.locator('#episode-list a')).toHaveAttribute('href','https://m.novel.naver.com/challenge/list?novelId=1247361');
});

test('public chapter imports only a matching work and preserves paragraph breaks',async({page})=>{
  await page.route('https://r.jina.ai/**',async route=>{
    const url=route.request().url();
    if(!url.includes('/detail?'))return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},body:'*   [책갈피 39화. 시험 회차 2026.10.29 별점 10](https://m.novel.naver.com/challenge/detail?novelId=1247361&volumeNo=39)'});
    const text='첫 줄입니다. '.repeat(12);
    return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'X-Return-Format'},body:`<meta property="og:url" content="https://m.novel.naver.com/challenge/detail?novelId=1247361&volumeNo=39"><div id="detailContents"><h2>제목 : 시험 회차</h2><div id="con_data"><p>${text}<br>다음 줄</p><p>다음 문단</p></div></div>`});
  });
  await page.goto(listen);
  await choose(page,'work-select','1247361');
  await page.locator('.episode-row button').click();
  await expect(page.locator('#episode-status')).toContainText('39화 불러오기 완료');
  await expect(page.locator('#manuscript-text')).toHaveValue(/첫 줄입니다\.[\s\S]*\n다음 줄\n다음 문단/);
  await expect(page.locator('#file-name')).toHaveText('공개 회차 조회로 본문 가져옴');
});

test('public chapter rejects a mismatched source without replacing the manuscript',async({page})=>{
  await page.route('https://r.jina.ai/**',async route=>{
    if(!route.request().url().includes('/detail?'))return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},body:'*   [책갈피 39화. 시험 회차 2026.10.29 별점 10](https://m.novel.naver.com/challenge/detail?novelId=1247361&volumeNo=39)'});
    return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'X-Return-Format'},body:`<meta property="og:url" content="https://m.novel.naver.com/challenge/detail?novelId=9999999&volumeNo=39"><div id="con_data">${'잘못된 작품 '.repeat(30)}</div>`});
  });
  await page.goto(listen);
  await choose(page,'work-select','1247361');
  await page.locator('#manual-entry').evaluate(el=>{el.open=true});
  await page.locator('#manuscript-text').fill('보존할 원문');
  await page.locator('.episode-row button').click();
  await expect(page.locator('#episode-status')).toContainText('본문 조회 실패');
  await expect(page.locator('#manuscript-text')).toHaveValue('보존할 원문');
});

test('voice preparation uses one worker and keeps it ready when manuscript changes',async({page})=>{
  await page.addInitScript(()=>{
    window.__created=0;window.__requests=[];
    window.Worker=class {
      constructor(){window.__created++}
      postMessage(request){window.__requests.push(request);queueMicrotask(()=>this.onmessage?.({data:request.type==='prepare'?{id:request.id,type:'ready'}:{id:request.id,type:'audio',blob:new Blob(['audio'],{type:'audio/wav'})}}))}
      terminate(){window.__terminated=true}
    };
    HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.pause=function(){};
    HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve()};
  });
  await page.goto(listen);
  await page.locator('.voice-info').evaluate(el=>{el.open=true});
  await page.locator('#local-ai-prepare').click();
  await expect(page.locator('#local-ai-status')).toContainText('준비 완료');
  await page.locator('#manual-entry').evaluate(el=>{el.open=true});
  await page.locator('#manuscript-text').fill('책장을 넘기자 작은 여우가 웃었습니다.');
  await page.waitForTimeout(300);
  await page.locator('#local-ai-play').click();
  await expect.poll(()=>page.evaluate(()=>window.__requests.length)).toBe(2);
  expect(await page.evaluate(()=>window.__created)).toBe(1);
  expect(await page.evaluate(()=>window.__requests.map(request=>request.type||'speak'))).toEqual(['prepare','speak']);
});

test('pasting and immediately playing uses the latest manuscript without interrupting playback',async({page})=>{
  await page.addInitScript(()=>{
    window.__quickRequests=[];window.__quickTerminated=false;
    window.Worker=class {postMessage(request){window.__quickRequests.push(request);queueMicrotask(()=>this.onmessage?.({data:{id:request.id,type:'audio',blob:new Blob(['audio'],{type:'audio/wav'})}}))}terminate(){window.__quickTerminated=true}};
    HTMLMediaElement.prototype.load=function(){};HTMLMediaElement.prototype.pause=function(){};
    HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve()};
  });
  await page.goto(listen);
  await page.evaluate(()=>{const input=document.querySelector('#manuscript-text');input.value='방금 붙여넣은 원고를 읽습니다.';input.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#local-ai-play').click()});
  await expect.poll(()=>page.evaluate(()=>window.__quickRequests.length)).toBe(1);
  expect(await page.evaluate(()=>window.__quickRequests[0].text)).toContain('방금 붙여넣은 원고');
  await page.waitForTimeout(300);
  expect(await page.evaluate(()=>window.__quickTerminated)).toBe(false);
});
