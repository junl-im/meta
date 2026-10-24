// src/modules/ambient-music.ts
var e = "moonlit-bgm-enabled", t = [
	293.66,
	349.23,
	440,
	523.25,
	587.33,
	698.46,
	880
], n = [
	0,
	2,
	3,
	2,
	4,
	3,
	2,
	-1,
	0,
	2,
	5,
	4,
	3,
	2,
	1,
	-1,
	0,
	2,
	3,
	5,
	4,
	3,
	2,
	-1
], r = 60 / 74;
function i(i) {
	let a = null, o = null, s = !1, c, l = 0, u = 0, d = () => {
		i.setAttribute("aria-pressed", String(s)), i.setAttribute("aria-label", s ? "신비로운 배경음 끄기" : "신비로운 배경음 켜기"), i.title = s ? "배경음 끄기" : "배경음 켜기", i.classList.toggle("enabled", s);
		let e = i.querySelector(".sound-state");
		e && (e.textContent = s ? "ON" : "OFF");
	};
	function f(e, t, n, r, i) {
		if (!a || !o) return;
		let s = a.createOscillator(), c = a.createGain(), l = a.createBiquadFilter();
		s.type = i, s.frequency.setValueAtTime(e, t), l.type = "lowpass", l.frequency.value = i === "sine" ? 1850 : 1050, c.gain.setValueAtTime(1e-4, t), c.gain.exponentialRampToValueAtTime(Math.max(2e-4, r), t + Math.min(.24, n / 3)), c.gain.exponentialRampToValueAtTime(1e-4, t + n), s.connect(l).connect(c).connect(o), s.start(t), s.stop(t + n + .03), s.addEventListener("ended", () => {
			s.disconnect(), c.disconnect(), l.disconnect();
		}, { once: !0 });
	}
	function p() {
		if (a && s) for (; u < a.currentTime + 1.8;) {
			let e = l % n.length, i = n[e];
			i !== void 0 && i >= 0 && (f(t[i] ?? 440, u, r * 1.65, .021, "sine"), e % 4 == 0 && f((t[i] ?? 440) * 2, u + r * .48, r * 1.1, .006, "triangle")), e % 8 == 0 && (e < 12 ? [
				146.83,
				220,
				293.66
			] : [
				174.61,
				261.63,
				349.23
			]).forEach((e, t) => f(e, u, r * 7.6, .008 - t * .001, "sine")), l++, u += r;
		}
	}
	async function m() {
		try {
			a || (a = new AudioContext(), o = a.createGain(), o.gain.value = .32, o.connect(a.destination)), await a.resume(), s = !0, u = a.currentTime + .07, l = 0, p(), c = window.setInterval(p, 750);
			try {
				localStorage.setItem(e, "on");
			} catch {}
		} catch {
			s = !1, i.title = "이 브라우저에서는 배경음을 재생할 수 없어요";
		}
		d();
	}
	function h() {
		if (s = !1, c !== void 0 && window.clearInterval(c), c = void 0, o && a && o.gain.setTargetAtTime(1e-4, a.currentTime, .16), a) {
			let e = a;
			window.setTimeout(() => {
				!s && e.state === "running" && e.suspend();
			}, 550);
		}
		try {
			localStorage.setItem(e, "off");
		} catch {}
		d();
	}
	i.addEventListener("click", () => {
		s ? h() : (o && a && o.gain.setValueAtTime(.32, a.currentTime), m());
	}), document.addEventListener("visibilitychange", () => {
		a && s && (document.hidden ? a.suspend() : a.resume().then(() => {
			u = a.currentTime + .05, p();
		}));
	}), window.addEventListener("pagehide", () => {
		s && h();
	}), d();
}
// src/modules/byeolha-bridge.ts
function a(e) {
	let t = !1, n = () => window.SoriOn?.voices?.byeolha, r = () => {
		let r = !!n();
		e.classList.toggle("enabled", t), e.classList.toggle("pending", !r), e.setAttribute("aria-pressed", String(t)), e.setAttribute("aria-label", r ? t ? "별하 읽어주기 끄기" : "별하 읽어주기 켜기" : "별하 성우 연결 준비 중"), e.title = r ? t ? "별하 읽어주기 끄기" : "별하 읽어주기 켜기" : "소리온 별하 성우 제작 중 · 연결 대기";
		let i = e.querySelector(".sound-state");
		i && (i.textContent = r ? t ? "ON" : "OFF" : "준비 중");
	};
	e.addEventListener("click", () => {
		n() && (t = !t, t || n()?.stop?.()), r();
	}), window.DalbitByeolha = {
		read: (e) => {
			if (!t || !n()) return;
			let r = e.trim().slice(0, 1200);
			r && n().speak({
				text: r,
				voice: "byeolha",
				style: "mystical-gentle"
			});
		},
		silence: () => {
			t && n()?.stop?.();
		}
	}, window.addEventListener("sorion:byeolha-ready", r), r();
}
// src/experience.ts
var o = document.querySelector("#musicToggle"), s = document.querySelector("#voiceToggle");
o && i(o), s && a(s);
