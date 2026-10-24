/** 입력 가능한 영역은 정상 편집하며, 그 밖의 우클릭·드래그를 막습니다. */
export function mountInteractionGuard(): void {
  const isEditable = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]), [contenteditable="true"], [role="textbox"]'));
  };

  for (const eventType of ['contextmenu', 'dragstart', 'selectstart'] as const) {
    document.addEventListener(eventType, (event) => {
      if (!isEditable(event.target)) event.preventDefault();
    }, { capture: true });
  }
}
