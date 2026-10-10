import {test,expect} from '@playwright/test';
const BASE=process.env.AI_CLEANER_TEST_URL||'http://127.0.0.1:4173/ai-cleaner/';
const uncaughtErrors=new WeakMap();
test.beforeEach(async({page})=>{const errors=[];uncaughtErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));});
test.afterEach(async({page})=>{expect(uncaughtErrors.get(page)||[]).toEqual([]);});
test.use({serviceWorkers:'block'});
async function ready(page,reach=true){await page.goto(BASE);await page.waitForFunction(()=>window.__AI_CLEANER_APP_READY__);if(reach){await page.locator('#toolTabReach').click();await page.waitForFunction(()=>window.GomFoxReach?.active);}}
const articles=[
 '서울시는 육아 지원 신청 절차를 공식 안내문에 게시했습니다. 서류 제출과 가구 조건을 확인하고 주민센터에서 신청하세요.',
 '부산 항구에서 바다 생태계 관찰 행사가 열립니다. 해양 동물을 보호하기 위해 낚시 장비와 쓰레기 처리 방법을 안내합니다.',
 '대전 과학관에서 우주 탐사 전시를 운영합니다. 로켓의 추진 원리와 위성 통신 실험을 가족 방문객에게 소개합니다.',
 '광주 미술관에서는 현대 회화 작품 특별전을 준비합니다. 작가 인터뷰와 색채 표현 방법을 살펴보는 도슨트 프로그램입니다.',
 '제주 농장에서는 감귤 수확 체험을 진행합니다. 농부들은 토양 관리와 작물 재배 기술에 대해 설명합니다.',
 '춘천 도서관에서는 독서 모임과 문학 강좌를 개최합니다. 시민들이 시집을 읽고 감상을 나누는 시간을 마련합니다.'
];
test('manual cleanup works with live analysis disabled and remains separate from exact typing',async({page})=>{
 await ready(page,false);await page.locator('#liveScan').uncheck();await page.locator('#input').fill('안녕\u200B하세요.');await page.locator('#analyzeText').click();await expect(page.locator('#output')).toHaveValue('안녕하세요.');await expect(page.locator('#input')).toHaveValue('안녕\u200B하세요.');await expect(page.locator('#output')).not.toHaveAttribute('data-typewriter-verified','true');
});
test('adding sources or editing the question invalidates copyable research results',async({page})=>{
 await ready(page);await page.locator('#reachRaw').fill(articles[0]);await page.locator('#reachAddCurrent').click();await page.locator('#reachAnalyze').click();await expect(page.locator('#reachCopyAll')).toBeEnabled();await page.locator('#reachRaw').fill(articles[1]);await page.locator('#reachAddCurrent').click();await expect(page.locator('#reachCopyAll')).toBeDisabled();await expect(page.locator('#reachSaveTxt')).toBeDisabled();await page.locator('#reachAnalyze').click();await page.locator('#reachQuestion').fill('새로운 조사 질문');await expect(page.locator('#reachCopyAll')).toBeDisabled();await expect(page.locator('#reachOpenSearch')).toBeDisabled();
});
test('manual sources respect the same six-source limit and official wording does not certify a source',async({page})=>{
 await ready(page);for(const text of articles){await page.locator('#reachRaw').fill(text);await page.locator('#reachAddCurrent').click();}await expect(page.locator('.reachSourceItem')).toHaveCount(6);await page.locator('#reachRaw').fill('추가 출처는 여섯 개 제한을 넘겨서는 안 됩니다. 이 원문은 목록에 추가할 수 없어야 합니다.');await page.locator('#reachAddCurrent').click();await expect(page.locator('.reachSourceItem')).toHaveCount(6);await expect(page.locator('#reachFetchStatus')).toContainText('최대 6개');await page.locator('#reachAnalyze').click();await expect(page.locator('#reachEvidencePack')).not.toContainText('원출처 우선');await expect(page.locator('#reachEvidencePack')).toContainText('충분한 지지 근거를 찾지 못했습니다');
});
test('clear and tool switching cancel the whole URL batch rather than continuing later requests',async({page})=>{
 for(const action of ['clear','switch','stop']){
  await ready(page);let requests=0;
  await page.route('https://r.jina.ai/**',async route=>{requests++;await new Promise(r=>setTimeout(r,300));try{await route.fulfill({body:articles[0].repeat(2)});}catch{}});
  await page.locator('#reachUrls').fill('https://example.com/one\nhttps://example.org/two');await page.locator('#reachFetchMany').click();await expect.poll(()=>requests).toBe(1);
  if(action==='clear')await page.locator('#reachClear').click();else if(action==='stop')await page.locator('#reachCancelFetch').click();else await page.locator('#toolTabText').click();
  await page.waitForTimeout(650);expect(requests).toBe(1);expect(await page.evaluate(()=>window.GomFoxReach.sources.length)).toBe(0);await page.unroute('https://r.jina.ai/**');
 }
});
test('Reader errors identify failed URLs and authenticated URLs never leave the browser',async({page})=>{
 await ready(page);let requests=0;await page.route('https://r.jina.ai/**',route=>{requests++;return route.fulfill({status:403,body:'Forbidden'});});
 await page.locator('#reachUrls').fill('https://user:password@example.com/private\nhttps://example.com/?token=secret\nhttps://example.org/public');await page.locator('#reachFetchMany').click();await expect(page.locator('#reachFetchStatus')).toContainText('실패 3');expect(requests).toBe(1);await expect(page.locator('#reachFetchStatus')).toContainText('HTTP 403');await expect(page.locator('#reachFetchMany')).toBeEnabled();
});
test('evidence candidates link to original documents and never claim source independence',async({page})=>{
 await ready(page);await page.evaluate(text=>window.GomFoxReach.addSource({url:'https://www.seoul.go.kr/news',text,label:'서울시 원문'}),articles[0]);await page.locator('#reachAnalyze').click();await expect(page.locator('#reachEvidencePack a').first()).toHaveAttribute('href','https://www.seoul.go.kr/news');await expect(page.locator('#reachEvidencePack')).toContainText('원문 확인 필요');await expect(page.locator('#reachClaims')).toContainText('독립성 미확인');
});
test('mobile and desktop research layouts keep controls within the viewport',async({page})=>{
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});await ready(page);await expect(page.locator('#reachAnalyze')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.screenshot({path:`test-results/research-${width}.png`,fullPage:true});}
});

