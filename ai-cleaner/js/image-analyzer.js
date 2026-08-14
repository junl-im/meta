(() => {
  'use strict';

  const C2PA_VERSION = '0.13.4';
  const C2PA_ESM = `https://cdn.jsdelivr.net/npm/@contentauth/c2pa-web@${C2PA_VERSION}/+esm`;
  const C2PA_WASM = `https://cdn.jsdelivr.net/npm/@contentauth/c2pa-web@${C2PA_VERSION}/dist/resources/c2pa_bg.wasm`;
  const AI_SOURCE_TOKEN = 'trainedAlgorithmicMedia';
  const CAMERA_SOURCE_TOKEN = 'digitalCapture';
  let currentObjectUrl = null;
  let c2paModulePromise = null;

  const q = (s) => document.querySelector(s);
  const setText = (id, value) => {
    const el = q('#' + id);
    if (el) el.textContent = value == null || value === '' ? '—' : String(value);
  };
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const sd = (arr) => {
    if (!arr.length) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
  };
  const corr = (a, b) => {
    const n = Math.min(a.length, b.length);
    if (!n) return 0;
    const aa = a.slice(0, n), bb = b.slice(0, n);
    const ma = mean(aa), mb = mean(bb);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      const x = aa[i] - ma, y = bb[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    return num / Math.sqrt(Math.max(1e-12, da * db));
  };

  function inferMime(file) {
    if (file.type) return file.type;
    const n = (file.name || '').toLowerCase();
    if (n.endsWith('.png')) return 'image/png';
    if (n.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }

  function scanBinary(buffer, file) {
    const bytes = new Uint8Array(buffer);
    let format = '알 수 없음';
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) format = 'PNG';
    else if (bytes[0] === 0xff && bytes[1] === 0xd8) format = 'JPEG';
    else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) format = 'WebP/RIFF';

    const ascii = new TextDecoder('latin1').decode(bytes);
    const low = ascii.toLowerCase();
    const c2paTokens = ['c2pa', 'application/jumbf', 'content credentials', 'contentcredentials'];
    const c2paHits = c2paTokens.filter((k) => low.includes(k));
    const generators = [
      ['OpenAI / DALL-E', /(openai|chatgpt|dall[·\- ]?e)/i],
      ['Adobe Firefly', /firefly/i],
      ['Stable Diffusion', /stable diffusion|stablediffusion|sdxl/i],
      ['ComfyUI', /comfyui/i],
      ['Midjourney', /midjourney/i],
      ['Google Imagen / Gemini', /imagen|gemini/i],
      ['FLUX', /flux\.1|black forest labs/i]
    ];
    const generatorHits = generators.filter(([, re]) => re.test(ascii)).map(([name]) => name);
    const promptPatterns = [/negative prompt/i, /steps\s*[:=]/i, /sampler\s*[:=]/i, /cfg scale/i, /seed\s*[:=]/i, /checkpoint/i, /workflow/i];
    const promptHits = promptPatterns.filter((re) => re.test(ascii)).map((re) => re.source);
    return {
      format,
      size: file.size,
      c2paHits,
      generatorHits: uniq(generatorHits),
      promptHits,
      meta: {
        exif: /exif/i.test(ascii),
        xmp: /xmpmeta|adobe:ns:meta/i.test(ascii),
        icc: /icc_profile|icc profile/i.test(ascii),
        iptc: /photoshop 3\.0|iptc/i.test(ascii)
      }
    };
  }

  function tagDescription(tag) {
    if (tag == null) return '';
    if (typeof tag === 'string' || typeof tag === 'number' || typeof tag === 'boolean') return String(tag);
    if (typeof tag.description === 'string' || typeof tag.description === 'number') return String(tag.description);
    if (Array.isArray(tag.value)) return tag.value.join(', ');
    if (tag.value != null && typeof tag.value !== 'object') return String(tag.value);
    return '';
  }

  function firstTag(tags, names) {
    for (const name of names) {
      if (tags && tags[name]) {
        const v = tagDescription(tags[name]);
        if (v) return v;
      }
    }
    return '';
  }

  async function inspectExif(file) {
    if (!window.ExifReader || typeof window.ExifReader.load !== 'function') {
      return { ok: false, error: 'ExifReader CDN을 불러오지 못했습니다.' };
    }
    try {
      const tags = await window.ExifReader.load(file);
      const keys = Object.keys(tags || {});
      const camera = [firstTag(tags, ['Make']), firstTag(tags, ['Model'])].filter(Boolean).join(' ');
      const software = firstTag(tags, ['Software', 'CreatorTool', 'ProcessingSoftware', 'HostComputer']);
      const date = firstTag(tags, ['DateTimeOriginal', 'CreateDate', 'DateTimeDigitized', 'ModifyDate']);
      const author = firstTag(tags, ['Artist', 'Creator', 'Copyright', 'OwnerName']);
      const gpsPresent = keys.some((k) => /^GPS|Latitude|Longitude/i.test(k));
      const interesting = [];
      const generatorHits = [];
      const promptHits = [];
      const aiTools = /(openai|chatgpt|dall.?e|firefly|stable diffusion|stablediffusion|sdxl|comfyui|midjourney|imagen|gemini|flux\.1|black forest labs)/i;
      const promptish = /(prompt|negative prompt|workflow|sampler|cfg scale|checkpoint|seed|parameters)/i;
      for (const key of keys) {
        const value = tagDescription(tags[key]);
        if (!value) continue;
        if (/software|creator|generator|description|comment|parameters|workflow|prompt/i.test(key)) {
          interesting.push(`${key}: ${value}`.slice(0, 300));
        }
        if (aiTools.test(`${key} ${value}`)) generatorHits.push(value.slice(0, 120));
        if (promptish.test(`${key} ${value}`)) promptHits.push(`${key}: ${value}`.slice(0, 180));
      }
      return {
        ok: true,
        tagCount: keys.length,
        camera,
        software,
        date,
        author,
        gpsPresent,
        interesting: interesting.slice(0, 8),
        generatorHits: uniq(generatorHits),
        promptHits: uniq(promptHits)
      };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  }

  function loadC2paModule() {
    if (!c2paModulePromise) c2paModulePromise = import(C2PA_ESM);
    return c2paModulePromise;
  }

  function collectSourceTypes(activeManifest) {
    const out = [];
    for (const assertion of activeManifest && Array.isArray(activeManifest.assertions) ? activeManifest.assertions : []) {
      const actions = assertion && assertion.data && Array.isArray(assertion.data.actions) ? assertion.data.actions : [];
      for (const action of actions) {
        if (action && action.digitalSourceType) out.push(String(action.digitalSourceType).trim());
      }
    }
    return uniq(out);
  }

  async function inspectC2pa(file) {
    let reader;
    try {
      const mod = await loadC2paModule();
      if (!mod || typeof mod.createC2pa !== 'function') throw new Error('createC2pa export 없음');
      const c2pa = await mod.createC2pa({ wasmSrc: C2PA_WASM });
      reader = await c2pa.reader.fromBlob(inferMime(file), file);
      const store = await reader.manifestStore();
      if (!store || !store.active_manifest) {
        return { ok: true, present: false, validationState: store && store.validation_state ? store.validation_state : '' };
      }
      const active = store.manifests && store.manifests[store.active_manifest] ? store.manifests[store.active_manifest] : null;
      const sourceTypes = collectSourceTypes(active);
      const validation = store.validation_results && store.validation_results.activeManifest ? store.validation_results.activeManifest : {};
      const failures = Array.isArray(validation.failure) ? validation.failure : [];
      const successes = Array.isArray(validation.success) ? validation.success : [];
      const generatorInfo = active && Array.isArray(active.claim_generator_info) ? active.claim_generator_info.map((x) => [x.name, x.version].filter(Boolean).join(' ')) : [];
      const signer = active && active.signature_info ? [active.signature_info.common_name, active.signature_info.issuer].filter(Boolean).join(' / ') : '';
      return {
        ok: true,
        present: true,
        activeManifest: store.active_manifest,
        title: active && active.title ? active.title : '',
        sourceTypes,
        validationState: store.validation_state || '',
        validationStatusCount: Array.isArray(store.validation_status) ? store.validation_status.length : 0,
        successes: successes.length,
        failures: failures.length,
        failureCodes: failures.map((x) => x && x.code).filter(Boolean).slice(0, 6),
        generatorInfo: uniq(generatorInfo),
        signer
      };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    } finally {
      if (reader && typeof reader.free === 'function') {
        try { await reader.free(); } catch (_) {}
      }
    }
  }

  function analyzePixels(img) {
    const max = 820;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = q('#heatCanvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const px = imageData.data;
    const lum = (x, y) => {
      const xx = Math.min(w - 1, Math.max(0, x));
      const yy = Math.min(h - 1, Math.max(0, y));
      const i = (yy * w + xx) * 4;
      return px[i] * 0.2126 + px[i + 1] * 0.7152 + px[i + 2] * 0.0722;
    };

    let alphaAny = 0, nearTransparent = 0, hiddenRgb = 0;
    const total = Math.max(1, w * h);
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3];
      if (a < 255) alphaAny++;
      if (a > 0 && a < 40) nearTransparent++;
      if (a <= 8 && (px[i] + px[i + 1] + px[i + 2]) > 45) hiddenRgb++;
    }
    const alphaRate = alphaAny / total;
    const nearAlphaRate = nearTransparent / total;
    const hiddenRgbRate = hiddenRgb / total;

    const rs = [], gs = [], bs = [], resL = [];
    const step = Math.max(2, Math.round(Math.max(w, h) / 520));
    for (let y = 1; y < h - 1; y += step) {
      for (let x = 1; x < w - 1; x += step) {
        const i = (y * w + x) * 4, il = (y * w + x - 1) * 4, ir = (y * w + x + 1) * 4;
        const iu = ((y - 1) * w + x) * 4, id = ((y + 1) * w + x) * 4;
        const rr = 4 * px[i] - px[il] - px[ir] - px[iu] - px[id];
        const gg = 4 * px[i + 1] - px[il + 1] - px[ir + 1] - px[iu + 1] - px[id + 1];
        const bb = 4 * px[i + 2] - px[il + 2] - px[ir + 2] - px[iu + 2] - px[id + 2];
        rs.push(rr); gs.push(gg); bs.push(bb); resL.push(0.2126 * rr + 0.7152 * gg + 0.0722 * bb);
      }
    }
    const noiseSd = sd(resL);
    const noiseCorr = (Math.abs(corr(rs, gs)) + Math.abs(corr(gs, bs)) + Math.abs(corr(rs, bs))) / 3;

    const lags = [4, 8, 16, 32].filter((v) => v < w / 3 && v < h / 3);
    let periodicBest = { lag: 0, score: 0 };
    for (const lag of lags) {
      const a = [], b = [];
      for (let y = 1; y < h - 1; y += step * 2) {
        for (let x = 1; x < w - lag - 1; x += step * 2) {
          a.push(lum(x, y) - lum(x - 1, y));
          b.push(lum(x + lag, y) - lum(x + lag - 1, y));
        }
      }
      const score = Math.abs(corr(a, b));
      if (score > periodicBest.score) periodicBest = { lag, score };
    }

    const cols = 18;
    const rows = Math.max(8, Math.min(30, Math.round(cols * h / Math.max(1, w))));
    const bw = Math.ceil(w / cols), bh = Math.ceil(h / rows), blocks = [];
    for (let by = 0; by < rows; by++) {
      for (let bx = 0; bx < cols; bx++) {
        const vals = [];
        let edges = 0, diffs = 0, residual = 0, n = 0;
        for (let y = Math.max(1, by * bh); y < Math.min(h - 1, (by + 1) * bh); y += 2) {
          for (let x = Math.max(1, bx * bw); x < Math.min(w - 1, (bx + 1) * bw); x += 2) {
            const l = lum(x, y), r = lum(x + 1, y), d = lum(x, y + 1);
            const lap = Math.abs(4 * l - lum(x - 1, y) - lum(x + 1, y) - lum(x, y - 1) - lum(x, y + 1));
            vals.push(l);
            const diff = Math.abs(l - r) + Math.abs(l - d);
            diffs += diff; if (diff > 58) edges++; residual += lap; n++;
          }
        }
        const m = mean(vals), texture = clamp(sd(vals) / 78), edgeRate = edges / Math.max(1, n);
        const diffRate = diffs / Math.max(1, n) / 160, residualRate = clamp((residual / Math.max(1, n)) / 85);
        const smoothEdge = (1 - texture) * clamp(edgeRate * 3.1);
        const raw = 0.23 * (1 - Math.abs(texture - 0.38)) + 0.24 * clamp(edgeRate * 2.8) + 0.20 * clamp(diffRate) + 0.21 * residualRate + 0.12 * smoothEdge;
        blocks.push({ bx, by, raw });
      }
    }
    const raws = blocks.map((b) => b.raw), rmin = Math.min(...raws), rmax = Math.max(...raws);
    blocks.forEach((b) => { b.local = (b.raw - rmin) / Math.max(0.0001, rmax - rmin); });
    const localTop = blocks.slice().sort((a, b) => b.local - a.local).slice(0, Math.max(5, Math.round(blocks.length * 0.08)));
    const localStrength = mean(localTop.map((x) => x.local));

    ctx.drawImage(img, 0, 0, w, h);
    for (const b of blocks) {
      if (b.local < 0.66) continue;
      ctx.fillStyle = `rgba(255,68,38,${Math.min(0.30, 0.06 + (b.local - 0.66) * 0.55)})`;
      ctx.fillRect(b.bx * bw, b.by * bh, bw, bh);
    }
    const picked = [];
    for (const b of blocks.slice().sort((a, b) => b.local - a.local)) {
      if (b.local < 0.61) break;
      if (picked.some((p) => Math.abs(p.bx - b.bx) <= 1 && Math.abs(p.by - b.by) <= 1)) continue;
      picked.push(b); if (picked.length >= 5) break;
    }
    ctx.lineWidth = Math.max(2, Math.round(Math.min(w, h) / 240));
    ctx.font = `900 ${Math.max(13, Math.round(Math.min(w, h) / 28))}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    picked.forEach((b, idx) => {
      const x = b.bx * bw, y = b.by * bh, ww = Math.min(bw, w - x), hh = Math.min(bh, h - y);
      ctx.strokeStyle = 'rgba(255,245,238,.98)'; ctx.strokeRect(x + 1, y + 1, Math.max(1, ww - 2), Math.max(1, hh - 2));
      ctx.strokeStyle = 'rgba(180,35,24,.98)'; ctx.strokeRect(x + 3, y + 3, Math.max(1, ww - 6), Math.max(1, hh - 6));
      const r = Math.max(11, Math.min(18, Math.min(bw, bh) * 0.26)), cx = x + r + 5, cy = y + r + 5;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(180,35,24,.95)'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(String(idx + 1), cx, cy + 1);
    });

    return { w, h, alphaRate, nearAlphaRate, hiddenRgbRate, noiseSd, noiseCorr, periodicBest, localStrength, picked };
  }

  function renderMetadata(exif, binary) {
    setText('metaSdkStatus', exif.ok ? 'ExifReader 4.42.0 · 로컬 파일 해석 완료' : `ExifReader 사용 불가 · ${exif.error || '오류'}`);
    setText('metaCount', exif.ok ? `${exif.tagCount}개 태그` : '구조화 태그 없음');
    setText('metaCamera', exif.ok && exif.camera ? exif.camera : '없음');
    setText('metaSoftware', exif.ok && exif.software ? exif.software : '없음');
    setText('metaDate', exif.ok && exif.date ? exif.date : '없음');
    setText('metaAuthor', exif.ok && exif.author ? exif.author : '없음');
    setText('metaGps', exif.ok ? (exif.gpsPresent ? 'GPS 관련 태그 있음 · 좌표는 화면에 표시하지 않음' : '없음') : '—');
    setText('metaContainers', `EXIF ${binary.meta.exif ? 'Y' : 'N'} · XMP ${binary.meta.xmp ? 'Y' : 'N'} · IPTC ${binary.meta.iptc ? 'Y' : 'N'} · ICC ${binary.meta.icc ? 'Y' : 'N'}`);
  }

  function renderC2pa(c2pa, binary) {
    if (c2pa.ok && c2pa.present) {
      const state = c2pa.validationState || '상태 정보 없음';
      setText('c2paSdkStatus', `공식 c2pa-web ${C2PA_VERSION} · manifest 읽음`);
      setText('c2paValidation', `${state} · 성공 ${c2pa.successes} · 실패 ${c2pa.failures}`);
      setText('c2paSource', c2pa.sourceTypes.length ? c2pa.sourceTypes.join(' | ') : 'digitalSourceType 없음');
      setText('c2paSigner', c2pa.signer || '서명자 정보 없음');
      setText('c2paClaim', c2pa.title || c2pa.activeManifest || 'active manifest 있음');
      setText('sigC2PA', `공식 manifest 확인 · validation ${state}`);
      return;
    }
    if (c2pa.ok && !c2pa.present) {
      setText('c2paSdkStatus', `공식 c2pa-web ${C2PA_VERSION} · manifest 없음`);
      setText('c2paValidation', '검증할 active manifest 없음');
      setText('c2paSource', '없음'); setText('c2paSigner', '없음'); setText('c2paClaim', '없음');
      setText('sigC2PA', binary.c2paHits.length ? '구조 문자열은 있으나 공식 active manifest는 확인되지 않음' : '공식 active manifest 없음');
      return;
    }
    setText('c2paSdkStatus', `공식 SDK 검사 실패 · ${c2pa.error || '알 수 없는 오류'}`);
    setText('c2paValidation', '검사 실패'); setText('c2paSource', '—'); setText('c2paSigner', '—'); setText('c2paClaim', '—');
    setText('sigC2PA', binary.c2paHits.length ? 'C2PA 관련 구조 문자열 발견 · 공식 SDK 검사는 실패' : '관련 구조 문자열 없음 · 공식 SDK 검사는 실패');
  }

  function addEvidence(container, cls, title, body) {
    const row = document.createElement('div');
    row.className = `evidenceRow ${cls || ''}`.trim();
    const b = document.createElement('b'); b.textContent = title;
    row.appendChild(b); row.appendChild(document.createElement('br'));
    row.appendChild(document.createTextNode(body));
    container.appendChild(row);
  }

  function renderResults(file, img, binary, exif, c2pa, visual) {
    const sourceTypes = c2pa.ok && c2pa.present ? c2pa.sourceTypes : [];
    const c2paAi = sourceTypes.some((s) => s.includes(AI_SOURCE_TOKEN));
    const c2paCamera = sourceTypes.some((s) => s.includes(CAMERA_SOURCE_TOKEN));
    const generatorHits = uniq([...binary.generatorHits, ...(exif.ok ? exif.generatorHits : []), ...(c2pa.ok && c2pa.present ? c2pa.generatorInfo : [])]);
    const promptHits = uniq([...binary.promptHits, ...(exif.ok ? exif.promptHits : [])]);
    const alphaSusp = clamp(visual.nearAlphaRate * 80 + visual.hiddenRgbRate * 120);
    const noiseSignal = clamp((visual.noiseCorr - 0.38) / 0.42);
    const periodicSignal = clamp((visual.periodicBest.score - 0.12) / 0.38);
    const localSignal = clamp((visual.localStrength - 0.72) / 0.28);

    let score = 5;
    if (c2paAi) score += 45;
    if (generatorHits.length) score += 28;
    if (promptHits.length) score += 14;
    score += alphaSusp * 5 + noiseSignal * 5 + periodicSignal * 6 + localSignal * 5;
    if (c2paCamera && !c2paAi && !generatorHits.length && !promptHits.length) score -= 12;
    score = Math.round(Math.max(2, Math.min(98, score)));

    q('#sourceImage').src = currentObjectUrl;
    q('#imageResults').classList.remove('hidden');
    setText('imageMeta', `${img.naturalWidth}×${img.naturalHeight} · ${(file.size / 1024 / 1024).toFixed(2)}MB · ${binary.format}`);
    setText('imageScoreNum', score);
    q('#imageProgress').style.width = score + '%';
    setText('sigWatermark', '공급자 전용 비가시 워터마크는 직접 인증하지 않음');
    setText('sigGenerator', generatorHits.length ? generatorHits.join(', ').slice(0, 360) : '명시적 생성 도구 정보 없음');
    setText('sigPrompt', promptHits.length ? `${promptHits.length}개 관련 항목` : '없음');
    setText('sigAlpha', visual.alphaRate ? `투명 ${(visual.alphaRate * 100).toFixed(2)}% · 저알파 ${(visual.nearAlphaRate * 100).toFixed(2)}%` : '없음');
    setText('sigNoise', `잔차 σ ${visual.noiseSd.toFixed(1)} · RGB 상관 ${visual.noiseCorr.toFixed(2)}`);
    setText('sigPeriodic', visual.periodicBest.lag ? `${visual.periodicBest.lag}px · 상관 ${visual.periodicBest.score.toFixed(2)}` : '두드러진 주기 없음');
    setText('sigLocal', `상위 국소지수 ${Math.round(visual.localStrength * 100)} · 표시 ${visual.picked.length}곳`);
    setText('sigFile', `${binary.format} · EXIF ${binary.meta.exif ? 'Y' : 'N'} · XMP ${binary.meta.xmp ? 'Y' : 'N'} · ICC ${binary.meta.icc ? 'Y' : 'N'}`);

    q('#regionLegend').textContent = '';
    if (visual.picked.length) {
      visual.picked.forEach((b, i) => {
        const span = document.createElement('span'); span.className = 'regionChip';
        const strong = document.createElement('b'); strong.textContent = `${i + 1}번`;
        span.appendChild(strong); span.appendChild(document.createTextNode(` ${Math.round(b.local * 100)}`));
        q('#regionLegend').appendChild(span);
      });
    } else {
      const span = document.createElement('span'); span.className = 'sub'; span.textContent = '두드러진 국소 구간 없음'; q('#regionLegend').appendChild(span);
    }

    renderMetadata(exif, binary);
    renderC2pa(c2pa, binary);
    const evidence = q('#evidenceList'); evidence.textContent = '';
    if (c2paAi) addEvidence(evidence, 'strong', 'C2PA digitalSourceType', '공식 manifest에서 trainedAlgorithmicMedia 계열 출처가 확인되었습니다.');
    else if (c2paCamera) addEvidence(evidence, 'ok', 'C2PA digitalCapture', '공식 manifest에서 디지털 카메라 캡처 출처 유형이 확인되었습니다.');
    else if (c2pa.ok && c2pa.present) addEvidence(evidence, '', 'C2PA manifest', `공식 manifest가 있으며 validation 상태는 ${c2pa.validationState || '미표시'}입니다.`);
    if (generatorHits.length) addEvidence(evidence, 'strong', '생성 도구 메타데이터', generatorHits.join(', ').slice(0, 420));
    if (promptHits.length) addEvidence(evidence, 'strong', '프롬프트/워크플로 메타데이터', `${promptHits.length}개 관련 항목이 발견되었습니다.`);
    if (exif.ok && exif.gpsPresent) addEvidence(evidence, 'warn', '위치 메타데이터 주의', 'GPS 관련 태그가 있습니다. 이 도구는 좌표 값을 화면에 표시하지 않습니다.');
    if (!evidence.children.length) addEvidence(evidence, 'ok', '강한 명시적 출처 신호 미발견', '메타데이터 부재만으로 사람이 만든 이미지라고 단정할 수는 없습니다.');
  }

  window.loadImage = async function loadImageStrong(file) {
    const allowed = /^image\/(png|jpeg|webp)$/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name || '');
    if (!allowed) { alert('PNG, JPG, WebP만 지원합니다.'); return; }
    setText('imageLoadStatus', '파일 읽는 중…');
    try {
      const buffer = await file.arrayBuffer();
      const binary = scanBinary(buffer, file);
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(file);
      const img = new Image();
      const loaded = new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('브라우저에서 이미지를 디코딩하지 못했습니다.'));
      });
      img.src = currentObjectUrl;
      const [image, exif, c2pa] = await Promise.all([
        loaded,
        inspectExif(file),
        inspectC2pa(file)
      ]);
      setText('imageLoadStatus', '픽셀 분석 중…');
      await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      const visual = analyzePixels(image);
      renderResults(file, image, binary, exif, c2pa, visual);
      setText('imageLoadStatus', '완료 · 구조화 메타데이터 + 공식 C2PA + 시각 통계');
    } catch (err) {
      console.error(err);
      setText('imageLoadStatus', `분석 오류 · ${String(err && err.message ? err.message : err)}`);
    }
  };
})();
