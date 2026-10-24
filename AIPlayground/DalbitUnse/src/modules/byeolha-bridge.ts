/** 달빛운세 낭독 브리지. 별하 엔진 우선, 미연결 시 브라우저 한국어 여성 음성 우선. */
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

const supportsNativeSpeech = (): boolean => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** 음성에 성별 표준 메타데이터가 없어 한국어 목소리의 알려진 명칭을 우선합니다. */
function preferredKoreanVoice(): SpeechSynthesisVoice | undefined {
  if (!supportsNativeSpeech()) return undefined;
  const voices = window.speechSynthesis.getVoices().filter(v => /^ko(?:[-_]|$)/i.test(v.lang));
  const preferred = /여성|female|woman|heami|sunhi|sora|yuna|유나|서현|선희|지혜|지연|하나|혜미/i;
  return voices.find(v => preferred.test(v.name)) ?? voices.find(v => v.default) ?? voices[0];
}

export function mountByeolhaBridge(button: HTMLButtonElement): void {
  let enabled = false; // 낭독은 항상 기본 끔.
  let readingEpoch = 0;
  let active = false;
  let activeUtterance: SpeechSynthesisUtterance | null = null;
  const engine = (): ByeolhaVoice | undefined => window.SoriOn?.voices?.byeolha;
  const soundEnd = (): void => { if (!active) return; active = false; window.dispatchEvent(new Event('dalbit:voice-end')); };
  const cancel = (): void => {
    readingEpoch += 1;
    if (supportsNativeSpeech()) {
      try { window.speechSynthesis.cancel(); } catch { /* 미지원 환경 */ }
    }
    activeUtterance = null;
    soundEnd();
    try { void Promise.resolve(engine()?.stop?.()).catch(() => undefined); } catch { /* 음성 공급자 오류 격리 */ }
  };
  const update = (): void => {
    const hasByeolha = !!engine();
    const hasLocal = supportsNativeSpeech();
    const ready = hasByeolha || hasLocal;
    button.classList.toggle('enabled', enabled);
    button.classList.toggle('pending', !ready);
    button.dataset.voice = enabled ? 'on' : 'off';
    button.dataset.engine = hasByeolha ? 'byeolha' : hasLocal ? 'browser' : 'none';
    button.setAttribute('aria-pressed', String(enabled));
    const modeName = hasByeolha ? '소리온 별하' : hasLocal ? '임시 한국어 음성' : '음성 기능';
    button.setAttribute('aria-label', enabled ? `${modeName} 결과 낭독 켜짐, 끄기` : `${modeName} 결과 낭독 꺼짐, 켜기`);
    button.title = !ready ? '이 브라우저에서는 음성 낭독을 지원하지 않아요' : enabled ? `결과가 나올 때 ${modeName}으로 읽습니다 · 끄려면 누르세요` : `결과 읽어주기 끔 · 누르면 ${modeName} 사용`;
    const label = button.querySelector<HTMLElement>('.sound-state');
    if (label) label.textContent = enabled ? ready ? 'ON' : '대기' : 'OFF';
    const modeLabel = button.querySelector<HTMLElement>('.sound-title');
    if (modeLabel) modeLabel.textContent = hasByeolha ? '별하 낭독' : '음성 낭독';
  };

  button.addEventListener('click', () => {
    enabled = !enabled;
    if (!enabled) cancel();
    else if (supportsNativeSpeech()) preferredKoreanVoice(); // 클릭 시 브라우저 음성 목록 준비.
    update();
  });

  window.DalbitByeolha = {
    read: text => {
      if (!enabled) return;
      const message = String(text).replace(/\s+/g, ' ').trim().slice(0, 8000);
      if (!message) return;
      cancel(); // 연이어 새 결과가 나오면 이전 결과의 낭독을 중단.
      const current = readingEpoch;
      const liveEngine = engine();
      if (liveEngine) {
        void (async () => {
          try {
            await liveEngine.stop?.();
            if (!enabled || readingEpoch !== current) return;
            active = true;
            window.dispatchEvent(new Event('dalbit:voice-start'));
            await liveEngine.speak({ text: message, voice: 'byeolha', style: 'mystical-gentle' });
          } catch { /* 소리온 오류는 결과를 방해하지 않음. */ }
          finally { if (readingEpoch === current) soundEnd(); }
        })();
        return;
      }
      if (!supportsNativeSpeech()) { update(); return; }
      try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'ko-KR';
        utterance.rate = 0.89;
        utterance.pitch = 1.07;
        utterance.volume = 0.93;
        const voice = preferredKoreanVoice();
        if (voice) utterance.voice = voice;
        utterance.onstart = () => {
          if (!enabled || current !== readingEpoch) return;
          active = true;
          window.dispatchEvent(new Event('dalbit:voice-start'));
        };
        utterance.onend = () => { if (current === readingEpoch) soundEnd(); };
        utterance.onerror = () => { if (current === readingEpoch) soundEnd(); };
        activeUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch { soundEnd(); }
    },
    silence: cancel
  };

  if (supportsNativeSpeech()) window.speechSynthesis.addEventListener('voiceschanged', update);
  window.addEventListener('sorion:byeolha-ready', () => { cancel(); update(); });
  window.addEventListener('pagehide', cancel);
  update();
}
