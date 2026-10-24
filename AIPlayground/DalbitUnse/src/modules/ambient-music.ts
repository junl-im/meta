/** 저작권이 없는 자체 합성 달빛 배경음. 외부 음원과 서버 호출 없음. */
const KEY = 'moonlit-bgm-enabled';
const TONE = [293.66, 349.23, 440, 523.25, 587.33, 698.46, 880]; // D minor pentatonic + C
const MELODY = [0, 2, 3, 2, 4, 3, 2, -1, 0, 2, 5, 4, 3, 2, 1, -1, 0, 2, 3, 5, 4, 3, 2, -1];
const BEAT = 60 / 74;

export function mountAmbientMusic(button: HTMLButtonElement): void {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let enabled = false;
  let interval: number | undefined;
  let beatIndex = 0;
  let nextBeat = 0;

  const status = (): void => {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? '신비로운 배경음 끄기' : '신비로운 배경음 켜기');
    button.title = enabled ? '배경음 끄기' : '배경음 켜기';
    button.classList.toggle('enabled', enabled);
    const label = button.querySelector<HTMLElement>('.sound-state');
    if (label) label.textContent = enabled ? 'ON' : 'OFF';
  };

  function tone(frequency: number, start: number, duration: number, volume: number, type: OscillatorType): void {
    if (!context || !master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    filter.type = 'lowpass';
    filter.frequency.value = type === 'sine' ? 1850 : 1050;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.min(0.24, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter).connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
    oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); filter.disconnect(); }, { once: true });
  }

  function schedule(): void {
    if (!context || !enabled) return;
    while (nextBeat < context.currentTime + 1.8) {
      const step = beatIndex % MELODY.length;
      const note = MELODY[step];
      if (note !== undefined && note >= 0) {
        tone(TONE[note] ?? 440, nextBeat, BEAT * 1.65, 0.021, 'sine');
        if (step % 4 === 0) tone((TONE[note] ?? 440) * 2, nextBeat + BEAT * 0.48, BEAT * 1.1, 0.006, 'triangle');
      }
      if (step % 8 === 0) {
        const chord = step < 12 ? [146.83, 220, 293.66] : [174.61, 261.63, 349.23];
        chord.forEach((f, i) => tone(f, nextBeat, BEAT * 7.6, 0.008 - i * 0.001, 'sine'));
      }
      beatIndex++;
      nextBeat += BEAT;
    }
  }

  async function start(): Promise<void> {
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = 0.32;
        master.connect(context.destination);
      }
      await context.resume();
      enabled = true;
      nextBeat = context.currentTime + 0.07;
      beatIndex = 0;
      schedule();
      interval = window.setInterval(schedule, 750);
      try { localStorage.setItem(KEY, 'on'); } catch { /* 방문자 설정 비활성 브라우저 */ }
    } catch {
      enabled = false;
      button.title = '이 브라우저에서는 배경음을 재생할 수 없어요';
    }
    status();
  }

  function stop(): void {
    enabled = false;
    if (interval !== undefined) window.clearInterval(interval);
    interval = undefined;
    if (master && context) master.gain.setTargetAtTime(0.0001, context.currentTime, 0.16);
    if (context) {
      const target = context;
      window.setTimeout(() => { if (!enabled && target.state === 'running') void target.suspend(); }, 550);
    }
    try { localStorage.setItem(KEY, 'off'); } catch { /* 무해한 폴백 */ }
    status();
  }

  button.addEventListener('click', () => {
    if (enabled) { stop(); return; }
    if (master && context) master.gain.setValueAtTime(0.32, context.currentTime);
    void start();
  });
  document.addEventListener('visibilitychange', () => {
    if (!context || !enabled) return;
    if (document.hidden) void context.suspend();
    else void context.resume().then(() => { nextBeat = context!.currentTime + 0.05; schedule(); });
  });
  window.addEventListener('pagehide', () => { if (enabled) stop(); });
  // 자동 재생은 브라우저 정책과 접근성을 위해 시도하지 않습니다.
  status();
}
