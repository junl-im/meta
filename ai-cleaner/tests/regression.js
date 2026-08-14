(() => {
  'use strict';

  const frame = document.getElementById('appFrame');
  const testsBox = document.getElementById('tests');
  const summary = document.getElementById('summary');
  const frameStatus = document.getElementById('frameStatus');
  let results = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, timeout = 12000, step = 80) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try { if (fn()) return true; } catch (_) {}
      await sleep(step);
    }
    return false;
  };

  function app() {
    const w = frame.contentWindow;
    const d = frame.contentDocument;
    if (!w || !d) throw new Error('앱 iframe에 접근할 수 없습니다.');
    return { w, d };
  }

  function add(name, ok, detail = '', kind = null) {
    const status = kind || (ok ? 'pass' : 'fail');
    results.push({ name, ok: status === 'pass', status, detail });
    const row = document.createElement('div');
    row.className = `test ${status}`;
    const title = document.createElement('div');
    title.className = 'name';
    title.textContent = `${status === 'pass' ? '✅' : status === 'skip' ? '⏭️' : '❌'} ${name}`;
    row.appendChild(title);
    if (detail) {
      const body = document.createElement('div');
      body.className = 'detail';
      body.textContent = detail;
      row.appendChild(body);
    }
    testsBox.appendChild(row);
    renderSummary();
  }

  function renderSummary() {
    const pass = results.filter((x) => x.status === 'pass').length;
    const fail = results.filter((x) => x.status === 'fail').length;
    const skip = results.filter((x) => x.status === 'skip').length;
    summary.textContent = `${pass} 통과 · ${fail} 실패${skip ? ` · ${skip} 건너뜀` : ''}`;
  }

  function resetResults() {
    results = [];
    testsBox.textContent = '';
    summary.textContent = '실행 중…';
  }

  async function ensureAppReady() {
    const ok = await waitFor(() => {
      const d = frame.contentDocument;
      return d && d.readyState === 'complete' && d.getElementById('analyze') && d.getElementById('imageInput');
    }, 15000);
    if (!ok) throw new Error('앱 로딩 시간이 초과되었습니다.');
    frameStatus.textContent = '준비됨';
    return app();
  }

  function analyzeText(d, text, profile = 'standard', nfkc = false) {
    const input = d.getElementById('input');
    const cleanProfile = d.getElementById('cleanProfile');
    const norm = d.getElementById('norm');
    input.value = text;
    cleanProfile.value = profile;
    norm.checked = nfkc;
    d.getElementById('analyze').click();
    return d.getElementById('output').value;
  }

  async function makeSyntheticPng(w) {
    const canvas = document.createElement('canvas');
    canvas.width = 96; canvas.height = 96;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 96, 96);
    grad.addColorStop(0, '#ffb36b'); grad.addColorStop(1, '#4b6cb7');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 96, 96);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(24, 24, 48, 48);
    ctx.clearRect(42, 42, 12, 12);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const bytes = await blob.arrayBuffer();
    return new w.File([bytes], 'synthetic-regression.png', { type: 'image/png' });
  }

  async function runCore() {
    resetResults();
    try {
      const { w, d } = await ensureAppReady();

      const required = ['input','output','cleanProfile','xrayView','v62ReviewList','imageResults','metaSdkStatus','c2paSdkStatus'];
      const missing = required.filter((id) => !d.getElementById(id));
      add('필수 DOM 요소', missing.length === 0, missing.length ? `누락: ${missing.join(', ')}` : `${required.length}개 요소 확인`);

      const probe = `A\u200BB\u200EC\u00A0D 👩\u200D💻 ❤️`;
      let out = analyzeText(d, probe, 'standard', false);
      const standardOk = !out.includes('\u200B') && !out.includes('\u200E') && !out.includes('\u00A0') && out.includes('👩\u200D💻') && out.includes('\uFE0F');
      add('표준 정리: 숨은 문자/특수 공백 정리 + 의미 민감 Unicode 보존', standardOk,
        `ZWSP ${out.includes('\u200B') ? '남음' : '제거'} · LRM ${out.includes('\u200E') ? '남음' : '제거'} · NBSP ${out.includes('\u00A0') ? '남음' : '정리'} · ZWJ ${out.includes('\u200D') ? '보존' : '손실'} · VS16 ${out.includes('\uFE0F') ? '보존' : '손실'}`);

      const safeInput = `왼쪽\u200B오른쪽\u00A0공백`;
      out = analyzeText(d, safeInput, 'safe', false);
      add('보수적 정리: 제어/숨은 문자만 제거', !out.includes('\u200B') && out.includes('\u00A0'), `결과 코드포인트: ${[...out].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase()).join(' ')}`);

      const inspectInput = `X\u200BY\u200EZ\u00A0Q`;
      out = analyzeText(d, inspectInput, 'inspect', false);
      add('검사 전용: 자동 변경 없음', out === inspectInput, out === inspectInput ? '원문과 결과가 동일' : `원문 ${inspectInput.length} / 결과 ${out.length}`);

      out = analyzeText(d, 'Ｆｕｌｌｗｉｄｔｈ ＡＢＣ ①', 'inspect', true);
      add('NFKC 정규화', out.includes('Fullwidth ABC 1'), `결과: ${out}`);

      analyzeText(d, `앞\u200B뒤`, 'inspect', false);
      const xrayTab = d.querySelector('[data-resulttab="xray"]');
      if (xrayTab) xrayTab.click();
      const xrayOk = d.getElementById('xrayView').textContent.includes('U+200B');
      add('X-ray 코드포인트 표시', xrayOk, d.getElementById('xrayView').textContent.slice(0, 120));

      const longSentence = '이 문장은 문장 검토 회귀 테스트를 위해 일부러 길게 작성되었으며 사용자가 직접 확인해야 할 긴 문장을 문장별 카드에서 빠르게 찾을 수 있는지를 검사하기 위해 충분히 많은 글자를 포함하고 있습니다.';
      analyzeText(d, longSentence, 'standard', false);
      const reviewCount = d.querySelectorAll('#v62ReviewList .v62review').length;
      add('문장 검토 카드 생성', reviewCount > 0, `카드 ${reviewCount}개`);

      add('ExifReader CDN 로딩', !!(w.ExifReader && typeof w.ExifReader.load === 'function'), w.ExifReader ? 'ExifReader.load 확인' : 'window.ExifReader 없음');

      if (typeof w.loadImage !== 'function') {
        add('이미지 분석 엔진 노출', false, 'window.loadImage가 없습니다.');
      } else {
        add('이미지 분석 엔진 노출', true, 'window.loadImage 확인');
        const file = await makeSyntheticPng(w);
        await w.loadImage(file);
        const finished = await waitFor(() => /완료|분석 오류/.test(d.getElementById('imageLoadStatus').textContent), 20000);
        const visible = !d.getElementById('imageResults').classList.contains('hidden');
        const score = Number(d.getElementById('imageScoreNum').textContent);
        add('합성 PNG 로컬 분석', finished && visible && Number.isFinite(score), `상태: ${d.getElementById('imageLoadStatus').textContent} · 점수 ${d.getElementById('imageScoreNum').textContent}`);
        add('구조화 메타데이터 패널', d.getElementById('metaSdkStatus').textContent !== '—', d.getElementById('metaSdkStatus').textContent);
        add('C2PA 검사 경로 실행', d.getElementById('c2paSdkStatus').textContent !== '—', d.getElementById('c2paSdkStatus').textContent);
      }
    } catch (err) {
      add('핵심 테스트 실행 자체', false, String(err && err.stack ? err.stack : err));
    }
  }

  async function runNetwork() {
    resetResults();
    try {
      const { w, d } = await ensureAppReady();
      add('ExifReader CDN', !!(w.ExifReader && typeof w.ExifReader.load === 'function'), w.ExifReader ? '로드됨' : '로드 실패');

      const url = 'https://spec.c2pa.org/public-testfiles/image/jpeg/adobe-20220124-C.jpg';
      let response;
      try {
        response = await fetch(url, { mode: 'cors' });
        add('공식 C2PA 테스트 파일 다운로드', response.ok, `HTTP ${response.status}`);
      } catch (err) {
        add('공식 C2PA 테스트 파일 다운로드', false, `CORS/네트워크 오류: ${err.message}`);
        return;
      }
      if (!response.ok) return;
      const blob = await response.blob();
      const bytes = await blob.arrayBuffer();
      const file = new w.File([bytes], 'adobe-c2pa-fixture.jpg', { type: 'image/jpeg' });
      await w.loadImage(file);
      await waitFor(() => /완료|분석 오류/.test(d.getElementById('imageLoadStatus').textContent), 30000);
      const sdk = d.getElementById('c2paSdkStatus').textContent;
      const validation = d.getElementById('c2paValidation').textContent;
      const source = d.getElementById('c2paSource').textContent;
      add('공식 c2pa-web manifest 판독', /manifest 읽음/.test(sdk), `${sdk}\nvalidation: ${validation}\nsource: ${source}`);
      add('C2PA validation 결과 표시', validation !== '—' && validation !== '검사 실패', validation);
      add('C2PA digitalSourceType 표시', source !== '—', source);
    } catch (err) {
      add('네트워크 테스트 실행 자체', false, String(err && err.stack ? err.stack : err));
    }
  }

  document.getElementById('runCore').addEventListener('click', runCore);
  document.getElementById('runNetwork').addEventListener('click', runNetwork);
  document.getElementById('reloadApp').addEventListener('click', () => {
    frameStatus.textContent = '다시 불러오는 중…';
    frame.src = `../index.html?regression=${Date.now()}`;
  });
  frame.addEventListener('load', () => { frameStatus.textContent = '준비됨'; });
})();
