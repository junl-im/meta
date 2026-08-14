(() => {
  const status = document.querySelector('#status');
  if (!status) return;
  const protectedPath = 'OPTION/**';
  status.textContent = `마이그레이션 기반 구조 준비 완료 · 보호 경로: ${protectedPath}`;
})();
