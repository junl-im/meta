/** 저작권이 없는 자체 합성 달빛 배경음. 외부 음원과 서버 호출 없음. */
const KEY = 'moonlit-bgm-enabled';
const TONE = [293.66, 349.23, 440, 523.25, 587.33, 698.46, 880]; // D minor pentatonic + C
const MELODY = [0, 2, 3, 2, 4, 3, 2, -1, 0, 2, 5, 4, 3, 2, 1, -1, 0, 2, 3, 5, 4, 3, 2, -1];
const BEAT = 60 / 74;

export function mountAmbientMusic(button: HTMLButtonElement): void {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  // 첫 방문은 켜짐이 기본입니다. 브라우저가 자동재생을 막을 때는 첫 터치를 기다립니다.
  let enabled = true;
  try { enabled = localStorage.getItem(KEY) !== 'off'; } catch { /* 저장 불가 환경에서도 기본 켬 */ }
  let playing = false;
  let starting = false;
  let interval: number | undefined;
  let beatIndex = 0;
  let nextBeat = 0;
  let narrationActive = false;
  const musicLevel = (): number => narrationActive ? 0.065 : 0.32;

  const status = (): void => {
    button.setAttribute('aria-pressed', String(enabled));
    const waiting = enabled && !playing;
    button.setAttribute('aria-label', !enabled ? '배경음 꺼짐, 켜기' : waiting ? '배경음 켜짐, 첫 화면 터치 후 재생됩니다. 끄기' : '배경음 켜짐, 끄기');
    button.title = !enabled ? '배경음 꺼짐 · 눌러서 켜기' : waiting ? '배경음 켜짐 · 화면을 터치하면 재생돼요' : '배경음 재생 중 · 눌러서 끄기';
    button.classList.toggle('enabled', enabled);
    button.classList.toggle('waiting', waiting);
    button.classList.toggle('playing', enabled && playing);
    button.dataset.sound = enabled ? 'on' : 'off';
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
    if (!context || !enabled || !playing) return;
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
    if (!enabled || playing || starting) return;
    starting = true;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.gain.value = musicLevel();
        master.connect(context.destination);
      }
      await context.resume();
      if (!enabled) { await context.suspend(); return; }
      playing = context.state === 'running';
      if (!playing) return;
      if (master) master.gain.setValueAtTime(musicLevel(), context.currentTime);
      nextBeat = context.currentTime + 0.07;
      beatIndex = 0;
      schedule();
      if (interval !== undefined) window.clearInterval(interval);
      interval = window.setInterval(schedule, 750);
    } catch {
      playing = false;
    } finally {
      starting = false;
      status();
    }
  }

  function stop(): void {
    enabled = false;
    playing = false;
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

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (enabled) { stop(); return; }
    enabled = true;
    try { localStorage.setItem(KEY, 'on'); } catch { /* 저장 불가 환경 */ }
    status();
    void start();
  });
  // 소리가 '기본 켜짐'이어도 사용자의 실제 제스처 없이 재생을 강제할 수 없습니다.
  // 첫 탭·클릭·키 입력에서 대기 중이던 음악을 자연스럽게 시작합니다.
  const unlock = (event: Event): void => {
    if (event.target instanceof Element && event.target.closest('#musicToggle')) return;
    if (enabled && !playing) void start();
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  // 낭독이 시작되면 배경음을 자동으로 낮추고 종료 후 원래 수준으로 복원.
  const updateNarrationMix = (isNarrating: boolean): void => {
    narrationActive = isNarrating;
    if (master && context && context.state === 'running') master.gain.setTargetAtTime(musicLevel(), context.currentTime, 0.14);
  };
  window.addEventListener('dalbit:voice-start', () => updateNarrationMix(true));
  window.addEventListener('dalbit:voice-end', () => updateNarrationMix(false));
  document.addEventListener('visibilitychange', () => {
    if (!context || !enabled) return;
    if (document.hidden) { playing = false; void context.suspend(); status(); }
    else { void context.resume().then(() => { if (!enabled || !context || context.state !== 'running') return; playing = true; nextBeat = context.currentTime + 0.05; schedule(); status(); }).catch(() => { playing = false; status(); }); }
  });
  window.addEventListener('pagehide', () => { if (interval !== undefined) window.clearInterval(interval); interval = undefined; if (context) void context.suspend(); playing = false; });
  // AudioContext.resume()을 제스처 전에 요청하면 일부 모바일에서 보류 상태로 남습니다.
  status();
}
