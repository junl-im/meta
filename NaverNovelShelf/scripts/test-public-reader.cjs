const {test,after} = require('node:test');
const assert = require('node:assert/strict');
const originalFetch=global.fetch;
require('../site/public-reader-fetch.js');
const {read}=global.ShelfPublicReader;
after(()=>{global.fetch=originalFetch;});

test('temporary response failures retry and recover',async()=>{
  let calls=0,retries=0;
  global.fetch=async()=>++calls===1 ? {ok:false,status:503} : {ok:true,text:async()=> 'episode content'};
  assert.equal(await read('https://example.test',{onRetry:()=>retries++}), 'episode content');
  assert.equal(calls,2);assert.equal(retries,1);
});
test('timeouts retry but final timeout is visible',async()=>{
  let calls=0;
  global.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{
    calls++; signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});
  });
  await assert.rejects(read('https://example.test',{timeout:5,attempts:2}),{name:'TimeoutError'});
  assert.equal(calls,2);
});
test('changing works cancels the request without retrying',async()=>{
  let calls=0;const controller=new AbortController();
  global.fetch=(_url,{signal})=>new Promise((_resolve,reject)=>{
    calls++;signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});
  });
  const request=read('https://example.test',{signal:controller.signal,timeout:1000});
  controller.abort();
  await assert.rejects(request,{name:'AbortError'});assert.equal(calls,1);
});
test('access denial is not retried and oversized text is rejected',async()=>{
  let calls=0;global.fetch=async()=>{calls++;return {ok:false,status:403};};
  await assert.rejects(read('https://example.test'),/403/);assert.equal(calls,1);
  global.fetch=async()=>({ok:true,text:async()=> 'abcde'});
  await assert.rejects(read('https://example.test',{maxLength:3}),/너무 깁니다/);
});
test('a temporary malformed first page retries before accepting it',async()=>{
  let calls=0;global.fetch=async()=>({ok:true,text:async()=>++calls===1?'incomplete':'valid episode'});
  assert.equal(await read('https://example.test',{validate:text=>text.startsWith('valid')}),'valid episode');
  assert.equal(calls,2);
});
