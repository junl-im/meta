import {test, expect} from '@playwright/test';

const base=process.env.AI_CLEANER_TEST_URL||'http://127.0.0.1:4173/ai-cleaner/';
const listen=new URL('../NaverNovelShelf/site/listen.html',base).href;

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
