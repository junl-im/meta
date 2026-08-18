# AI Writing OS Migration Notes — 1.8.0

## Source
User-provided package: `AI_COMPANY_OS_HUB_V1_EMBED` V1, containing AI COMPANY OS V6.1.

## Live GitHub Pages mapping
| Uploaded Hub | 1.8.0 static runtime |
|---|---|
| `public/index.html` standalone Hub | `#writingTool` third top-level tool inside existing UI |
| `public/app.js` API client | `js/features/ai-writing-os.js` browser-local controller |
| `src/router.mjs` | browser-local `routeTask()` with same channel/workforce rules |
| `src/task-pack.mjs` | browser-local Task Pack + Markdown generation |
| `adapters/providers.json` | `ai-writing-os/providers.json` |
| `os/current` fast context | public fast context files under `ai-writing-os/os/current/` |
| `/api/prepare`, `/api/context-pack` | local browser generation; no fake API |
| Remote MCP | not live on GitHub Pages; contract retained for future server Hub |
| user JSON store | localStorage preferences only |
| original Portable OS ZIP | sanitized public Portable OS ZIP |

## Privacy decision
The repository is public. Therefore the uploaded personalized owner profile is not published verbatim. The public runtime uses a generic profile, while user-entered preferences stay in localStorage and are inserted only into the generated Task Pack.

## Future Remote MCP activation
A future server/reverse-proxy deployment may implement `ai-cleaner/ai-writing-os/integration-contract.json`. Authentication must come from a trusted server session; browser-supplied arbitrary user IDs must not be trusted. Do not put server secrets or MCP access slugs into this public repository.

## 1.8.1 simple-start presentation
The 1.8.0 migration preserved most Hub concepts visibly, which was accurate but too dense for first-time use. 1.8.1 keeps the same routing/context engine while changing the default presentation to three steps: request, provider, prepare. Workforce routing, profile settings, route diagnostics, and Portable OS remain available only in the collapsed advanced section. Generated Markdown remains available under a collapsed result detail. Preparation now aborts on newer input/tool intent and participates in the shared app Work Lock.

## 1.8.1 simple-start presentation
The 1.8.0 migration preserved most Hub concepts visibly, which was accurate but too dense for first-time use. 1.8.1 keeps the same routing/context engine while changing the default presentation to three steps: request, provider, prepare. Workforce routing, profile settings, route diagnostics, and Portable OS remain available only in the collapsed advanced section. Generated Markdown remains available under a collapsed result detail. Preparation now aborts on newer input/tool intent and participates in the shared app Work Lock.

## 1.8.2 Prompt Compiler & adaptive delivery
The static GitHub Pages edition now treats the AI Writing OS primarily as a **Prompt Compiler**, not as a full OS-file transfer UI. `prompt-compiler.json` holds the compact common/channel/effort rules. The normal execution prompt includes only rules relevant to the current task and does not dump `00_OPEN_FIRST.md` or `07_STATE_AND_UPDATE.md` into every request.

The default completion path is now `request -> preferred AI -> OS-enhanced send`. On touch/mobile environments the controller prefers the operating system share sheet through `navigator.share()` when available. Desktop uses clipboard + selected-provider launch. `원문 그대로 보내기` is retained as a comparison/control path. This is still a static handoff model: no fake Remote MCP or `/api/*` endpoint is exposed.


## 1.8.3 linkage + clarity UX
The runtime behavior remains a static Prompt Compiler, but the presentation now makes the handoff model explicit instead of implying a stronger third-party app connection than the browser can provide. Provider selection is presented as `내 기본 AI`. Desktop shows a provider-aware `copy prompt + open provider` plan. Mobile Web Share shows a system-share plan and explicitly tells the user to choose the preferred AI in the share sheet because the browser cannot force-target an arbitrary installed AI app.

The primary CTA mirrors the real path (`공유하기`, provider-specific `열기`, or `복사하기`). After compilation, four compact rule chips explain what OS applied, and the result state reports the actual handoff outcome plus the next action. The raw-send path remains secondary for A/B comparison.


