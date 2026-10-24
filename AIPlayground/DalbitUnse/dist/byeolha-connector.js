/* Dalbit Unse ↔ SoriON: invisible, opt-in local F1 voice bridge. */
(() => {
  const channel = 'dalbit-byeolha';
  const sourceUrl = new URL('/AI-/bridge/byeolha.html', location.origin);
  let frame, ready, resolveReady, rejectReady, context, source, pending, serial = 0;
  const broadcast = detail => window.dispatchEvent(new CustomEvent('sorion:byeolha-progress', { detail }));
  function ensureFrame() {
    if (ready) return ready;
    ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = '별하 음성 연결';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('allow', 'autoplay');
    frame.src = sourceUrl.href;
    frame.addEventListener('error', () => rejectReady?.(new Error('소리온 음성 연결을 열 수 없습니다.')));
    document.body.append(frame);
    setTimeout(() => rejectReady?.(new Error('소리온 음성 연결이 응답하지 않습니다.')), 30000);
    return ready;
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow || event.data?.channel !== channel) return;
    const { type, id, blob, message } = event.data;
    if (type === 'ready') { resolveReady?.(); resolveReady = rejectReady = null; return; }
    if (!pending || id !== pending.id) return;
    if (type === 'progress') { broadcast(String(message || '별하 음성을 준비하고 있어요.')); return; }
    const task = pending; pending = null;
    if (type === 'error') task.reject(new Error(String(message || '별하 음성을 만들지 못했습니다.')));
    if (type === 'audio') task.resolve(blob);
  });
  const voice = {
    unlock() {
      try { context ||= new AudioContext(); void context.resume(); } catch { /* browser speech remains available */ }
      void ensureFrame().catch(() => undefined);
    },
    async speak({ text }) {
      const run = ++serial;
      await ensureFrame();
      if (run !== serial) return;
      broadcast('별하 음성을 준비하고 있어요. 첫 사용에는 모델을 내려받습니다.');
      let remaining = String(text).replace(/\s+/g, ' ').trim().slice(0, 8000);
      while (remaining && run === serial) {
        let cut = Math.min(500, remaining.length);
        if (cut < remaining.length) {
          const boundary = Math.max(remaining.lastIndexOf('. ', cut), remaining.lastIndexOf('다. ', cut), remaining.lastIndexOf('요. ', cut), remaining.lastIndexOf(' ', cut));
          if (boundary > 220) cut = boundary + 1;
        }
        const part = remaining.slice(0, cut).trim();
        remaining = remaining.slice(cut).trimStart();
        const id = `${run}-${remaining.length}`;
        const blob = await new Promise((resolve, reject) => {
          pending = { id, resolve, reject };
          frame.contentWindow.postMessage({ channel, type: 'speak', id, text: part }, location.origin);
        });
        if (run !== serial) return;
        context ||= new AudioContext();
        await context.resume();
        const buffer = await context.decodeAudioData(await blob.arrayBuffer());
        if (run !== serial) return;
        await new Promise((resolve, reject) => {
          source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination);
          source.onended = resolve;
          try { source.start(); } catch (error) { reject(error); }
        });
        source = null;
      }
    },
    stop() {
      serial++;
      frame?.contentWindow?.postMessage({ channel, type: 'stop' }, location.origin);
      if (pending) { pending.reject(new DOMException('음성 중단', 'AbortError')); pending = null; }
      try { source?.stop(); } catch { /* already ended */ }
      source = null;
    },
  };
  window.SoriOn = { ...(window.SoriOn || {}), voices: { ...(window.SoriOn?.voices || {}), byeolha: voice } };
  window.dispatchEvent(new Event('sorion:byeolha-ready'));
})();
