import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicCatalogStatus} from './public-catalog-status.mjs';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('공개 검색 카드의 완결 표시만 작품 상태로 인식한다',()=>{
  assert.equal(publicCatalogStatus('<div class="thumbnail"><span class="icon_comp">완결</span><img src="cover"></div>'), 'completed');
  assert.equal(publicCatalogStatus('<div class="thumbnail"><img src="cover"></div><span>완결이라는 제목</span>'), 'ongoing');
});
test('썸네일이 없거나 완결 표시 구조가 낯설면 임의 분류하지 않는다',()=>{
  assert.throws(()=>publicCatalogStatus('<div>완결</div>'));
  assert.throws(()=>publicCatalogStatus('<div class="thumbnail"><span class="icon_comp">다른 상태</span><img src="cover"></div>'));
});
test('배포 카탈로그와 연동 파일의 검증된 상태가 서로 일치한다',async()=>{
  const folder=new URL('../',import.meta.url);
  const source=await readFile(new URL('site/catalog.js',folder),'utf8');
  const context={window:{}};vm.runInNewContext(source,context);
  const feed=JSON.parse(await readFile(new URL('site/catalog-feed.json',folder),'utf8'));
  const integration=JSON.parse(await readFile(new URL('integration/catalog.v1.json',folder),'utf8'));
  assert.deepEqual(feed,integration);
  const works=context.window.NOVEL_CATALOG;
  assert.equal(works.length,feed.works.length);
  const seen=new Set();
  for(const row of feed.works){
    assert.ok(['ongoing','completed'].includes(row.publication_status));
    const key=`${row.league}:${row.id}`;assert.ok(!seen.has(key));seen.add(key);
    const match=works.find(work=>work.id===row.id&&work.league===row.league);
    assert.ok(match);assert.equal(match.status,row.publication_status);
  }
});
