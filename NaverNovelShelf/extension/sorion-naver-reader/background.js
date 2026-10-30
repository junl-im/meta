'use strict';

// 회차 원고는 확장 프로그램의 임시 세션 저장소만 거칩니다.
const SHELF = 'https://meta-deee1.web.app/NaverNovelShelf/site';
const TEMP_KEY = 'sorionChapterHandoff';
const FIVE_MINUTES = 5 * 60 * 1000;
const NAVER_HOSTS = new Set(['m.novel.naver.com', 'novel.naver.com']);

function safePage(url) {
  try {
    const page = new URL(url);
    return page.protocol === 'https:' && NAVER_HOSTS.has(page.hostname)
      && /^\/(best|challenge)\/detail$/.test(page.pathname)
      && /^\d{5,9}$/.test(page.searchParams.get('novelId') || '')
      && /^\d{1,6}$/.test(page.searchParams.get('volumeNo') || '');
  } catch { return false; }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'SORION_CHAPTER_CAPTURE') {
    (async () => {
      const chapter = message.chapter;
      if (!safePage(sender.tab?.url) || !chapter || chapter.url !== sender.tab?.url
          || typeof chapter.text !== 'string' || chapter.text.length < 80
          || chapter.text.length > 200000 || typeof chapter.title !== 'string') {
        throw new Error('네이버 회차의 공개 본문을 확인하지 못했어요.');
      }
      const page = new URL(chapter.url);
      if (chapter.novelId !== page.searchParams.get('novelId')
          || chapter.volumeNo !== page.searchParams.get('volumeNo')) {
        throw new Error('작품과 회차 정보가 일치하지 않아요.');
      }
      const token = crypto.randomUUID();
      await chrome.storage.session.set({ [TEMP_KEY]: { token, chapter, savedAt: Date.now() } });
      const url = new URL('listen.html', SHELF + '/');
      url.searchParams.set('novelId', chapter.novelId);
      url.searchParams.set('handoff', token);
      await chrome.tabs.create({ url: url.href });
      return { ok: true };
    })().then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (message?.type === 'SORION_CHAPTER_TAKE') {
    (async () => {
      if (!sender.tab?.url?.startsWith(SHELF + '/listen')) throw new Error('서재 페이지가 아니에요.');
      const stored = (await chrome.storage.session.get(TEMP_KEY))[TEMP_KEY];
      if (!stored || stored.token !== message.token || Date.now() - stored.savedAt > FIVE_MINUTES) {
        throw new Error('회차 임시 전달이 만료됐어요. 네이버에서 다시 눌러 주세요.');
      }
      await chrome.storage.session.remove(TEMP_KEY);
      return { ok: true, chapter: stored.chapter };
    })().then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (!safePage(tab.url)) return;
  chrome.tabs.sendMessage(tab.id, { type: 'SORION_CAPTURE_NOW' }).catch(() => {});
});
