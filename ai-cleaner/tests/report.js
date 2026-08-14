(() => {
  'use strict';

  const button = document.getElementById('copyReport');
  if (!button) return;

  function buildReport() {
    const summary = document.getElementById('summary')?.textContent?.trim() || '요약 없음';
    const rows = [...document.querySelectorAll('#tests .test')].map((row) => {
      const name = row.querySelector('.name')?.textContent?.trim() || '항목';
      const detail = row.querySelector('.detail')?.textContent?.trim() || '';
      return detail ? `${name}\n  ${detail.replace(/\n/g, '\n  ')}` : name;
    });
    return [
      'AI Cleaner v6.3 browser regression report',
      `time: ${new Date().toISOString()}`,
      `page: ${location.href}`,
      `browser: ${navigator.userAgent}`,
      `summary: ${summary}`,
      '',
      ...rows
    ].join('\n');
  }

  button.addEventListener('click', async () => {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      const old = button.textContent;
      button.textContent = '복사됨 ✓';
      setTimeout(() => { button.textContent = old; }, 1400);
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      const old = button.textContent;
      button.textContent = '복사됨 ✓';
      setTimeout(() => { button.textContent = old; }, 1400);
    }
  });
})();
