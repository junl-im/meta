/** 소리온의 '별하'만 연결하는 계약입니다. 다른 TTS로 자동 대체하지 않습니다. */
interface ByeolhaVoice {
  speak(options: { text: string; voice: 'byeolha'; style: 'mystical-gentle' }): Promise<void> | void;
  stop?(): Promise<void> | void;
}

declare global {
  interface Window {
    SoriOn?: { voices?: { byeolha?: ByeolhaVoice } };
    DalbitByeolha?: { read: (text: string) => void; silence: () => void };
  }
}

export function mountByeolhaBridge(button: HTMLButtonElement): void {
  let enabled = false;
  const voice = (): ByeolhaVoice | undefined => window.SoriOn?.voices?.byeolha;
  const update = (): void => {
    const ready = !!voice();
    button.classList.toggle('enabled', enabled);
    button.classList.toggle('pending', !ready);
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', ready ? (enabled ? '별하 읽어주기 끄기' : '별하 읽어주기 켜기') : '별하 성우 연결 준비 중');
    button.title = ready ? (enabled ? '별하 읽어주기 끄기' : '별하 읽어주기 켜기') : '소리온 별하 성우 제작 중 · 연결 대기';
    const label = button.querySelector<HTMLElement>('.sound-state');
    if (label) label.textContent = ready ? (enabled ? 'ON' : 'OFF') : '준비 중';
  };
  button.addEventListener('click', () => {
    if (!voice()) { update(); return; }
    enabled = !enabled;
    if (!enabled) void voice()?.stop?.();
    update();
  });
  window.DalbitByeolha = {
    read: text => {
      if (!enabled || !voice()) return;
      const snippet = text.trim().slice(0, 1200);
      if (snippet) void voice()!.speak({ text: snippet, voice: 'byeolha', style: 'mystical-gentle' });
    },
    silence: () => { if (enabled) void voice()?.stop?.(); }
  };
  window.addEventListener('sorion:byeolha-ready', update);
  update();
}
