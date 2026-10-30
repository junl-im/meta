(() => {
  'use strict';
  if (!/^\/NaverNovelShelf\/site\/listen(?:\.html)?\/?$/.test(location.pathname)) return;
  const token = new URLSearchParams(location.search).get('handoff');
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return;
  let acknowledged = false;
  window.addEventListener('message', (event) => {
    if (event.source === window && event.origin === location.origin
        && event.data?.type === 'GOMFOX_SORION_CHAPTER_ACCEPTED_V1') acknowledged = true;
  });
  function deliverToReader(chapter, attempt = 0) {
    if (acknowledged || attempt >= 8) return;
    window.postMessage({ type: 'GOMFOX_SORION_CHAPTER_IMPORTED_V1', chapter }, location.origin);
    setTimeout(() => deliverToReader(chapter, attempt + 1), 350);
  }
  async function deliver() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SORION_CHAPTER_TAKE', token });
      if (!response?.ok) throw new Error(response?.error || '본문 임시 전달을 찾을 수 없어요.');
      deliverToReader(response.chapter);
    } catch (error) {
      window.postMessage({ type: 'GOMFOX_SORION_CHAPTER_ERROR_V1', message: error.message }, location.origin);
    } finally {
      const params = new URLSearchParams(location.search);
      params.delete('handoff');
      params.delete('capture');
      history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
    }
  }
  void deliver();
})();
