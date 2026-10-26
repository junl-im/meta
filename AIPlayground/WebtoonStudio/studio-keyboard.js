// Desktop shortcuts for the isolated Webtoon Studio web shell.
document.addEventListener('keydown', event => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  const target = event.target;
  const editing = target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select, [contenteditable]'));
  if (editing && key !== 's') return;
  const app = document.querySelector('.web-app');
  if (!app) return;
  let label;
  if (key === 's') label = '.wtoon 저장';
  else if (key === 'o') label = '.wtoon 열기';
  else if (key === 'z') label = event.shiftKey ? '↷ 다시' : '↶ 되돌리기';
  else if (key === 'y') label = '↷ 다시';
  else return;
  const button = [...app.querySelectorAll('button')].find(item => item.textContent.trim() === label);
  if (!button || button.disabled) return;
  event.preventDefault();
  button.click();
});