## 1.8.4 copy-first delivery safety
Real-device feedback exposed a delivery-order bug in the 1.8.3 fallback path: the selected provider was opened before clipboard write. This is fragile in KakaoTalk and similar embedded WebViews because navigation/popup activity can invalidate the transient user gesture used by clipboard APIs. 1.8.4 changes the contract to **copy success first, provider launch second**.

Restricted in-app browser signatures use an explicit safe-copy plan and skip the native-share assumption. A synchronous textarea + `document.execCommand('copy')` fallback is attempted while the click gesture is still active, followed by Async Clipboard when available. If copying still fails, the provider is not opened; the generated prompt stays visible and is selected for manual copy. Provider opening is also available as a separate recovery button after copy.


## 1.8.5 Blog Factory V7 renewal
AI Company OS V7의 BLOG / DESIGN / Truth Guard를 `오늘 1편`, `3편 생산`, `소재 20개`, `자유 요청` 프리셋으로 압축했습니다. 정적 GitHub Pages는 웹 검색이나 이미지 생성을 직접 수행했다고 주장하지 않으며, 선택 AI에 실제 기능이 있을 때만 실행하도록 프롬프트를 구성합니다.

## 1.8.6 Blog Factory stability patch
1.8.5 실사용 전 최종 감사를 통해 `소재 20개`와 고정 이미지 장수 설정이 서로 충돌하던 표현을 제거했습니다. idea-bank는 이미지 장수 선택을 비활성화하고 소재별 이미지 콘셉트만 납품합니다. Free/idea/daily·batch 모드별로 화면 생산 단계도 실제 동작에 맞게 전환됩니다. 저장된 provider ID는 registry와 다시 대조하며, audience/facts/avoid-topics에는 브라우저 안전 상한을 적용합니다. 기존 copy-before-open / fail-closed 전달 계약과 앞 두 도구는 그대로 유지합니다.


## 1.8.8 GitHub Actions Daily Engine
The unattended daily generator is now implemented on the repository's existing GitHub stack instead of introducing Netlify or a browser-side API key. `.github/workflows/daily-blog-factory-pages.yml` has three paths: normal `main` pushes deploy the current static site without consuming AI API calls; the `06:20 Asia/Seoul` schedule generates fresh topics; and `workflow_dispatch` allows an explicit manual generate/deploy run.

The scheduled/manual generation step runs `.github/scripts/generate-daily-topics.mjs` with `OPENAI_API_KEY` from GitHub Actions Secrets and the seed/profile inputs from Actions Variables. It uses the OpenAI Responses API with web search, validates exactly 10 non-empty topics, writes `ai-cleaner/data/daily-topics.json`, commits that public non-secret result, and deploys the same workspace to GitHub Pages in the same workflow. The browser never receives the API secret.

The Blog Factory fetches the public JSON with `cache: no-store`, renders 10 topic cards and TOP 3 priorities, and lets the user transfer one generated topic into `오늘 1편`. The existing local prompt auto-prepare survives under the clearer name `로컬 프롬프트 자동 준비`; it remains a browser-open helper, not the unattended engine.

## 1.8.7 Blog Factory copy-first daily runtime
The third tool is now presented as **블로그 팩토리**. Provider selection, provider launch, mobile share handoff, and raw-send comparison are removed from the user flow. The static runtime now does one thing honestly: compile the selected Blog Factory mode into a visible prompt that the user can inspect and copy.

`오늘의 주제` is the default mode and requests 10 daily topic candidates plus a TOP 3 ranking rather than a finished article. `소재 20개` is also idea-only and must not inherit a fixed image package or full-article output contract. Full article/image packages are reserved for `오늘 1편` and `3편 생산`.

`매일 자동 준비` is intentionally local and opt-in. It stores the seed and, on the first open of a new local date, prepares that day's prompt; it does not claim to execute AI while the page is closed. Same-day cached prompts are stored only for the daily-topic mode when transient facts/avoid-notes are empty, and a settings/profile signature invalidates stale caches. A future unattended daily generator must be implemented as a server-side scheduler/API/storage layer, not by exposing secrets in the public Pages bundle.
