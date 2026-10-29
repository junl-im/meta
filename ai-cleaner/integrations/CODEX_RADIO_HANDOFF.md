# Codex 인수인계 — 곰같은여우 AI MUSIC RADIO ↔ AI 놀이터

## 상태 (2026-10-29)

- **이 브랜치는 연동 준비물만 추가**. 아직 메인 사이트에 붙이지 않았고 운영 AI 놀이터/Cloudflare 라디오도 변경하지 않았다.
- 소스 저장소: `junl-im/meta`, 현재 준비 브랜치 `feature/gomfox-ai-radio-playground-20261029`.
- 사이트: `ai-cleaner/index.html`, `ai-cleaner/css/app.css`, `ai-cleaner/js/home-music-dock.js`.
- 현재 소스에 있는 **Spotify 음악방/랜덤 듣기 기능은 보존**. 기존 `AIPlayground/GomFoxMusic/`과 구별하여 새 **AI 뮤직 라디오** 추가.
- 라디오 운영 서버: https://gomfox-ai-music-radio.mcwoogi.workers.dev/ (Cloudflare Workers, 사용자측 v4 안정화 버전).
- MP3 55곡(8집 35곡·9집 20곡)은 원격 Workers에서 제공. **AI 놀이터 저장소나 GitHub Pages 배포에 MP3 복제 금지**.
- 저작권/브랜드 표시: **곰같은여우**만. 개인 실명/계정 이메일/비밀키 표시 금지.

## 제공된 연동 파일

| 파일 | 용도 |
|---|---|
| `ai-cleaner/js/radio-dock.js` | 사용자 클릭으로만 iframe 연결. 펼치기·접기·종료, 기존 Spotify 도크 정지 |
| `ai-cleaner/css/radio-dock.css` | PC/모바일 분리 스타일, 신규 클래스 prefix `radioDock`/ `radioWorldCard` |
| `ai-cleaner/integrations/radio-dock.fragment.html` | 상단 드롭다운 링크 + 홈 카드 + 재생 창 HTML 조각 |
| `ai-cleaner/integrations/CODEX_RADIO_HANDOFF.md` | 이 문서 |

**이 상태에서 직접 라이브 사이트에 적용된 것은 없다.** Codex가 실제 수정/테스트/배포를 담당할 것.

## Codex 적용 순서

1. **최신 main을 가져와 현재 저장소 변경점 확인**. 사용자의 다른 프로젝트·스타일·게임은 수정하지 않는다.
2. `ai-cleaner/index.html`에서 상단 '소리와 음악' 메뉴의 `studioPickerLinks`에 HTML 조각 A 추가. `homeWorldCollection--audio .homeWorldGrid`에 B 카드 추가. 파일 하단 `</body>` 전에 C 도크 패널 추가. 임의로 기존 `곰같은여우 뮤직`/Spotify 관련 엘리먼트를 지우지 않는다.
3. Head에서 CSP `frame-src https://open.spotify.com;` 에 **`https://gomfox-ai-music-radio.mcwoogi.workers.dev`**를 추가해 외부 iframe을 허용. `default-src` 등 기존 보안 정책 유지. 여기서는 iframe 자체만 원격 서버로 접속하므로 상위 페이지에 MP3 `media-src`/음원 `connect-src`를 추가할 필요가 없다.
4. Head에 `<link rel="stylesheet" href="css/radio-dock.css?v=...">` 와 `<script src="js/radio-dock.js?v=..." defer></script>` 추가. 안정적 로딩 순서 보장. 파일명 캐시 버전은 프로젝트 버전 규칙에 맞출 것.
5. `.github/scripts/build-pages-artifact.mjs`의 명시적 공개 파일 allowlist에 **`css/radio-dock.css` 와 `js/radio-dock.js`** 추가. 그렇지 않으면 배포 결과에 파일이 누락된다.
6. `ai-cleaner/sw.js` CORE_ASSETS에도 두 파일을 추가하고 CACHE_NAME을 변경해 이전 캐시와 충돌하지 않도록 한다. `version.json` / `package.json` / HTML 스타일 버전 규칙 일치시킨다.
7. 상단 음악방 메뉴, 기존 Spotify dock, `studioPicker` 동작 유지. 사용자가 새 라디오를 열 때 Spotify 도크가 종료되도록 미리 구성함. **반대로 Spotify 재생 버튼을 누를 때도 라디오가 동시에 재생되지 않도록**, `home-music-dock.js` 시작 이벤트에서 `window.GomFoxRadioDock?.stop?.()` 호출 추가를 고려하되 기존 테스트를 깨지 말 것.
8. 기존 `homeWorldCollection--audio`는 PC에서 3열; 4번째 라디오 버튼 추가 후 4열로 바뀌므로 `ai-cleaner/tests/e2e.spec.mjs`의 기존 그룹 개수 `[4,3,5]`를 검증 목적에 따라 `[4,4,5]`로 수정하고 카드 간 충돌/수평 스크롤이 없는지 확인. 620px 이하에서는 2열 규칙 유지.
9. **반드시 실제 Cloudflare Worker의 X-Frame-Options / Content-Security-Policy frame-ancestors 헤더를 확인**. 외부 iframe이 허용되지 않는 경우 대체로 '새 창으로 듣기' 링크를 우선 사용하며, 권한 없이 Cloudflare 라디오 설정을 임의 변경하지 않는다. iframe 자동재생은 브라우저 정책상 보장되지 않으므로 라디오 내부에서 ▶를 눌러야 할 수 있다.

## 인수테스트

- 홈에는 **AI 뮤직 라디오 카드**가 나타나며 기존 Spotify 코너도 그대로 있다.
- 클릭 전에는 원격 iframe `src`가 없어 음악/네트워크 사용이 시작되지 않는다.
- 클릭 후 라디오를 **홈 페이지 안**에서 보고 내부 ▶ 재생 가능해야 한다. 불가하면 새 창 링크로 정상 진입 가능해야 한다.
- 접기 → 펼치기 시 같은 iframe을 재사용하고 불필요한 `src` 재설정 없음.
- 종료 시 iframe `src` 제거로 재생 종료.
- 홈→글 다듬기 등 같은 AI 놀이터 문서 내부 전환 중에는 라디오 패널 유지. **서로 다른 HTML 문서로 이동할 때는 재생 지속 불가**: 새 창 듣기 제공.
- Spotify 랜덤 듣기 실행 시 라디오와 중복 재생되지 않도록 명시적으로 처리.
- 모바일 320/360/390px, PC 1024/1280/1440px에서 카드 겹침·의미 없는 가로 스크롤·클릭 불능 없는지 검증.
- `npm run test:e2e`, `npm run test:modules`, Pages artifact build(실행 중인 CI 스크립트 확인) 모두 통과.
- 기존 라디오 v4 음원 호스팅/재생 코드와 다른 게임 저장소는 **변경하지 않는다**.

## 중요한 한계

- iframe을 CSS로 접는 상태에서 모바일 브라우저/OS가 미디어를 계속 재생하는지 실제 기기 테스트가 필요하다. 모든 모바일 환경에서 배경 오디오가 보장되는 것은 아니다.
- 현재 코드는 외부 iframe 기반 UI 통합이다. 정확한 곡 메타데이터를 홈 전체 공통 도크로 동기화하거나, 다른 서비스 페이지 이동 간 무중단 재생을 제공하지 않는다.
- 기존 Cloudflare 워커는 MP3 용량을 128kbps로 줄인 안정화 v4 사용 중이며, 운영 서버를 교체하는 방식은 이 작업에 포함하지 않는다.