test('C2PA editing software alone is not reported as an AI generator',async({page})=>{
 await page.route('**/vendor/c2pa-web.js*',route=>route.fulfill({contentType:'text/javascript',body:'export async function createC2pa(){return {reader:{fromBlob:async()=>({manifestStore:async()=>({active_manifest:"sample",validation_state:"Valid",manifests:{sample:{claim_generator_info:[{name:"Adobe Photoshop",version:"2026"}],assertions:[]}},validation_results:{activeManifest:{failure:[],success:[]}}}),free(){}})}}}'}));
 await ready(page,false);await page.locator('#toolTabImage').click();
 const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
 await page.locator('#imageInput').setInputFiles({name:'tiny.png',mimeType:'image/png',buffer:pixel});await expect(page.locator('#imageResults')).toBeVisible({timeout:15000});await expect(page.locator('#sigGenerator')).toHaveText('명시적 생성 도구 정보 없음');await expect(page.locator('#c2paSdkStatus')).toContainText('manifest 읽음');
});

test('manual intake records an optional source URL without sending the pasted article',async({page})=>{
 await ready(page);let external=0;await page.route('https://r.jina.ai/**',route=>{external++;return route.abort();});await page.locator('#reachManualUrl').fill('https://www.seoul.go.kr/notice');await page.locator('#reachRaw').fill('서울시 안내문은 2026년 10월 31일 신청을 마감합니다. 신청 절차와 접수 장소는 안내문에서 확인하세요.');await page.locator('#reachAddCurrent').click();expect(external).toBe(0);await expect(page.locator('.reachSourceLink')).toHaveAttribute('href','https://www.seoul.go.kr/notice');await expect(page.locator('#reachSources')).toContainText('2026-10-31');await expect(page.locator('#reachManualUrl')).toHaveValue('');await page.locator('#reachAnalyze').click();await expect(page.locator('#reachEvidencePack a').first()).toHaveAttribute('href','https://www.seoul.go.kr/notice');
});
test('numerically conflicting government claims are excluded from reusable evidence candidates',async({page})=>{
 await ready(page);await page.evaluate(()=>{
 window.GomFoxReach.addSource({url:'https://www.seoul.go.kr/a',text:'서울시 육아 지원 신청 금액은 가구마다 매월 100만원으로 안내합니다. 서울에 거주하는 가족들은 신청 가능합니다. 주민센터 방문 서류 절차 접수 문의 상담 준비'});
 window.GomFoxReach.addSource({url:'https://www.gov.uk/b',text:'서울시 육아 지원 신청 금액은 가구마다 매월 200만원으로 안내합니다. 다른 항목으로 해양 생태계와 우주 과학 전시관 및 미술 작품 소식도 소개합니다.'});
 });await page.locator('#reachAnalyze').click();await expect(page.locator('#reachConflicts')).toContainText('상충 후보');const claims=await page.locator('#reachEvidencePack .reachEvidenceItem > b').allTextContents();expect(claims.join(' ')).not.toContain('100만원');expect(claims.join(' ')).not.toContain('200만원');
});

test('desktop custom editor menu selects text and closes without uncaught errors',async({page})=>{
 await ready(page,false);await page.locator('#input').fill('컨텍스트 메뉴 선택 테스트');await page.locator('#input').click({button:'right'});await expect(page.locator('#textContextMenu')).toBeVisible();await page.locator('[data-context-action="selectAll"]').click();expect(await page.locator('#input').evaluate(el=>el.selectionEnd-el.selectionStart)).toBe('컨텍스트 메뉴 선택 테스트'.length);await page.keyboard.press('Escape');await expect(page.locator('#textContextMenu')).toBeHidden();
});
