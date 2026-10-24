/** 모바일 브라우저 주소창과 키보드로 달라지는 실제 보이는 높이를 추적합니다. */
export function mountViewportFit(): void {
  const root = document.documentElement;
  const header = document.querySelector<HTMLElement>('.site-header');
  const dock = document.querySelector<HTMLElement>('.mobile-dock');
  let pending = false;

  const update = (): void => {
    pending = false;
    const viewport = window.visualViewport;
    const visibleHeight = Math.max(240, Math.round(viewport?.height ?? window.innerHeight));

    const focused = document.activeElement;
    const isEditing = focused instanceof Element && Boolean(focused.closest('input, textarea, select, [contenteditable="true"]'));
    const keyboardVisible = Boolean(isEditing && viewport && window.innerHeight - viewport.height > 120);
    root.classList.toggle('keyboard-open', keyboardVisible);

    // 주소창, 하단 제스처 영역, 열린 모바일 메뉴까지 실제 표시 크기로 계산.
    // 기존의 58px/67px 고정 감산은 브라우저마다 하단이 잘리는 원인이었습니다.
    const headerHeight = Math.ceil(header?.getBoundingClientRect().height ?? 0);
    const dockVisible = dock && getComputedStyle(dock).display !== 'none';
    const dockHeight = dockVisible ? Math.ceil(dock.getBoundingClientRect().height) : 0;
    root.style.setProperty('--live-vh', `${visibleHeight}px`);
    root.style.setProperty('--header-h', `${headerHeight}px`);
    root.style.setProperty('--dock-h', `${dockHeight}px`);
  };

  const request = (): void => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener('resize', request, { passive: true });
  window.addEventListener('orientationchange', request, { passive: true });
  window.visualViewport?.addEventListener('resize', request, { passive: true });
  window.visualViewport?.addEventListener('scroll', request, { passive: true });
  document.addEventListener('focusin', request);
  document.addEventListener('focusout', request);
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(request);
    if (header) observer.observe(header);
    if (dock) observer.observe(dock);
  }
}
