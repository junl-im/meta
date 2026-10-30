(() => {
  'use strict';
  const allowedIds = new Set([
    '1249028','1244916','1248094','1247301','1245426','1243166','1242457',
    '1244202','1244489','1249473','1248545','1247798','1247361','1245900',
    '1244599','1243880','1242664','1243882','1245626','1245094','1244781',
    '1246406','1245097','1243383','1249457','1248550','1242932',
    '1250781','1250566',
  ]);
  const buttonId = 'gomfox-sorion-chapter-button';
  let busy = false;

  function chapterInfo() {
    const url = new URL(location.href);
    const novelId = url.searchParams.get('novelId');
    const volumeNo = url.searchParams.get('volumeNo');
    if (!/^\/(best|challenge)\/detail$/.test(url.pathname) || !allowedIds.has(novelId)
        || !/^\d{1,6}$/.test(volumeNo || '')) return null;
    return { url, novelId, volumeNo };
  }

  function extractChapter() {
    const info = chapterInfo();
    if (!info) throw new Error('우리 서재의 회차 상세 화면에서만 작동해요.');
    // 2026-10-30 공개 회차 DOM 검증: div#con_data.book_data > p
    const main = document.querySelector('#con_data')
      || document.querySelector('#detailContents .book_data');
    const text = (main?.innerText || '').replace(/\r\n?/g, '\n').trim();
    if (text.length < 80 || text.length > 200000) {
      throw new Error('현재 페이지에서 읽을 수 있는 본문을 찾지 못했어요.');
    }
    const heading = document.querySelector('#detailContents h2')
      || document.querySelector('#ct h2');
    const title = (heading?.innerText || document.title.split(',')[0] || `제${info.volumeNo}화`)
      .replace(/^\s*제목\s*:\s*/, '').trim().slice(0, 100);
    const workTitle = (document.querySelector('#novelTitle')?.innerText
      || document.querySelector('h1')?.innerText || '').trim().slice(0, 100);
    return { novelId: info.novelId, volumeNo: info.volumeNo, url: info.url.href, title, workTitle, text };
  }

  async function capture() {
    if (busy) return;
    busy = true;
    const button = document.getElementById(buttonId);
    if (button) { button.disabled = true; button.textContent = '본문 인식 중…'; }
    try {
      const chapter = extractChapter();
      const result = await chrome.runtime.sendMessage({ type: 'SORION_CHAPTER_CAPTURE', chapter });
      if (!result?.ok) throw new Error(result?.error || '서재 연결에 실패했어요.');
      if (button) button.textContent = '낭독 작업실 열었어요';
    } catch (error) {
      if (button) button.textContent = error.message || '본문을 인식하지 못했어요';
    } finally {
      busy = false;
      if (button) {
        button.disabled = false;
        setTimeout(() => { if (button.isConnected) button.textContent = '소리온으로 듣기 ▶'; }, 4000);
      }
    }
  }

  function refreshButton() {
    const valid = Boolean(chapterInfo());
    let button = document.getElementById(buttonId);
    if (!valid) { button?.remove(); return; }
    if (button) return;
    button = document.createElement('button');
    button.id = buttonId;
    button.type = 'button';
    button.textContent = '소리온으로 듣기 ▶';
    button.setAttribute('aria-label', '현재 소설 회차를 소리온 낭독 작업실에서 열기');
    Object.assign(button.style, {
      position: 'fixed', right: '16px', bottom: 'max(18px, env(safe-area-inset-bottom))',
      zIndex: '2147483646', maxWidth: '75vw', border: '1px solid #cf9663',
      borderRadius: '20px', backgroundColor: '#24313a', color: '#fff9ed',
      padding: '12px 17px', fontSize: '14px', fontWeight: '700',
      boxShadow: '0 5px 16px rgba(0,0,0,.22)', cursor: 'pointer',
    });
    button.addEventListener('click', () => void capture());
    document.body.appendChild(button);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'SORION_CAPTURE_NOW') {
      void capture();
      sendResponse({ ok: true });
    }
  });
  refreshButton();
  // 네이버 뷰어의 클라이언트 내 회차 이동도 따라가도록 주소 변경만 검사합니다.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; refreshButton(); }
  }, 900);
})();
