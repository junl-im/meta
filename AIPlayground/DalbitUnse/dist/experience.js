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
	let a = null, o = null, s = !0;
	try {
		s = localStorage.getItem(e) !== "off";
	} catch {}
	let c = !1, l = !1, u, d = 0, f = 0, p = !1, m = () => p ? .065 : .32, h = () => {
		i.setAttribute("aria-pressed", String(s));
		let e = s && !c;
		i.setAttribute("aria-label", s ? e ? "배경음 켜짐, 첫 화면 터치 후 재생됩니다. 끄기" : "배경음 켜짐, 끄기" : "배경음 꺼짐, 켜기"), i.title = s ? e ? "배경음 켜짐 · 화면을 터치하면 재생돼요" : "배경음 재생 중 · 눌러서 끄기" : "배경음 꺼짐 · 눌러서 켜기", i.classList.toggle("enabled", s), i.classList.toggle("waiting", e), i.classList.toggle("playing", s && c), i.dataset.sound = s ? "on" : "off";
		let t = i.querySelector(".sound-state");
		t && (t.textContent = s ? "ON" : "OFF");
	};
	function g(e, t, n, r, i) {
		if (!a || !o) return;
		let s = a.createOscillator(), c = a.createGain(), l = a.createBiquadFilter();
		s.type = i, s.frequency.setValueAtTime(e, t), l.type = "lowpass", l.frequency.value = i === "sine" ? 1850 : 1050, c.gain.setValueAtTime(1e-4, t), c.gain.exponentialRampToValueAtTime(Math.max(2e-4, r), t + Math.min(.24, n / 3)), c.gain.exponentialRampToValueAtTime(1e-4, t + n), s.connect(l).connect(c).connect(o), s.start(t), s.stop(t + n + .03), s.addEventListener("ended", () => {
			s.disconnect(), c.disconnect(), l.disconnect();
		}, { once: !0 });
	}
	function _() {
		if (a && s && c) for (; f < a.currentTime + 1.8;) {
			let e = d % n.length, i = n[e];
			i !== void 0 && i >= 0 && (g(t[i] ?? 440, f, r * 1.65, .021, "sine"), e % 4 == 0 && g((t[i] ?? 440) * 2, f + r * .48, r * 1.1, .006, "triangle")), e % 8 == 0 && (e < 12 ? [
				146.83,
				220,
				293.66
			] : [
				174.61,
				261.63,
				349.23
			]).forEach((e, t) => g(e, f, r * 7.6, .008 - t * .001, "sine")), d++, f += r;
		}
	}
	async function v() {
		if (!(!s || c || l)) {
			l = !0;
			try {
				if (a || (a = new AudioContext(), o = a.createGain(), o.gain.value = m(), o.connect(a.destination)), await a.resume(), !s) {
					await a.suspend();
					return;
				}
				if (c = a.state === "running", !c) return;
				o && o.gain.setValueAtTime(m(), a.currentTime), f = a.currentTime + .07, d = 0, _(), u !== void 0 && window.clearInterval(u), u = window.setInterval(_, 750);
			} catch {
				c = !1;
			} finally {
				l = !1, h();
			}
		}
	}
	function y() {
		if (s = !1, c = !1, u !== void 0 && window.clearInterval(u), u = void 0, o && a && o.gain.setTargetAtTime(1e-4, a.currentTime, .16), a) {
			let e = a;
			window.setTimeout(() => {
				!s && e.state === "running" && e.suspend();
			}, 550);
		}
		try {
			localStorage.setItem(e, "off");
		} catch {}
		h();
	}
	i.addEventListener("click", (t) => {
		if (t.stopPropagation(), s) y();
		else {
			s = !0;
			try {
				localStorage.setItem(e, "on");
			} catch {}
			h(), v();
		}
	});
	let b = (e) => {
		e.target instanceof Element && e.target.closest("#musicToggle") || s && !c && v();
	};
	document.addEventListener("pointerdown", b, { passive: !0 }), document.addEventListener("keydown", b);
	let x = (e) => {
		p = e, o && a && a.state === "running" && o.gain.setTargetAtTime(m(), a.currentTime, .14);
	};
	window.addEventListener("dalbit:voice-start", () => x(!0)), window.addEventListener("dalbit:voice-end", () => x(!1)), document.addEventListener("visibilitychange", () => {
		a && s && (document.hidden ? (c = !1, a.suspend(), h()) : a.resume().then(() => {
			s && a && a.state === "running" && (c = !0, f = a.currentTime + .05, _(), h());
		}).catch(() => {
			c = !1, h();
		}));
	}), window.addEventListener("pagehide", () => {
		u !== void 0 && window.clearInterval(u), u = void 0, a && a.suspend(), c = !1;
	}), h();
}
// src/modules/byeolha-bridge.ts
var a = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
function o() {
	if (!a()) return;
	let e = window.speechSynthesis.getVoices().filter((e) => /^ko(?:[-_]|$)/i.test(e.lang)), t = /여성|female|woman|heami|sunhi|sora|yuna|유나|서현|선희|지혜|지연|하나|혜미/i;
	return e.find((e) => t.test(e.name)) ?? e.find((e) => e.default) ?? e[0];
}
function s(e) {
	let t = !1, n = 0, r = !1, i = () => window.SoriOn?.voices?.byeolha, s = () => {
		r && (r = !1, window.dispatchEvent(new Event("dalbit:voice-end")));
	}, c = () => {
		if (n += 1, a()) try {
			window.speechSynthesis.cancel();
		} catch {}
		s();
		try {
			Promise.resolve(i()?.stop?.()).catch(() => void 0);
		} catch {}
	}, l = () => {
		let n = !!i(), r = a(), o = n || r;
		e.classList.toggle("enabled", t), e.classList.toggle("pending", !o), e.dataset.voice = t ? "on" : "off", e.dataset.engine = n ? "byeolha" : r ? "browser" : "none", e.setAttribute("aria-pressed", String(t));
		let s = n ? "소리온 별하" : r ? "임시 한국어 음성" : "음성 기능";
		e.setAttribute("aria-label", t ? `${s} 결과 낭독 켜짐, 끄기` : `${s} 결과 낭독 꺼짐, 켜기`), e.title = o ? t ? `결과가 나올 때 ${s}으로 읽습니다 · 끄려면 누르세요` : `결과 읽어주기 끔 · 누르면 ${s} 사용` : "이 브라우저에서는 음성 낭독을 지원하지 않아요";
		let c = e.querySelector(".sound-state");
		c && (c.textContent = t ? o ? "ON" : "대기" : "OFF");
		let l = e.querySelector(".sound-title");
		l && (l.textContent = n ? "별하 낭독" : "음성 낭독");
	};
	e.addEventListener("click", () => {
		t = !t, t ? a() && o() : c(), l();
	}), window.DalbitByeolha = {
		read: (e) => {
			if (!t) return;
			let u = String(e).replace(/\s+/g, " ").trim().slice(0, 8e3);
			if (!u) return;
			c();
			let d = n, f = i();
			if (f) (async () => {
				try {
					if (await f.stop?.(), !t || n !== d) return;
					r = !0, window.dispatchEvent(new Event("dalbit:voice-start")), await f.speak({
						text: u,
						voice: "byeolha",
						style: "mystical-gentle"
					});
				} catch {} finally {
					n === d && s();
				}
			})();
			else if (!a()) l();
			else try {
				let e = new SpeechSynthesisUtterance(u);
				e.lang = "ko-KR", e.rate = .89, e.pitch = 1.07, e.volume = .93;
				let i = o();
				i && (e.voice = i), e.onstart = () => {
					t && d === n && (r = !0, window.dispatchEvent(new Event("dalbit:voice-start")));
				}, e.onend = () => {
					d === n && s();
				}, e.onerror = () => {
					d === n && s();
				}, window.speechSynthesis.speak(e);
			} catch {
				s();
			}
		},
		silence: c
	}, a() && window.speechSynthesis.addEventListener("voiceschanged", l), window.addEventListener("sorion:byeolha-ready", () => {
		c(), l();
	}), window.addEventListener("pagehide", c), l();
}
// src/modules/viewport-fit.ts
function c() {
	let e = document.documentElement, t = document.querySelector(".site-header"), n = document.querySelector(".mobile-dock"), r = !1, i = () => {
		r = !1;
		let i = window.visualViewport, a = Math.max(240, Math.round(i?.height ?? window.innerHeight)), o = document.activeElement, s = !!(o instanceof Element && o.closest("input, textarea, select, [contenteditable=\"true\"]") && i && window.innerHeight - i.height > 120);
		e.classList.toggle("keyboard-open", s);
		let c = Math.ceil(t?.getBoundingClientRect().height ?? 0), l = n && getComputedStyle(n).display !== "none" ? Math.ceil(n.getBoundingClientRect().height) : 0;
		e.style.setProperty("--live-vh", `${a}px`), e.style.setProperty("--header-h", `${c}px`), e.style.setProperty("--dock-h", `${l}px`);
	}, a = () => {
		r || (r = !0, window.requestAnimationFrame(i));
	};
	if (i(), window.addEventListener("resize", a, { passive: !0 }), window.addEventListener("orientationchange", a, { passive: !0 }), window.visualViewport?.addEventListener("resize", a, { passive: !0 }), window.visualViewport?.addEventListener("scroll", a, { passive: !0 }), document.addEventListener("focusin", a), document.addEventListener("focusout", a), typeof ResizeObserver < "u") {
		let e = new ResizeObserver(a);
		t && e.observe(t), n && e.observe(n);
	}
}
// src/modules/interaction-guard.ts
function l() {
	let e = (e) => e instanceof Element && !!e.closest("input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), select:not([disabled]), [contenteditable=\"true\"], [role=\"textbox\"]");
	for (let t of [
		"contextmenu",
		"dragstart",
		"selectstart"
	]) document.addEventListener(t, (t) => {
		e(t.target) || t.preventDefault();
	}, { capture: !0 });
}
// src/experience.ts
var u = document.querySelector("#musicToggle"), d = document.querySelector("#voiceToggle");
u && i(u), d && s(d), c(), l();
