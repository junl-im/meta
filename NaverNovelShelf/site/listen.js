(() => {
  'use strict';

  // TXT 선택 또는 사용자가 네이버 회차에서 실행한 브라우저 확장 연결만 받습니다.
  const $ = (id) => document.getElementById(id);
  const elements = {
    work: $('work-select'), episode: $('episode-name'), file: $('manuscript-file'),
    text: $('manuscript-text'), fileName: $('file-name'), charCount: $('char-count'), clean: $('clean-for-reading'), scan: $('text-scan'),
    voice: $('voice-select'), libraryVoice: $('library-voice'), expression: $('library-expression'), speed: $('speed'), speedOutput: $('speed-output'),
    status: $('engine-status'), detail: $('engine-detail'), indicator: $('engine-indicator'),
    readerTitle: $('reading-title'), selectedWork: $('selected-work'), reader: $('reader-text'),
    mode: $('playback-mode'), count: $('chunk-count'), progress: $('progress-track'),
    fill: $('progress-fill'), message: $('player-message'), audio: $('sorion-audio'),
    start: $('sorion-play'), device: $('device-play'), localAi: $('local-ai-play'), prepare: $('local-ai-prepare'), prepareStatus: $('local-ai-status'), pause: $('pause-resume'),
    previous: $('prev-chunk'), next: $('next-chunk'), stop: $('stop-play'),
  };
  let works = (Array.isArray(window.NOVEL_CATALOG) ? window.NOVEL_CATALOG : [])
    .filter((item) => /^\d+$/.test(String(item.id)) && typeof item.title === 'string')
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  const state = {
    chunks: [], currentIndex: 0, mode: null, playing: false, busy: false,
    connectedApi: null, connectionInProgress: false, session: 0,
    abort: null, currentJobId: null, currentApi: null, localWorker: null, localUrl: null, localPart: 0, localReady: false, preparing: false, prefetch: [], localPriming: false, lastGenerationMs: 0,
  };
  let saveThrottle = 0, documentProgressKey = null, activeParagraph = null, activeSpoken = null;
  let episodeController = null, chapterController = null, episodePage = 0, episodeWork = '', episodeBusy = false;

  async function loadPublicChapter(work, volume, button) {
    if (!works.some(item => item.id === work.id && item.league === work.league) || !/^\d{1,6}$/.test(volume)) return;
    chapterController?.abort();
    const controller = new AbortController(); chapterController = controller;
    button.disabled = true; $('episode-status').textContent = `${volume}화 본문을 가져오는 중…`;
    try {
      const source = new URL(`https://m.novel.naver.com/${work.league}/detail`);
      source.searchParams.set('novelId', work.id); source.searchParams.set('volumeNo', volume);
      const html = await window.ShelfPublicReader.read('https://r.jina.ai/' + source.href, {
        signal:controller.signal,headers:{'X-Return-Format':'html'},timeout:30000,maxLength:3000000,
        validate: text=>/\bid\s*=\s*["']con_data["']/.test(text),
        onRetry:()=>{if(chapterController===controller) $('episode-status').textContent = `${volume}화 연결을 다시 확인하는 중…`;}
      });
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const reported = new URL(doc.querySelector('meta[property="og:url"]')?.content || 'about:blank');
      if (!['m.novel.naver.com','novel.naver.com'].includes(reported.hostname) || reported.pathname !== `/${work.league}/detail` || reported.searchParams.get('novelId') !== work.id || reported.searchParams.get('volumeNo') !== volume) throw new Error('회차 출처를 확인할 수 없어요.');
      const main = doc.querySelector('#con_data');
      if (!main) throw new Error('공개된 본문을 확인할 수 없어요. 네이버 원문에서 접근 상태를 확인해 주세요.');
      const copy = main.cloneNode(true);
      copy.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
      copy.querySelectorAll('p').forEach(node => node.append('\n'));
      const text = (copy.textContent || '').replace(/\r\n?/g,'\n').trim();
      if (text.length < 80 || text.length > 200000) throw new Error('읽을 수 있는 본문을 확인하지 못했어요.');
      if (controller.signal.aborted || elements.work.value !== work.id) return;
      const title = (doc.querySelector('#detailContents h2')?.textContent || `제${volume}화`).replace(/^\s*제목\s*:\s*/, '').trim().slice(0,100);
      acceptExtensionChapter({novelId:work.id,volumeNo:volume,url:source.href,title,text}, 'public');
      $('episode-status').textContent = `${volume}화 불러오기 완료`;
    } catch (error) {
      if (!controller.signal.aborted && chapterController===controller && elements.work.value === work.id) $('episode-status').textContent = '본문을 불러오지 못했어요 · 다시 누르거나 원문을 확인해 주세요';
    } finally { button.disabled = false; if (chapterController === controller) chapterController = null; }
  }

  async function loadEpisodes(reset = false) {
    const work = works.find(item => item.id === elements.work.value);
    if (reset) {
      episodeController?.abort(); episodeController = null; chapterController?.abort(); chapterController = null;
      episodePage = 0; episodeWork = work?.id || ''; episodeBusy = false;
      $('episode-list').replaceChildren(); $('episode-more').hidden = true; $('episode-more').textContent = '이전 회차 더 보기';
    }
    if (!work || episodeBusy) { if (!work) $('episode-status').textContent = '작품을 선택해 주세요.'; return; }
    if (!['best','challenge'].includes(work.league) || !/^\d{5,9}$/.test(work.id)) return;
    const selected = work.id, page = episodePage + 1, controller = new AbortController();
    episodeController = controller; episodeBusy = true;
    $('episode-status').textContent = '회차를 불러오는 중…';
    $('episode-more').disabled = true;
    try {
      const source = new URL(`https://m.novel.naver.com/${work.league}/list`);
      source.searchParams.set('novelId', work.id); if (page > 1) source.searchParams.set('page', String(page));
      const body = await window.ShelfPublicReader.read('https://r.jina.ai/' + source.href, {
        signal:controller.signal,timeout:15000,maxLength:500000,
        validate: text=>page>1 || /https:\/\/m\.novel\.naver\.com\/(?:best|challenge)\/detail\?[^\s)]*volumeNo=\d+/.test(text),
        onRetry:()=>{if(episodeController===controller) $('episode-status').textContent = '회차 연결을 다시 확인하는 중…';}
      });
      if (selected !== episodeWork || controller.signal.aborted) return;
      const entries = [], seen = new Set([...$('episode-list').querySelectorAll('a')].map(link => link.dataset.volume));
      for (const match of body.matchAll(/^\s*\*\s+\[([^\]\n]{1,350})\]\((https:\/\/m\.novel\.naver\.com\/[^\s)]+)\)/gm)) {
        let url; try { url = new URL(match[2]); } catch { continue; }
        const volume = url.searchParams.get('volumeNo');
        if (url.hostname !== 'm.novel.naver.com' || url.pathname !== `/${work.league}/detail` || url.searchParams.get('novelId') !== selected || !/^\d{1,6}$/.test(volume || '') || seen.has(volume)) continue;
        seen.add(volume);
        const title = match[1].replace(/^(?:책갈피\s*|UP\s*)+/g,'').replace(/\s+(?:\d{4}\.\d{2}\.\d{2}|\d{1,2}:\d{2})[\s\S]*$/,'').trim().slice(0,120);
        if (!title) continue;
        const row = document.createElement('div'); row.className = 'episode-row';
        const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.dataset.volume = volume; a.textContent = title + ' ↗';
        const play = document.createElement('button'); play.type = 'button'; play.textContent = '본문 가져오기'; play.setAttribute('aria-label', `${title} 본문 가져오기`); play.addEventListener('click', () => void loadPublicChapter(work, volume, play));
        row.append(a, play); entries.push(row);
      }
      if (!entries.length && page===1) throw new Error('회차 목록 형식을 확인할 수 없어요');
      $('episode-list').querySelector('[data-episode-fallback]')?.remove();
      $('episode-list').append(...entries); episodePage = page;
      $('episode-status').textContent = entries.length ? `회차 ${$('episode-list').children.length}개` : '더 불러올 회차가 없어요';
      $('episode-more').hidden = entries.length < 10;
      $('episode-more').textContent = '이전 회차 더 보기';
    } catch (error) {
      if (!controller.signal.aborted && episodeController===controller && selected === episodeWork) {
        $('episode-status').textContent = '목록을 불러오지 못했어요';
        $('episode-more').hidden = false; $('episode-more').textContent = '회차 다시 불러오기';
        if (!$('episode-list').querySelector('[data-episode-fallback]')) {
          const a = document.createElement('a'); a.href = work.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.dataset.episodeFallback = ''; a.textContent = '네이버에서 회차 목록 열기 ↗'; $('episode-list').append(a);
        }
      }
    } finally { if (episodeController === controller) { episodeBusy = false; $('episode-more').disabled = false; } }
  }

  // AI놀이터 서재와 동일한 최신 GitHub Pages 카탈로그를 사용합니다.
  async function refreshPublicWorks() {
    try {
      const url = 'https://junl-im.github.io/meta/NaverNovelShelf/site/catalog-feed.json';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return;
      const feed = await response.json();
      if (feed.schema_version !== 1 || !Array.isArray(feed.works)
          || !/^\d{4}-\d{2}-\d{2}$/.test(feed.catalog_last_verified || '')
          || feed.catalog_last_verified < (window.NOVEL_CATALOG_LAST_CHECK || '')) return;
      const authors = new Set(['[곰같은여우]', '[여우같은곰]', '고양이와사비', '[ZERO]', '닥터X']);
      const incoming = feed.works.map((row) => ({
        id: String(row.id), title: row.title, author: row.author_search_identity,
        league: row.league, url: row.official_url,
      }));
      const found = new Set();
      if (incoming.some((work) => {
        const key = work.league + ':' + work.id;
        if (found.has(key)) return true;
        found.add(key);
        return !authors.has(work.author) || !/^\d+$/.test(work.id)
          || !['best', 'challenge'].includes(work.league)
          || typeof work.title !== 'string' || !work.title
          || work.url !== 'https://m.novel.naver.com/' + work.league + '/list?novelId=' + work.id;
      })) return;
      works = incoming.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
      const current = elements.work.value;
      const queryId = new URLSearchParams(location.search).get('novelId');
      const options = [document.createElement('option')];
      options[0].value = '';
      options[0].textContent = '작품을 선택하세요';
      for (const work of works) {
        const option = document.createElement('option');
        option.value = work.id;
        option.textContent = work.title;
        options.push(option);
      }
      elements.work.replaceChildren(...options);
      const selection = works.some((work) => work.id === current) ? current : queryId;
      if (works.some((work) => work.id === selection)) elements.work.value = selection;
      elements.selectedWork.textContent = selectedWorkTitle();
    } catch { /* 읽기 전용 최신 목록이 실패하면 내장된 작품 목록을 사용합니다. */ }
  }

  function report(message) {
    elements.message.textContent = message;
    const quick = $('local-play-status');
    if (state.mode === 'local' || !quick.hidden) { quick.hidden = false; quick.textContent = message; }
  }

  function voiceLoading(message) {
    const dialog = $('voice-loading'), progress = $('voice-loading-progress');
    $('voice-loading-status').textContent = message;
    const stage = message.match(/\b([1-4])\/4\b/);
    if (stage) progress.value = Number(stage[1]); else progress.removeAttribute('value');
    if (!dialog.open) dialog.showModal();
  }
  function closeVoiceLoading() { if ($('voice-loading').open) $('voice-loading').close(); }

  function chunkText(raw, limit = 520) {
    const normalized = raw.replace(/\r\n?/g, '\n').trim();
    if (!normalized) return [];
    const pieces = normalized.split(/(?<=\n)|(?<=[.!?。！？])\s+/u).filter(Boolean);
    const result = [];
    let buffer = '';
    for (const piece of pieces) {
      const part = piece.trim();
      if (!part) continue;
      if (buffer.length + part.length + 1 <= limit) {
        buffer = buffer ? buffer + '\n' + part : part;
        continue;
      }
      if (buffer) result.push(buffer);
      buffer = '';
      if (part.length <= limit) { buffer = part; continue; }
      let cursor = 0;
      while (cursor < part.length) {
        let end = Math.min(cursor + limit, part.length);
        if (end < part.length && /[\uD800-\uDBFF]/.test(part[end - 1]) && /[\uDC00-\uDFFF]/.test(part[end])) end--;
        const slice = part.slice(cursor, end);
        if (end < part.length || slice.length >= limit) result.push(slice);
        else buffer = slice;
        cursor = end;
      }
    }
    if (buffer) result.push(buffer);
    return result;
  }

  function selectedWorkTitle() {
    return works.find((item) => item.id === elements.work.value)?.title || '선택하지 않은 작품';
  }

  function progressKey() {
    // 원고 본문은 저장하지 않습니다. 회차 위치만 기기 저장소에 보존합니다.
    return 'gomfox-sorion-progress-v1:' + elements.work.value + ':' + elements.episode.value.trim();
  }

  function saveProgress() {
    if (!state.chunks.length) return;
    try { localStorage.setItem(documentProgressKey || progressKey(), JSON.stringify({index:state.currentIndex,part:state.localPart})); } catch {}
  }

  function restoreProgress() {
    try {
      const raw=localStorage.getItem(progressKey());
      const data=JSON.parse(raw || 'null');
      const stored=typeof data==='number' ? data : data?.index;
      if (Number.isInteger(stored) && stored >= 0 && stored < state.chunks.length) {
        state.currentIndex = stored;
        const part=typeof data==='object' && data ? data.part : 0;
        state.localPart=Number.isInteger(part) && part>=0 && part<chunkText(state.chunks[stored],120).length ? part : 0;
      }
    } catch {}
  }

  function paintProgress() {
    const total = state.chunks.length;
    const index = Math.min(state.currentIndex + 1, total);
    const percentage = total ? Math.round((state.currentIndex / total) * 100) : 0;
    elements.count.textContent = index + ' / ' + total;
    elements.fill.style.width = percentage + '%';
    elements.progress.setAttribute('aria-valuenow', String(percentage));
    const active = elements.reader.querySelector('[data-chunk="' + state.currentIndex + '"]');
    if (activeParagraph !== active) { activeParagraph?.classList.remove('active'); active?.classList.add('active'); activeParagraph=active; }
    const spoken=state.mode==='local' && active ? active.querySelector('[data-part="'+state.localPart+'"]') : null;
    if (activeSpoken !== spoken) { activeSpoken?.classList.remove('speaking'); spoken?.classList.add('speaking'); activeSpoken=spoken; }
    const target=spoken || active;
    if (target && state.mode && state.playing) {
      const box=elements.reader.getBoundingClientRect(), rect=target.getBoundingClientRect();
      if (rect.top < box.top || rect.bottom > box.bottom) elements.reader.scrollTop += rect.top-box.top;
    }
    elements.pause.textContent = state.playing ? 'Ⅱ' : '';
    elements.pause.dataset.playing = String(state.playing);
    elements.pause.disabled = state.busy;
    elements.pause.setAttribute('aria-label', state.busy ? '음성 생성 중' : state.playing ? '일시정지' : state.mode ? '다시 재생' : '듣는 서재 AI로 재생');
  }

  function renderText() {
    const content = elements.text.value.slice(0, 200000);
    const markers = (content.match(/\*\*/g) || []).length;
    const hidden = (content.match(/[\u200B\uFEFF]/g) || []).length;
    elements.scan.textContent = content ? `발견: ** ${markers}개 · 숨은 공백 ${hidden}개${elements.clean.checked ? ' · 낭독에만 정리 적용' : ' · 원문 그대로 낭독'}` : '원고를 불러오면 정리할 부분을 살펴봐요.';
    const reading = elements.clean.checked ? content.replace(/\*\*|[\u200B\uFEFF]/g, '') : content;
    state.chunks = chunkText(reading);
    state.currentIndex = 0;
    state.localPart = 0;
    documentProgressKey = progressKey();
    elements.charCount.textContent = content.length.toLocaleString('ko-KR') + '자';
    elements.readerTitle.textContent = elements.episode.value.trim() || '원고 미리보기';
    elements.selectedWork.textContent = selectedWorkTitle();
    const nodes = state.chunks.map((piece, index) => {
      const paragraph = document.createElement('p');
      paragraph.dataset.chunk = String(index);
      for (const [part,text] of chunkText(piece,120).entries()) {
        if (part) paragraph.append(document.createTextNode('\n'));
        const span=document.createElement('span');span.dataset.part=String(part);span.textContent=text;paragraph.append(span);
      }
      return paragraph;
    });
    if (!nodes.length) {
      const empty = document.createElement('p');
      empty.className = 'reader-placeholder';
      empty.textContent = '회차 원고를 선택하거나 붙여넣으면 여기에서 읽을 수 있어요.';
      nodes.push(empty);
    }
    activeParagraph=null;activeSpoken=null;
    elements.reader.replaceChildren(...nodes);
    restoreProgress();
    paintProgress();
    if (state.chunks.length) report('원고를 불러왔어요. 목소리와 재생 방식을 선택해 주세요.');
    else report('낭독할 원고를 준비해 주세요.');
  }

  function setEngineStatus(connected, title, detail) {
    elements.indicator.classList.toggle('connected', connected);
    elements.indicator.classList.toggle('disconnected', !connected);
    elements.status.textContent = title;
    elements.detail.textContent = detail;
    elements.start.disabled = !connected;
  }

  function apiCandidates() {
    const candidates = [];
    const publicUrl = typeof window.SORION_PUBLIC_API_BASE_URL === 'string'
      ? window.SORION_PUBLIC_API_BASE_URL.trim().replace(/\/+$/, '') : '';
    if (/^https:\/\//.test(publicUrl)) candidates.push(publicUrl);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) candidates.push('http://127.0.0.1:8000/api/v1', 'http://localhost:8000/api/v1');
    return candidates;
  }

  async function timedFetch(url, options = {}, ms = 2800) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const onExternalAbort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', onExternalAbort, { once: true });
    try { return await fetch(url, { ...options, signal: controller.signal, cache: 'no-store' }); }
    finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  async function checkEngine() {
    if (state.connectionInProgress) return;
    state.connectionInProgress = true;
    state.connectedApi = null;
    setEngineStatus(false, '소리온 엔진 확인 중', '실행 중인 SoriON API를 찾고 있어요.');
    try {
      for (const base of apiCandidates()) {
        try {
          const response = await timedFetch(base + '/health', {}, 2500);
          if (!response.ok) continue;
          const result = await response.json();
          if (result.status === 'ok' && result.service === 'sorion-api') {
            state.connectedApi = base;
            setEngineStatus(true, '소리온 API 연결됨', '실제 AI 성우 사용 가능 여부는 첫 합성 요청에서 검증해요.');
            return;
          }
        } catch { /* 이 주소는 사용하지 않고 다음 후보를 시험합니다. */ }
      }
      setEngineStatus(false, '소리온 엔진 미연결', 'PC에서 SoriON 엔진을 실행하거나 검증된 HTTPS 음성 API가 필요해요.');
    } finally {
      state.connectionInProgress = false;
    }
  }

  function stopPlayback({ preserveIndex = true, keepReadyWorker = false } = {}) {
    state.session += 1;
    const hadPrefetch=state.prefetch.length > 0;
    state.prefetch = [];
    closeVoiceLoading();
    const api = state.currentApi;
    const job = state.currentJobId;
    state.abort?.abort();
    state.abort = null;
    if (!keepReadyWorker || !state.localReady || state.busy || state.preparing || hadPrefetch) {
      state.localWorker?.terminate(); state.localWorker = null; state.localReady = false;
      if (state.preparing) elements.prepareStatus.textContent = '음성 준비가 중단됐어요. 다시 준비할 수 있어요.';
    }
    state.preparing = false; elements.prepare.disabled = false; elements.localAi.disabled = false;
    state.currentApi = null;
    state.currentJobId = null;
    if (api && job) {
      // 생성 취소는 시도만 하며 오류는 플레이어 동작을 방해하지 않습니다.
      fetch(api + '/tts/jobs/' + encodeURIComponent(job), { method: 'DELETE' }).catch(() => {});
    }
    elements.audio.pause();
    elements.audio.removeAttribute('src');
    elements.audio.load();
    if (state.localUrl) URL.revokeObjectURL(state.localUrl);
    state.localUrl = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    state.playing = false;
    state.busy = false;
    state.mode = null;
    if (!preserveIndex) state.currentIndex = 0;
    paintProgress();
    saveProgress();
  }

  async function apiJSON(url, options, timeout = 90000) {
    const response = await timedFetch(url, options, timeout);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const description = typeof data.detail === 'string' ? data.detail
        : typeof data.message === 'string' ? data.message
        : 'HTTP ' + response.status;
      throw new Error(description);
    }
    return data;
  }

  async function synthesizeChunk(api, text, sessionId) {
    const jobId = crypto.randomUUID();
    const controller = new AbortController();
    state.abort = controller;
    state.currentJobId = jobId;
    state.currentApi = api;
    const payload = {
      text, voice_id: elements.voice.value, emotion: 'neutral',
      speed: Number(elements.speed.value), pitch: 0, output_format: 'wav',
      // 각 인물의 실제 기준 WAV가 있는 CosyVoice만 사용해 시스템 음성으로의
      // 조용한 대체가 일어나지 않도록 합니다.
      engine_id: 'cosyvoice3', normalize_text: true, job_id: jobId,
    };
    let result = await apiJSON(api + '/tts/synthesize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    for (let attempts = 0; !result.audio_url && attempts < 110; attempts++) {
      if (sessionId !== state.session || controller.signal.aborted) throw new Error('취소된 요청');
      if (result.status === 'failed' || result.status === 'cancelled') {
        throw new Error(result.message || '음성 합성 실패');
      }
      await new Promise((resolve) => setTimeout(resolve, 900));
      result = await apiJSON(api + '/tts/jobs/' + encodeURIComponent(jobId) + '/result',
        { signal: controller.signal }, 6000);
    }
    if (!result.audio_url) throw new Error('음성 생성 시간이 초과됐어요.');
    if (!String(result.engine_id || '').startsWith('cosyvoice')) {
      throw new Error('실제 소리온 성우 엔진이 아닌 결과여서 재생하지 않았어요.');
    }
    const url = new URL(result.audio_url, api + '/');
    if (url.origin !== new URL(api).origin) throw new Error('음성 주소의 출처가 다릅니다.');
    state.currentJobId = null;
    state.currentApi = null;
    return url.href;
  }

  async function playSorionChunk(sessionId) {
    if (sessionId !== state.session || state.currentIndex >= state.chunks.length) return;
    state.busy = true;
    state.playing = false;
    paintProgress();
    report('소리온에서 ' + (state.currentIndex + 1) + '번째 원고 구간을 합성하고 있어요.');
    try {
      const audioUrl = await synthesizeChunk(state.connectedApi, state.chunks[state.currentIndex], sessionId);
      if (sessionId !== state.session) return;
      state.busy = false;
      elements.audio.src = audioUrl;
      await elements.audio.play();
      if (sessionId !== state.session) return;
      state.playing = true;
      paintProgress();
      report(elements.voice.selectedOptions[0].textContent + ' · 실제 SoriON 엔진 낭독 중');
    } catch (error) {
      if (sessionId !== state.session) return;
      state.busy = false;
      state.playing = false;
      report('소리온 낭독 실패: ' + (error?.message || '연결 상태를 확인해 주세요.'));
      paintProgress();
    }
  }

  function requestLocalAudio(sessionId, index, part, showProgress) {
    const worker = state.localWorker ||= new Worker('./sorion-local-worker.js?v=20261030-language-boundaries', {type:'module'});
    let synthesisStarted=0;
    return new Promise((resolve, reject) => {
      worker.onmessage = event => {
        if (event.data?.id !== sessionId) return;
        if (event.data.type === 'progress') {
          if (String(event.data.message).includes('음성 파일 생성 중')) synthesisStarted=performance.now();
          if (showProgress) { report(String(event.data.message)); voiceLoading(String(event.data.message)); }
        } else if (event.data.type === 'audio') { if(synthesisStarted) state.lastGenerationMs=performance.now()-synthesisStarted; resolve(event.data.blob); }
        else if (event.data.type === 'error') reject(new Error(event.data.message));
      };
      worker.onerror = () => reject(new Error('기기 AI 음성 엔진을 시작하지 못했어요.'));
      const text = chunkText(state.chunks[index], 120)[part];
      if (!text) { reject(new Error('읽을 문장을 찾지 못했어요.')); return; }
      const expression=elements.expression.value;
      const adjustment=expression === 'calm' ? -.05 : expression === 'vivid' ? .08 : /[!！]{2,}|[!?！？]{2,}/.test(text) ? .06 : 0;
      worker.postMessage({id:sessionId,text,voiceId:elements.libraryVoice.value,voiceName:elements.libraryVoice.selectedOptions[0].textContent,speed:1+adjustment});
    });
  }

  function prefetchNext(sessionId) {
    const queue=state.prefetch;
    let index=queue.length ? queue[queue.length-1].index : state.currentIndex;
    let part=queue.length ? queue[queue.length-1].part : state.localPart;
    while (queue.length < 3) {
      part++;
      if (part >= chunkText(state.chunks[index],120).length) { index++; part=0; }
      if (index >= state.chunks.length) break;
      const nextIndex=index, nextPart=part, previous=queue[queue.length-1];
      const task=(previous ? previous.task : Promise.resolve()).then(result=>{
        if (result?.error) throw result.error;
        if (sessionId !== state.session) throw new Error('취소된 음성 준비');
        return requestLocalAudio(sessionId,nextIndex,nextPart,false);
      }).then(blob=>({blob}),error=>({error}));
      queue.push({index:nextIndex,part:nextPart,task});
    }
  }

  async function playLocalChunk(sessionId) {
    if (sessionId !== state.session || state.currentIndex >= state.chunks.length) return;
    state.busy = true;
    state.playing = false;
    paintProgress();
    report('듣는 서재 AI 음성을 준비하고 있어요. 첫 사용에는 모델 다운로드가 필요해요.');
    try {
      const ready=state.prefetch[0];
      let blob;
      if (ready && ready.index===state.currentIndex && ready.part===state.localPart) {
        state.prefetch.shift();
        const result=await ready.task;
        if (result.error) throw result.error;
        blob=result.blob;
      } else {
        if (!state.localReady) voiceLoading('목소리를 불러오고 있어요.');
        blob=await requestLocalAudio(sessionId,state.currentIndex,state.localPart,!state.localReady);
      }
      if (sessionId !== state.session) return;
      if (state.localPriming) {
        state.localPriming=false;
        const generationMs=state.lastGenerationMs;
        const header=await blob.slice(0,44).arrayBuffer();
        if (sessionId !== state.session) return;
        if (header.byteLength===44) {
          const view=new DataView(header), byteRate=view.getUint32(28,true), dataSize=view.getUint32(40,true);
          const durationMs=byteRate ? dataSize/byteRate*1000/Number(elements.speed.value) : 0;
          if (view.getUint32(0,false)===0x52494646 && durationMs>0 && generationMs>durationMs*.9) {
            prefetchNext(sessionId);
            if (state.prefetch.length) {
              voiceLoading('끊김을 줄이기 위해 다음 부분도 미리 준비하고 있어요.');
              await state.prefetch[0].task;
              if (sessionId !== state.session) return;
            }
          }
        }
      }
      closeVoiceLoading();
      if (state.localUrl) URL.revokeObjectURL(state.localUrl);
      state.localReady = true;
      state.localUrl = URL.createObjectURL(blob);
      state.busy = false;
      elements.audio.src = state.localUrl;
      elements.audio.playbackRate = Number(elements.speed.value);
      await elements.audio.play();
      if (sessionId !== state.session) return;
      state.playing = true;
      paintProgress();
      report('듣는 서재 AI 목소리로 낭독 중 · 원문은 이 기기에서 합성해요.');
      prefetchNext(sessionId);
    } catch (error) {
      if (sessionId !== state.session) return;
      closeVoiceLoading();
      state.busy = false; state.playing = false;
      report(error?.name === 'NotAllowedError' ? '브라우저가 자동 재생을 막았어요. 재생 버튼을 눌러 이어 들어 주세요.' : '기기 AI 음성을 만들지 못했어요: ' + (error?.message || '모델과 기기 상태를 확인해 주세요.'));
      paintProgress();
    }
  }

  async function prepareLocalAi() {
    if (state.preparing) return;
    if (state.localReady && state.localWorker) { elements.prepareStatus.textContent = '이 화면에서 AI 음성을 사용할 준비가 되었어요.'; return; }
    stopPlayback();
    const sessionId = state.session;
    state.preparing = true; elements.prepare.disabled = true; elements.localAi.disabled = true;
    elements.prepareStatus.textContent = 'AI 음성 준비 중 · 첫 사용에는 약 380MB를 내려받아요.';
    voiceLoading(elements.prepareStatus.textContent);
    try {
      state.localWorker = new Worker('./sorion-local-worker.js?v=20261030-language-boundaries', {type:'module'});
      const worker = state.localWorker;
      await new Promise((resolve, reject) => {
        worker.onmessage = event => {
          if (event.data?.id !== sessionId) return;
          if (event.data.type === 'progress') { elements.prepareStatus.textContent = String(event.data.message); voiceLoading(elements.prepareStatus.textContent); }
          else if (event.data.type === 'ready') resolve();
          else if (event.data.type === 'error') reject(new Error(event.data.message));
        };
        worker.onerror = () => reject(new Error('AI 음성 엔진을 시작하지 못했어요.'));
        worker.postMessage({id:sessionId,type:'prepare'});
      });
      if (sessionId !== state.session) return;
      state.localReady = true;
      elements.prepareStatus.textContent = 'AI 음성 준비 완료 · 내용을 불러온 뒤 바로 재생할 수 있어요.';
    } catch (error) {
      if (sessionId !== state.session) return;
      state.localWorker?.terminate(); state.localWorker = null; state.localReady = false;
      elements.prepareStatus.textContent = '음성 준비 실패 · 인터넷 연결과 기기 저장 공간을 확인하고 다시 시도해 주세요.';
    } finally {
      if (sessionId === state.session) { closeVoiceLoading(); state.preparing = false; elements.prepare.disabled = false; elements.localAi.disabled = false; }
    }
  }

  function selectBrowserVoice() {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((voice) => voice.lang?.toLowerCase() === 'ko-kr')
      || voices.find((voice) => voice.lang?.toLowerCase().startsWith('ko')) || null;
  }

  function playDeviceChunk(sessionId) {
    if (sessionId !== state.session || state.currentIndex >= state.chunks.length) return;
    const speech = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(state.chunks[state.currentIndex]);
    utterance.lang = 'ko-KR';
    utterance.rate = Number(elements.speed.value);
    const voice = selectBrowserVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => {
      if (sessionId !== state.session) return;
      state.playing = true;
      paintProgress();
      report('기기 기본 음성으로 읽는 중 · 소리온 AI 성우가 아닙니다.');
    };
    utterance.onend = () => {
      if (sessionId !== state.session) return;
      void advanceChunk(sessionId);
    };
    utterance.onerror = (error) => {
      if (sessionId !== state.session || error.error === 'canceled' || error.error === 'interrupted') return;
      state.playing = false;
      report('기기 음성 재생에 실패했어요. 한국어 음성 설정을 확인해 주세요.');
      paintProgress();
    };
    speech.speak(utterance);
  }

  async function advanceChunk(sessionId) {
    if (sessionId !== state.session) return;
    state.currentIndex++;
    if (state.currentIndex >= state.chunks.length) {
      state.currentIndex = 0;
      state.localPart = 0;
      state.mode = null;
      state.playing = false;
      state.busy = false;
      saveProgress();
      paintProgress();
      elements.fill.style.width = '100%';
      elements.progress.setAttribute('aria-valuenow', '100');
      report('이 회차의 낭독이 끝났어요. 재생을 누르면 처음부터 다시 들어요.');
      return;
    }
    saveProgress();
    paintProgress();
    if (state.mode === 'sorion') await playSorionChunk(sessionId);
    else if (state.mode === 'local') await playLocalChunk(sessionId);
    else if (state.mode === 'device') playDeviceChunk(sessionId);
  }

  async function start(mode) {
    if (saveThrottle) resetDocument();
    if (!state.chunks.length) { report('먼저 회차 원고를 불러와 주세요.'); $('manual-entry').open = true; elements.text.focus(); return; }
    if (mode === 'sorion' && !state.connectedApi) { report('소리온 엔진이 연결되지 않았어요.'); return; }
    if (mode === 'device' && !('speechSynthesis' in window)) { report('이 브라우저는 기기 음성을 지원하지 않아요.'); return; }
    stopPlayback({keepReadyWorker: mode === 'local'});
    state.mode = mode;
    if (mode !== 'local') state.localPart = 0;
    state.localPriming = mode === 'local'; state.lastGenerationMs=0;
    const sessionId = state.session;
    elements.mode.textContent = mode === 'sorion' ? 'SoriON AI 성우' : mode === 'local' ? '듣는 서재 AI' : '기기 음성 · 체험용';
    if (mode === 'sorion') await playSorionChunk(sessionId);
    else if (mode === 'local') await playLocalChunk(sessionId);
    else playDeviceChunk(sessionId);
  }

  function jump(delta) {
    if (!state.chunks.length) return;
    const mode = state.mode;
    stopPlayback();
    state.currentIndex = Math.max(0, Math.min(state.currentIndex + delta, state.chunks.length - 1));
    state.localPart = 0;
    paintProgress();
    saveProgress();
    if (mode) void start(mode);
  }

  function togglePause() {
    if (state.busy) return;
    if (!state.mode) { void start('local'); return; }
    if (state.mode === 'sorion' || state.mode === 'local') {
      if (elements.audio.paused) void elements.audio.play().catch(() => report('재생을 다시 시작할 수 없어요.'));
      else elements.audio.pause();
      state.playing = !elements.audio.paused;
    } else {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      else window.speechSynthesis.pause();
      state.playing = !window.speechSynthesis.paused;
    }
    paintProgress();
  }

  function resetDocument() {
    clearTimeout(saveThrottle);
    saveThrottle = 0;
    stopPlayback({ preserveIndex: false, keepReadyWorker: true });
    state.mode = null;
    elements.mode.textContent = '낭독 준비';
    renderText();
  }

  function acceptExtensionChapter(chapter, sourceKind = 'extension') {
    if (!chapter || typeof chapter !== 'object') return;
    if (typeof chapter.text !== 'string' || chapter.text.length < 80 || chapter.text.length > 200000) return;
    if (typeof chapter.novelId !== 'string' || !/^\d{5,9}$/.test(chapter.novelId)) return;
    if (typeof chapter.volumeNo !== 'string' || !/^\d{1,6}$/.test(chapter.volumeNo)) return;
    let source;
    try { source = new URL(chapter.url); } catch { return; }
    if (source.protocol !== 'https:' || !['m.novel.naver.com', 'novel.naver.com'].includes(source.hostname)
        || !/^\/(best|challenge)\/detail$/.test(source.pathname)
        || source.searchParams.get('novelId') !== chapter.novelId
        || source.searchParams.get('volumeNo') !== chapter.volumeNo) return;
    if (!works.some((work) => work.id === chapter.novelId)) return;
    elements.work.value = chapter.novelId;
    elements.work.dispatchEvent(new Event('shelf-select-sync'));
    elements.episode.value = String(chapter.title || `제${chapter.volumeNo}화`).slice(0, 100);
    elements.text.value = chapter.text;
    elements.fileName.textContent = sourceKind === 'public' ? '공개 회차 조회로 본문 가져옴' : '네이버 현재 회차에서 자동 인식';
    elements.file.value = '';
    const sourceLink = $('chapter-source-link');
    sourceLink.href = source.href;
    sourceLink.hidden = false;
    resetDocument();
    report('네이버 ' + chapter.volumeNo + '화 본문 ' + chapter.text.length.toLocaleString('ko-KR') + '자를 자동으로 불러왔어요. 이제 목소리를 선택하고 재생해 주세요.');
    const banner = $('extension-import-status');
    banner.hidden = false;
    banner.textContent = `네이버 ${chapter.volumeNo}화 가져오기 완료 · 원문을 확인한 뒤 재생해 주세요.`;
    if (sourceKind === 'extension') window.postMessage({ type: 'GOMFOX_SORION_CHAPTER_ACCEPTED_V1' }, location.origin);
    const params = new URLSearchParams(location.search);
    params.delete('handoff');
    params.delete('capture');
    history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
    void start('local');
  }

  function acceptExtensionMessage(event) {
    if (event.source !== window || event.origin !== location.origin || !event.data) return;
    if (event.data.type === 'GOMFOX_SORION_CHAPTER_IMPORTED_V1') {
      acceptExtensionChapter(event.data.chapter);
    } else if (event.data.type === 'GOMFOX_SORION_CHAPTER_ERROR_V1') {
      report('네이버 원고 전달 실패: ' + String(event.data.message || '다시 시도해 주세요.').slice(0, 150));
    }
  }

  async function loadTextFile(file) {
    if (!file) return;
    if (file.size > 1024 * 1024) { report('TXT 파일은 1MB 이하만 열 수 있어요.'); return; }
    try {
      const buffer = await file.arrayBuffer();
      let content;
      try { content = new TextDecoder('utf-8', { fatal: true }).decode(buffer); }
      catch { content = new TextDecoder('euc-kr').decode(buffer); }
      elements.text.value = content.slice(0, 200000);
      elements.fileName.textContent = file.name;
      if (!elements.episode.value.trim()) elements.episode.value = file.name.replace(/\.txt$/i, '');
      resetDocument();
    } catch { report('TXT 파일을 읽지 못했어요. 파일 형식을 확인해 주세요.'); }
  }

  function setupIllustratedSelect(select) {
    const wrapper = document.createElement('div'); wrapper.className = 'illustrated-select'; wrapper.dataset.selectId = select.id;
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'illustrated-select-trigger'; trigger.setAttribute('aria-haspopup','listbox'); trigger.setAttribute('aria-expanded','false');
    const text = document.createElement('span'); trigger.append(text);
    const list = document.createElement('div'); list.className = 'illustrated-select-list'; list.id = select.id + '-options'; list.setAttribute('role','listbox'); list.hidden = true;
    trigger.setAttribute('aria-controls',list.id);
    const label = document.querySelector(`label[for="${select.id}"]`);
    if (label) { label.id ||= select.id + '-label'; trigger.setAttribute('aria-labelledby',label.id + ' ' + select.id + '-value'); text.id = select.id + '-value'; label.addEventListener('click',event => { event.preventDefault(); trigger.focus(); }); }
    select.insertAdjacentElement('afterend',wrapper); wrapper.append(trigger,list); select.hidden = true;
    const close = (restore = false) => { list.hidden = true; wrapper.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); if (restore) trigger.focus(); };
    const sync = () => { text.textContent = select.selectedOptions[0]?.textContent || '선택하세요'; for (const option of list.querySelectorAll('[role=option]')) option.setAttribute('aria-selected',String(option.dataset.value === select.value)); };
    const build = () => {
      list.replaceChildren();
      for (const item of select.options) {
        const option = document.createElement('button'); option.type='button'; option.className='illustrated-select-option'; option.setAttribute('role','option'); option.dataset.value=item.value; option.textContent=item.textContent; option.disabled=item.disabled;
        option.addEventListener('click',() => { select.value=item.value; select.dispatchEvent(new Event('change',{bubbles:true})); sync(); close(true); });
        list.append(option);
      }
      sync();
    };
    const open = (focus = false) => { build(); list.hidden=false; wrapper.classList.add('is-open'); trigger.setAttribute('aria-expanded','true'); if (focus) (list.querySelector('[aria-selected=true]:not(:disabled)') || list.querySelector('button:not(:disabled)'))?.focus(); };
    trigger.addEventListener('click',() => { if (list.hidden) open(); else close(); });
    trigger.addEventListener('keydown',event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(true); } else if (event.key === 'Escape') close(); });
    list.addEventListener('keydown',event => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
      event.preventDefault(); const items=[...list.querySelectorAll('button:not(:disabled)')]; if (!items.length) return;
      const i=items.indexOf(document.activeElement); const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(i+1)%items.length:(i-1+items.length)%items.length; items[next].focus();
    });
    document.addEventListener('click',event => { if (!wrapper.contains(event.target)) close(); });
    document.addEventListener('focusin',event => { if (!wrapper.contains(event.target)) close(); });
    select.addEventListener('change',sync); select.addEventListener('shelf-select-sync',sync);
    new MutationObserver(build).observe(select,{childList:true,subtree:true}); build();
  }

  function init() {
    window.addEventListener('message', acceptExtensionMessage);
    for (const work of works) {
      const option = document.createElement('option');
      option.value = work.id;
      option.textContent = work.title;
      elements.work.appendChild(option);
    }
    const requestedId = new URLSearchParams(location.search).get('novelId');
    if (works.some((work) => work.id === requestedId)) elements.work.value = requestedId;
    [elements.work, elements.voice, elements.libraryVoice, elements.expression].forEach(setupIllustratedSelect);
    elements.work.addEventListener('change', () => { resetDocument(); void loadEpisodes(true); });
    $('episode-more').addEventListener('click', () => void loadEpisodes());
    elements.episode.addEventListener('change', resetDocument);
    elements.text.addEventListener('input', () => {
      clearTimeout(saveThrottle);
      saveThrottle = setTimeout(resetDocument, 220);
    });
    elements.clean.addEventListener('change', resetDocument);
    elements.file.addEventListener('change', () => void loadTextFile(elements.file.files?.[0]));
    $('clear-text').addEventListener('click', () => { elements.text.value = ''; elements.file.value = ''; elements.fileName.textContent = '선택한 파일 없음'; $('chapter-source-link').hidden = true; $('extension-import-status').hidden = true; resetDocument(); });
    elements.speed.addEventListener('input', () => { elements.speedOutput.value = Number(elements.speed.value).toFixed(2).replace(/0$/, '') + '배'; if(state.mode === 'local') elements.audio.playbackRate=Number(elements.speed.value); });
    $('recheck-engine').addEventListener('click', () => void checkEngine());
    elements.start.addEventListener('click', () => void start('sorion'));
    elements.localAi.addEventListener('click', () => void start('local'));
    elements.prepare.addEventListener('click', () => void prepareLocalAi());
    $('voice-loading-cancel').addEventListener('click', () => { stopPlayback(); report('음성 준비를 취소했어요.'); });
    $('voice-loading').addEventListener('cancel', event => { event.preventDefault(); stopPlayback(); report('음성 준비를 취소했어요.'); });
    [elements.libraryVoice,elements.expression].forEach(select=>select.addEventListener('change',()=>{
      if (state.mode==='local') { stopPlayback(); report('목소리가 바뀌었어요. 재생을 눌러 계속 들어 주세요.'); }
    }));
    elements.device.addEventListener('click', () => void start('device'));
    elements.pause.addEventListener('click', togglePause);
    elements.previous.addEventListener('click', () => jump(-1));
    elements.next.addEventListener('click', () => jump(1));
    elements.stop.addEventListener('click', () => { stopPlayback(); report('낭독을 중지했어요.'); });
    elements.audio.addEventListener('ended', () => {
      if (state.mode === 'local' && state.localPart + 1 < chunkText(state.chunks[state.currentIndex],120).length) {
        state.localPart++;
        saveProgress();
        void playLocalChunk(state.session);
      } else if (state.mode === 'sorion' || state.mode === 'local') {
        state.localPart = 0;
        void advanceChunk(state.session);
      }
    });
    elements.audio.addEventListener('pause', () => { if (state.mode !== 'sorion' && state.mode !== 'local') return; state.playing = false; paintProgress(); });
    elements.audio.addEventListener('play', () => { if (state.mode !== 'sorion' && state.mode !== 'local') return; state.playing = true; paintProgress(); });
    elements.audio.addEventListener('error', () => { if ((state.mode !== 'sorion' && state.mode !== 'local') || state.busy) return; report('음성 파일을 재생하지 못했어요. 연결 상태를 확인해 주세요.'); });
    window.addEventListener('pagehide', () => { saveProgress(); stopPlayback(); });
    renderText();
    if (elements.work.value) void loadEpisodes(true);
    void checkEngine();
    void refreshPublicWorks();
  }
  init();
})();
