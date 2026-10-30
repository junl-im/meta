/* Public pages only: retry transient reader/network failures without retrying
   denied or missing pages, and stop immediately when the user changes work. */
(function (root) {
  'use strict';
  const wait = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Canceled', 'AbortError'));
    const timer = setTimeout(() => { signal?.removeEventListener('abort', cancel); resolve(); }, ms);
    function cancel() { clearTimeout(timer); reject(new DOMException('Canceled', 'AbortError')); }
    signal?.addEventListener('abort', cancel, {once:true});
  });
  async function read(url, {signal, headers, timeout=18000, maxLength=3000000, attempts=3, onRetry=()=>{}, validate=()=>true} = {}) {
    for (let attempt=0; attempt<attempts; attempt++) {
      if (signal?.aborted) throw new DOMException('Canceled', 'AbortError');
      const controller=new AbortController();
      let timedOut=false;
      const cancel=()=>controller.abort();
      signal?.addEventListener('abort',cancel,{once:true});
      const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeout);
      try {
        const response=await fetch(url,{signal:controller.signal,credentials:'omit',headers,cache:'no-store'});
        if (!response.ok) {
          const error=new Error(`조회 응답 ${response.status}`);
          error.retryable=response.status===408 || response.status===429 || response.status>=500;
          throw error;
        }
        const text=await response.text();
        if (text.length>maxLength) {const error=new Error('응답이 너무 깁니다');error.retryable=false;throw error;}
        if (!text.trim()) {const error=new Error('빈 응답');error.retryable=true;throw error;}
        if (!validate(text)) {const error=new Error('응답을 확인할 수 없어요');error.retryable=true;throw error;}
        return text;
      } catch(error) {
        if (signal?.aborted) throw new DOMException('Canceled','AbortError');
        if (attempt+1>=attempts || error.retryable===false) {
          if (timedOut) {const timeoutError=new Error('조회 시간이 초과됐어요');timeoutError.name='TimeoutError';throw timeoutError;}
          throw error;
        }
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort',cancel);
      }
      onRetry(attempt+1);
      await wait(Math.min(1800,500*2**attempt),signal);
    }
    throw new Error('조회 실패');
  }
  root.ShelfPublicReader = Object.freeze({read});
})(typeof window === 'undefined' ? globalThis : window);
