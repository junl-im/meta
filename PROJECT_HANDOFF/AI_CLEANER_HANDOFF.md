# AI Cleaner 프로젝트 인수인계 메모리

업데이트: 2026-08-27 · 현재 패키지: 1.15.4

## 새 채팅에서 가장 먼저 읽을 것
이 폴더를 새 채팅에 업로드한 뒤 `PROJECT_HANDOFF/AI_CLEANER_HANDOFF.md 읽고 이어서 개발하자`라고 요청한다. 이 문서는 프로젝트의 결정사항, 보호 경로, UX 방향, 안전 제약, 배포 방식, 알려진 이슈를 보존하기 위한 인수인계 메모리다.

## 프로젝트/배포
- GitHub: `junl-im/meta`
- GitHub Pages 루트: `https://junl-im.github.io/meta/`
- 루트 `index.html`은 `./ai-cleaner/`로 진입시킨다.
- Pages Build and deployment는 **Source = GitHub Actions** 를 사용한다.
- 일반 `main` push는 `.github/workflows/ai-cleaner-ci.yml`이 정적 검사 -> browser-smoke -> Pages 배포까지 한 흐름으로 담당한다.
- `.github/workflows/daily-blog-factory-pages.yml`은 예약/수동 Daily Engine 생성 + Pages 배포 전용이다. 일반 push에서는 실행하지 않는다.
- **`OPTION/**`은 다른 서비스가 사용하는 보호 경로. 어떤 경우에도 수정/이동/삭제/rename 금지.**


## 1.12.0 브랜드 / 플랫폼 기준
- 사용자-facing 서비스 브랜드는 **`곰같은여우의 AI 놀이터`** 다.
- 개별 도구명은 `AI 글 다듬기`, `AI 이미지 검사`, `블로그 팩토리`로 유지한다. 과거 전체 서비스명 `곰같은여우의 AI 흔적 지우개`로 되돌리지 않는다.
- `/ai-cleaner/`, manifest `id`/`scope`, GitHub Pages 경로는 호환성을 위해 그대로 유지한다. 브랜드 변경 때문에 URL이나 PWA identity를 새로 만들지 않는다.
- 브라우저 제목은 현재 선택한 도구 + 플랫폼 브랜드를 조합한다. 예: `AI 이미지 검사 | 곰같은여우의 AI 놀이터 v1.12.0`.
- PWA `name`, `short_name`, application/mobile title, SEO/OG 설명은 플랫폼 브랜드와 세 도구 범위를 일관되게 표현한다.
- `OPTION/**`은 여전히 다른 서비스 영역이며 브랜드 전환/플랫폼 확장과 무관하다.

## 사용자의 작업 방식
- 사용자는 GitHub Desktop을 주로 사용한다.
- ChatGPT가 ZIP/폴더 묶음을 주면 사용자가 로컬 `meta`에 덮어쓰기 → GitHub Desktop Commit → Push 하는 흐름을 선호한다.
- 설명용 README를 매 ZIP마다 넣는 것은 선호하지 않는다. 단, 이 `PROJECT_HANDOFF`는 의도적으로 유지한다.

## UX 원칙
- 누구나 바로 쓸 수 있게 본 화면은 `원본 ↔ 결과` 비교에 집중한다.
- 교정 제안 / 문장 검토 / 기술 정보는 필요할 때만 오른쪽 아래 위젯으로 나타난다.
- 데스크톱 팝업은 헤더 왼쪽 드래그로 이동, 모서리 resize 가능. 모바일은 하단 시트로 전환해 drag/resize를 끈다.
- v6.6부터 새 팝업의 기본 위치는 원본 입력창 상단 근처다. 위치/크기는 localStorage에 저장한다.
- 원본/결과/문장 편집 textarea만 텍스트 선택을 허용한다. 일반 UI는 기본 우클릭/드래그 선택을 막는다. textarea 우클릭은 자체 메뉴를 사용한다.
- 브라우저 맞춤법/자동교정/Grammarly 힌트는 textarea에서 최대한 끈다.
- 반복 단어/교정 항목의 `🔍 위치 보기`는 textarea 내부 scrollTop을 계산해 실제 등장 위치로 이동해야 한다.
- 1.9.1 교정 제안 패널은 `안전 일괄 반영`을 제공한다. 실제 치환값이 있는 deterministic 제안만 대상이며 반복 단어 등 확인 항목은 자동 변경하지 않는다. 개별 반영 시 이미 적용한 제안과 범위가 겹치면 `겹침 · 일괄`로 전환하고, 대량 목록은 120개까지만 렌더링한다. 전체 일괄 반영은 History 한 단계로 Undo/Redo 가능해야 한다.
- X-ray 전용 결과 탭은 1.1.1에서 제거했다. 숨은 Unicode/특수 공백/유사문자는 `기술 정보` 패널에서 확인한다.

## 텍스트 안전 정책
- 자동 제거 가능: ZWSP, BIDI/control 계열, 표준 프로필의 특수 공백.
- 기본 보존/검출만: ZWJ(U+200D), ZWNJ(U+200C), WORD JOINER(U+2060), Variation Selector, Unicode Tag 등 의미/출처에 영향을 줄 수 있는 문자.
- NFKC는 기본 OFF. 사용자가 켤 때만 적용.
- homoglyph는 검출만 하고 자동 치환하지 않는다.
- 기능 목적은 기술 위생/가독성/편집 보조이지 AI 탐지 우회 점수를 낮추는 기능이 아니다.

## 입력 파일
- v6.6 버튼명은 `파일 열기`.
- 브라우저에서 직접 읽기 쉬운 텍스트 기반 확장자를 폭넓게 지원: txt/md/html/rtf/csv/json/jsonl/log/xml/yaml/yml/ini/cfg/conf/properties/toml/sql 및 주요 코드 파일.
- HTML/XML은 텍스트 추출, RTF는 간이 텍스트 추출.
- PDF/DOCX는 아직 전용 파서가 없으므로 지원 대상에 넣지 않음. 향후 추가 시 별도 parser와 테스트 필요.

## 문장 검토 v6.6
- 과거 버그/혼란: 체크만 하고 `선택 수정 반영`을 눌러도 textarea 내용이 원문과 같아서 “수정한 문장이 없습니다”가 나왔다.
- v6.6: 실제로 내용이 달라진 + 체크된 문장만 카운트. `수정됨 N개` 배지와 버튼 disabled 상태로 명확히 표시.
- 규칙으로 안전하게 제안 가능한 정형 전환어/FAQ/Markdown만 `추천안 채우기` 제공. 긴 문장은 의미를 임의로 자동 재작성하지 않는다.

## 작성 흐름 미리보기
- 사용자가 결과를 한 글자씩 보는 기능을 원했으나, 실제 키보드 이벤트/외부 사이트 자동입력/사람 입력 시뮬레이션은 구현하지 않는다.
- v6.6은 **시각적 `작성 미리보기`** 만 제공한다. 결과 텍스트를 별도 overlay에서 한 글자씩 렌더링할 뿐 실제 키 입력이나 외부 페이지 입력을 생성하지 않는다.

## 이미지 검사
- 공식 `@contentauth/c2pa-web 0.13.4` 사용, Reader.fromBlob → manifestStore 흐름. C2PA 인스턴스 재사용.
- ExifReader 4.42.0은 이미지 검사 시 lazy-load.
- C2PA manifest 존재 자체를 AI로 단정하지 않음. digitalSourceType의 `trainedAlgorithmicMedia`, `digitalCapture` 등을 구분.
- GPS는 존재 여부만 표시하고 좌표 값은 화면에 노출하지 않는다.
- 공급자 전용 비가시 워터마크를 직접 인증한다고 주장하지 않는다.
- 시각 휴리스틱 점수는 확률이 아니며 UI에서 참고 지수로만 표현한다.

## 성능 결정
- 기술 정보는 최대 표시량을 제한하고, 핵심 텍스트 분석은 1.2.0의 `core/text-engine.js`에서 DOM과 분리해 계산한다.
- 1.5.0부터 실시간 텍스트 분석은 문서 길이 + 빠른 연속 입력 + 최근 실제 분석시간을 반영하는 adaptive governor로 debounce를 조절한다.
- 문장 검토 UI는 최대 400문장. 숨겨진 교정/문장검토/기술정보 패널은 1.5.0부터 실제로 열 때 DOM을 만든다.
- 이미지 연속 선택 시 analysis sequence token으로 오래된 비동기 결과가 새 이미지 결과를 덮지 못하게 함.
- C2PA WASM 인스턴스 재사용.
- 큰 이미지 바이너리 문자열 스캔은 전체 복사 대신 필요한 앞/뒤 구간 위주.

## 파비콘/캐시
- 여우 원본 로고 사용. 이모지 임시 로고로 되돌리지 않는다.
- favicon/apple-touch/PWA 아이콘은 버전 파일명으로 교체해 캐시를 피한다.
- `version.json` + `APP_VERSION` + HTML meta version을 일치시킨다.
- 앱은 version.json을 no-store로 확인해 새 버전 발견 시 cache-busting query로 재진입한다.

## CI
- `.github/workflows/ai-cleaner-ci.yml`: AI Cleaner 관련 main push의 JS syntax, static-check, browser smoke를 수행하고 성공 후 Pages를 배포한다. `OPTION/SS_OPTION.txt`는 소유자 관리 파일이며 AI Cleaner가 수정하지 않는다. 해당 파일은 Pages public bridge 갱신을 위해 push trigger에만 포함될 수 있다.
- `.github/workflows/daily-blog-factory-pages.yml`: 예약/수동 Daily Engine 생성 + Pages 배포 전용.
- 일반 push와 예약 생성이 동시에 이중 실행되지 않도록 역할 분리를 유지하고, Pages Source는 GitHub Actions로 둔다.

## 1.8.8 GitHub Actions Daily Engine
- Daily Engine은 **GitHub Pages + GitHub Actions** 전용이다. Netlify/serverless provider 의존 코드를 넣지 않는다.
- `.github/workflows/daily-blog-factory-pages.yml`은 `main` push 시 Pages만 배포하고, 매일 `06:20 Asia/Seoul` schedule 또는 수동 `workflow_dispatch` 시에만 실제 오늘의 주제를 생성한다.
- generator는 `OPENAI_API_KEY` Actions Secret과 `BLOG_FACTORY_SEED` Actions Variable을 사용한다. 비밀키를 HTML/JS/JSON에 넣지 않는다.
- 생성 결과는 `ai-cleaner/data/daily-topics.json`에 정확히 10개를 저장하고 상위 3개를 TOP 3로 표시한다. 선택한 주제는 기존 `오늘 1편` 프롬프트 빌더로 전달한다.
- scheduled run에서 JSON을 커밋한 뒤 **같은 workflow 실행에서 Pages artifact를 업로드/배포**한다. workflow bot의 push가 별도 Pages workflow 재실행에 의존하지 않도록 한다.
- `로컬 프롬프트 자동 준비`는 1.8.7 기능을 보조 기능으로 유지한다. 이것은 브라우저가 닫힌 동안 원격 AI를 실행하지 않으며 Daily Engine과 구분한다.
- 최초 전환: GitHub `Settings → Pages → Build and deployment → Source → GitHub Actions`, Actions Secret/Variables 설정 후 `Daily Blog Factory + GitHub Pages`를 한 번 수동 실행한다.
- 2026-08-18 연결된 `junl-im/meta` 원격 `main`은 아직 1.8.5로 확인되었으므로 1.8.8 Patch는 **1.8.5 → 1.8.8 누적 패치**로 배포한다. 1.8.6/1.8.7 로컬본 위에 덮어써도 동일한 1.8.8 결과가 나와야 한다.

## 1.8.7 블로그 팩토리 copy-first 리뉴얼
- 세 번째 메뉴명을 `AI 글쓰기 OS`에서 `블로그 팩토리`로 변경. 앞의 `글 다듬기`/`이미지 검사` UI와 엔진은 보호한다.
- 기본 흐름은 `관심 분야/주제 씨앗 → 오늘의 주제 프롬프트 만들기 → 화면 확인 → 프롬프트 복사`. provider 선택, AI 새 탭 열기, 시스템 공유, 원문 보내기 경로는 제거한다.
- 기본 모드는 `오늘의 주제`: 완성 본문 대신 후보 10개 + TOP 3 + 확인 필요 사실 + 이미지 콘셉트를 요청한다. `소재 20개`도 완성 본문/고정 이미지 패키지를 만들지 않는다.
- `매일 자동 준비`는 opt-in 로컬 자동화다. 관심 분야를 저장하고 새 날짜에 사용자가 앱을 열었을 때 그날용 프롬프트를 준비한다. 앱이 닫힌 동안 AI를 실행했다고 주장하지 않는다.
- 오늘 프롬프트 캐시는 자동 준비 opt-in일 때만 저장하며, 임시 `실제 경험/사실`·`중복 방지 메모`가 있으면 캐시하지 않는다. 프로필/독자/조사 설정/주제 씨앗이 바뀌면 signature 불일치로 같은 날 캐시도 폐기한다.
- 완전 무인 일일 생성은 정적 Pages에 비밀키를 넣지 말고, 향후 서버 스케줄러 + 서버 측 AI API + 지속 저장소 계층으로 분리한다.


## 1.11.2 browser-smoke Service Worker 격리 핫픽스
- 일반 Playwright E2E는 Service Worker를 차단해 Daily Engine의 `page.route()` 네트워크 모킹이 활성 SW/cache에 의해 우회되지 않게 한다.
- 오프라인 shell 검사는 별도의 `serviceWorkers: 'allow'` context를 직접 생성하고 테스트 종료 시 context를 닫는다.
- production Service Worker, network-first Daily Topics, app-core bundle/PWA 동작은 그대로 유지한다. 테스트를 통과시키기 위해 실제 기능을 끄지 않는다.
- 정적 검사에 SW test-isolation 계약을 추가한다.
- `OPTION/**`은 수정/전달 대상에서 계속 제외하고 owner-managed `/OPTION/SS_OPTION.txt` bridge는 변경하지 않는다.

## 1.11.1 CI/PWA 기반 복구 핫픽스
- GitHub main에서 1.11 UI 파일과 1.9.9/1.10 이전 기반 파일이 섞인 상태를 복구한다.
- `ai-cleaner/js/boot.js`는 production `vendor/app-core.bundle.js` 우선 로드 + 기존 ordered source fallback + `./sw.js` 등록을 유지한다.
- `.github/scripts/build-runtime-vendor.mjs`는 17개 first-load source를 `app-core.bundle.js`로 생성하며 이미지 vendor build와 함께 실행한다.
- `.github/scripts/build-pages-artifact.mjs`는 `sw.js`를 명시적 runtime allowlist에 포함한다.
- `site.webmanifest`의 `id`, `lang`, description/categories/orientation 등 PWA metadata를 유지한다.
- 두 GitHub Actions workflow에서 `node --check ai-cleaner/sw.js`를 실행한다.
- static check의 service-worker cache 버전 검사는 특정 릴리스 문자열을 하드코딩하지 않고 `version.json` 값과 동적으로 맞춘다.
- `OPTION/**`은 수정/전달 대상에서 계속 제외한다. 기존 owner-managed `/OPTION/SS_OPTION.txt` public bridge 정책은 변경하지 않는다.

## 1.11.0 UI 구조 정리
- 상단 도구 전환은 ARIA tablist/tab 구조로 고정하며 `←/→/Home/End` 키보드 이동과 roving tabindex를 유지한다.
- `prefers-reduced-motion` CSS는 단일 최종 계약 블록에서 관리한다. 새 버전별 reduced-motion override를 별도 블록으로 누적하지 않는다.
- Blog Factory 프리셋은 390px급 모바일에서는 2열을 유지하고 340px 이하에서만 1열로 전환한다.
- 모바일 disclosure summary는 터치 영역을 보장하고 긴 Daily Topic/Compiler 문구는 카드 밖으로 넘치지 않게 wrap한다.
- `OPTION/**`은 계속 AI Cleaner 수정/전달 대상에서 제외하며 `/OPTION/SS_OPTION.txt` public bridge만 기존 Pages 동작을 유지한다.

## 다음 개선 후보
- PDF/DOCX 안전한 로컬 파일 import.
- Playwright browser-smoke는 CI에 존재한다. 새 모듈화 이후에는 static/module checks와 browser-smoke를 함께 유지한다.
- 접근성: 키보드 focus trap, ESC로 팝업 닫기, aria-live 알림 정교화.
- 긴 문서에서 위치 네비게이션/문장검토 벤치마크.
- 이미지 픽셀 계산을 Web Worker/OffscreenCanvas로 이동할 수 있는지 검토.

## 변경 시 반드시 확인
1. `OPTION/**` 변경 0건.
2. `node --check ai-cleaner/js/app.js` / image-analyzer.js 통과.
3. `node ai-cleaner/tests/static-check.mjs` 통과.
4. HTML ID 중복/DOM 참조 누락 0.
5. `version.json`, HTML app-version, APP_VERSION 일치.
6. 모바일/태블릿 980px 이하에서 compact 하단 시트, 확대/축소, 본문 overflow 정상.
7. GitHub Pages 루트 주소에서 `/ai-cleaner/` 진입 정상.


## v6.7 completion patch
- version.json is now the runtime version source; HTML boot loads CSS/JS assets with assetVersion.
- open-page update checks preserve input/output/settings in sessionStorage before cache-busting reload, then restore them.
- detailed diagnostics are collapsed by default.
- result editing has step Undo/Redo history and an on-demand line-based diff tab.
- Playwright browser smoke tests were added to GitHub Actions; Pages deployment remains branch-based and separate.
- OPTION/** remains protected and must not be modified.
- Synthetic keystroke/retyping automation remains intentionally excluded; typing preview is visual-only.


## v6.8.1 재작성 스튜디오
- 기존 원본/결과 중심 UI를 유지하고 `✦ 새 글 재작성` 플로팅 위젯을 추가.
- `rewrite-studio.js`는 위젯을 누를 때만 lazy-load. 이미지 분석 엔진도 파일 선택 시 lazy-load.
- 로컬 재작성 엔진: 가볍게/구조/새 초안, 문체 방향, 길이 옵션. 의미 기반 원격 AI 모델은 사용하지 않으며 새로운 사실을 임의 생성하지 않음.
- Fact Lock: 숫자, 날짜, URL, 이메일, 인용구를 보호하고 초안에서 누락되면 결과 적용을 막음.
- 직접 작성 검증: 사용자가 앱 내부 textarea에 물리 키보드로 입력한 내용을 code point 기준 비교. 한글 IME composition 대응. paste/drop 차단.
- 외부 사이트/앱으로 합성 키 입력을 보내는 매크로/재타이핑 자동화는 구현하지 않음.
- 재작성 결과 적용은 기존 Undo/Redo 및 변경 비교 히스토리에 기록.


## v6.8.1 precision patch
- Unified control heights/alignment and custom checkbox rendering.
- Fixed responsive bridge text rotation and bridge/grid width mismatch.
- Batched long-text statistics rendering; cached direct typing target arrays.
- Fact Lock extended to Korean dates, times, phone numbers and hashtags.
- Rewrite panel reports elapsed generation time.


## v6.8.2 Focus Flow
- 재작성 결과 적용 성공 시 재작성 팝업을 자동으로 닫고 정리본 결과로 이동한다.
- 결과 textarea를 화면 중앙에 노출하고 짧은 적용 강조 애니메이션과 완료 토스트를 표시한다.
- 한 번에 하나의 플로팅 패널만 열리도록 하여 팝업 겹침을 줄였다.
- 재작성/문장검토/직접수정 뒤 교정 제안 기준을 현재 결과로 갱신해 오래된 제안이 새 결과를 덮어쓰지 않게 했다.
- History snapshot에 suggestion baseline(issueBase)을 포함해 Undo/Redo 시 교정 기준도 함께 복원한다.
- GitHub Actions YAML의 깨진 printf 줄바꿈을 복구하고 concurrency + preview readiness check를 추가했다.


## v6.8.3 Cohesion & Integrity
- 재작성 초안을 만든 뒤 기준 원본/결과가 바뀌면 stale draft로 판정하고 `결과에 적용`을 잠근다. 새 초안을 다시 생성해야 적용 가능하다.
- 재작성 초안/옵션은 sessionStorage에 보관해 새로고침·버전 전환 뒤에도 복원하고, 기준 글이 달라졌으면 보존하되 적용은 잠근다.
- Fact Lock에 모델/코드(M60 같은 영숫자 코드)를 추가하고, 충돌 가능성이 낮은 고유 임시 토큰을 사용한다. 240개를 초과하면 사실 보호를 위해 적용을 잠그고 문서 분할을 안내한다.
- 로컬 재작성은 탐지기 우회 최적화가 아니라 사실 보존 + 문장/문단 구조 재설계 + 중복 정리를 목표로 한다. 특정 AI detector를 속이는 점수/목표는 만들지 않는다.
- 구조 재작성/새 초안 모드는 고정 블록(해시태그/목록)을 보존하면서 일반 문장을 순서 보존 상태로 새 문단 크기로 재구성한다.
- 태블릿 포함 980px 이하에서는 모든 플로팅 도구를 하단 시트로 통일하고 drag/resize를 끈다. 데스크톱 저장 위치가 화면 밖으로 나가면 viewport 안으로 자동 보정한다.
- 문장 검토 다중 반영도 적용 후 팝업을 닫고 결과 정리본으로 이동한다.
- 20MB 초과 텍스트 파일과 20만 자 초과 로컬 재작성은 브라우저 정지 위험을 줄이기 위해 분할 사용을 안내한다.
- ESC는 컨텍스트 메뉴/작성 미리보기/가장 위의 플로팅 패널을 닫는다. Toast/재작성 검증은 aria-live를 사용한다.
- CI는 `package-lock.json`이 있으면 `npm ci`, 없으면 `npm install`을 사용하고 browser-smoke 실패 시 preview server 진단을 로그로 남긴다.

## 결과물 전달 규칙 (사용자 고정 선호)
- 앞으로 개발 결과를 전달할 때 최종 답변 **하단에 항상 2개 파일을 제공한다.**
- 1) `FULL_PROJECT_HANDOFF.zip`: 현재 전체 프로젝트 + PROJECT_HANDOFF를 포함하는 통 파일. 새 채팅/복구/기준본 용도.
- 2) `Patch.zip`: 직전 기준본 위에 그대로 덮어쓸 실제 변경 파일 묶음. 평소 GitHub Desktop 작업용.
- 두 ZIP 모두 `OPTION/**`을 절대 포함하거나 변경하지 않는다.
- 패치 ZIP에 의미 없는 README/설명 파일은 넣지 않는다. 단, 사용자가 인수인계 갱신을 요청했거나 PROJECT_HANDOFF 자체가 변경된 버전은 변경된 PROJECT_HANDOFF 파일을 패치에도 포함한다.


## v6.8.3 원본 직접 쓰기
- 재작성 스튜디오의 두 번째 핵심 탭은 `⌨ 원본 그대로 쓰기`. 작성 대상은 원본으로 고정한다.
- 사용자가 앱 내부 textarea에서 실제 키보드로 입력한 문자열만 code point 기준으로 원본과 비교한다. 자동 키 입력/외부 앱 매크로/사람 입력 시뮬레이션은 구현하지 않는다.
- paste/drop/copy/cut, Ctrl/Cmd+V/C/X, Shift+Insert, beforeinput의 paste/drop 계열, 비신뢰(synthetic) input 이벤트를 차단한다. 한글 IME composition, Backspace, 방향키, 선택 수정은 허용한다.
- 원본과 100% 일치한 경우에만 **사용자가 직접 작성한 입력 문자열**을 결과에 반영한다. 원본 변수에서 자동 복제해서 결과를 채우는 경로는 제공하지 않는다.
- 브라우저 환경에서 물리 하드웨어 입력을 암호학적으로 증명할 수는 없으므로, 표준 웹 입력 경로에서 자동 삽입을 최대한 차단하는 best-effort 검증 모드로 설명한다.


## v6.8.4 원본 자동 작성(Typewriter)
- 사용자가 요구한 자동 작성은 외부 사이트/앱 키보드 매크로가 아니라 **AI Cleaner 내부 결과 textarea에 원본을 한 글자씩 누적 작성하는 기능**으로 구현한다.
- 브리지 버튼 `▶ 원본 자동 작성 / 한 글자씩`을 누르면 원본 textarea의 문자열을 읽고 결과 textarea를 비운 뒤 `Intl.Segmenter(..., grapheme)` 기준(미지원 시 Array.from fallback)으로 순서대로 작성한다.
- 작성 루프는 `textarea.setRangeText()`로 한 grapheme씩 결과 끝에 추가한다. Clipboard API, paste, `KeyboardEvent`/`InputEvent` 합성, 외부 앱 입력은 사용하지 않는다.
- 작성 중 원본과 충돌 가능한 결과 편집/Undo/교정/재작성 위젯을 잠그고, 원본 textarea도 임시 readOnly로 고정한다. ESC/닫기로 중지하면 시작 전 히스토리 상태를 복원한다.
- 완료 시 결과 문자열과 원본 문자열을 strict equality로 검증한다. 100% 일치할 때만 교정 기준선/Undo 히스토리를 확정하고 결과 화면을 보여준다. 실패하면 결과를 확정하지 않는다.
- 자동 업데이트는 Typewriter 실행 중에는 보류한다.
- `⌨ 원본 직접 쓰기`는 별도 기능으로 유지하며 실제 사용자의 물리 키보드 입력 검증용이다.
- 안전 경계: 내부 결과창 시각/문자열 생성은 허용하지만 외부 사이트나 다른 앱에 사람이 입력한 것처럼 합성 키 이벤트를 보내는 자동화는 계속 구현하지 않는다.


## v6.8.5 Foundation Audit
- 교정 규칙 중복 등록 버그 수정. 같은 정형 표현이 2회 제안되던 문제를 제거.
- 원본을 비우면 이전 결과/진단/위젯/히스토리도 즉시 빈 상태로 정리. 초기화 버튼은 reload 대신 앱 내부 상태를 안전하게 초기화하고 재작성 세션도 삭제.
- 문자/단어/줄 통계는 분석 완료본이 아니라 현재 입력값을 즉시 반영하며, 분석 대기 상태를 표시.
- 원본 자동 작성 시작 시 예약된 live analyze 타이머를 취소하고 설정/파일/도구/결과탭 등 충돌 가능한 컨트롤을 잠금. 종료 시 원래 disabled 상태를 정확히 복원. 검증 실패 시 부분 결과를 남기지 않고 이전 결과로 복원.
- 자동 작성 직전 현재 원본의 기술 메타데이터를 동기화해 X-ray/위생/비교 상태와 결과의 기준이 어긋나지 않게 함.
- 원본 직접 쓰기는 UI/엔진 모두 original-only로 고정.
- Fact Lock은 같은 사실값의 반복 횟수까지 검증. 초안에 3번 있던 가격이 1번만 남는 경우도 경고.
- RTF \uN 유니코드 이스케이프 기본 변환, 바이너리성 텍스트 파일 거부.
- 이미지 분석은 50MB/6천만 픽셀 보호 한도와 안전한 object URL 교체를 적용. 새 이미지 실패가 기존 미리보기를 먼저 깨뜨리지 않음.
- Playwright E2E의 오래된 v6.8.2 기대값과 상대 URL 버그를 제거하고 version.json 기반 버전 검증 + 절대 preview URL을 사용.
- 결과 버튼/헤더/초소형 화면 정렬과 focus-visible 접근성을 보강.
- 결과물 전달 규칙은 계속 고정: 최종 답변 하단에 전체 통 프로젝트 ZIP + 직전 전달본 기준 덮어쓰기 패치 ZIP 두 개를 항상 제공. OPTION/**은 두 패키지에서 보호/미변경.


## v6.8.6 UI / Layout Stabilization
- 모듈화(v6.9) 전에 화면 계약을 먼저 고정하는 안정화 버전. 새 기능보다 정렬/반응형/연계 레이아웃을 우선한다.
- 데스크톱 원본/결과 workspace의 전용 92px bridge 열을 제거하고, 동일 폭 2열 + 24px gap으로 변경한다.
- `▶ 자동 작성`은 두 카드의 헤더/본문 경계 중앙에 떠 있는 compact bridge로 배치한다. 버튼 때문에 별도 빈 열이 생기지 않는다.
- Typewriter 실행 중 bridge 보조문구가 0~100%/일시정지/완료로 바뀌고 종료 후 `원본 → 결과`로 복귀한다.
- 980px 이하에서는 bridge가 DOM 흐름 안의 가로 캡슐로 전환되어 원본 카드 → 자동 작성 → 결과 카드 순서를 유지한다.
- 양쪽 카드 헤더 높이, body 시작점, overflow/min-width, scrollbar gutter, 긴 보조문구 wrapping을 정리해 작은 폭/스크롤바 출현 시 레이아웃 흔들림을 줄였다.
- Playwright에 1280px 2열 동일 폭/bridge 중앙 좌표/예약 열 없음 + 820px inline bridge 회귀 검사를 추가한다.
- 다음 v6.9 모듈화에서 UI를 재디자인하지 않고 이 레이아웃을 외부 계약으로 유지한다.


## 1.0.0 Mobile Compact Panels / product baseline
- 모바일/태블릿 플로팅 패널은 기본적으로 약 43~46dvh의 compact sheet로 열어 본문을 과도하게 가리지 않는다.
- 각 패널 헤더에 모바일 전용 확대/축소 버튼을 제공하며 필요할 때만 약 84~86dvh로 확장한다. 패널을 닫거나 다른 패널을 열면 다시 compact 상태로 시작한다.
- compact 상태에서는 헤더 보조문구와 일부 설명성 텍스트를 숨기고 버튼/필드/리뷰 카드/표의 밀도를 소폭 줄인다. 읽기 가능한 본문 크기는 유지한다.
- 420px 이하에서는 floating dock 위젯을 아이콘 버튼으로 축약해 하단 화면 가림을 줄인다. safe-area-inset-bottom을 반영한다.
- 모바일 패널 크기/확장 상태는 UI 전용이며 분석/재작성/히스토리 데이터 상태와 분리한다.
- 이 버전을 1.1.0 모듈화 전 UI/레이아웃 제품 기준선으로 사용한다. 다음 단계는 기능 추가를 최소화하고 내부 모듈 분리다.
- 결과물 전달 규칙은 전체 통 프로젝트 ZIP + 직전 버전 기준 덮어쓰기 패치 ZIP 두 개를 항상 최종 답변 하단에 제공한다. OPTION/**은 계속 보호한다.


## 제품 버전 정책 (2026-08-15부터)
- 기존 6.x 표기는 개발/legacy 이력으로만 보존하고, 사용자에게 전달하는 제품 버전은 **1.0.0부터 Semantic Versioning 형태**로 표기한다.
- 1.0.x: 버그/레이아웃/성능 안정화. 1.x.0: 호환성을 유지하는 기능/모듈 업그레이드. 큰 호환성 변화는 다음 major로 올린다.
- 1.0.0은 모바일 compact panel + UI/layout freeze + CI 회귀수정까지 포함한 모듈화 전 최종 기준선이다.
- 다음 구조개편 목표 버전은 1.1.0 Modular Core이며 1.0.0의 사용자 UI 계약을 유지한다.
- browser-smoke에서 발견된 회귀: 숨겨진 Typewriter 속도 select를 Playwright가 직접 조작해 timeout, 열린 교정 패널이 rewrite widget 포인터를 가로막는 문제. 1.0.0에서는 테스트 순서를 수정하고 floating dock을 패널보다 위에 유지해 실제 패널 전환도 보장한다.


## 1.1.0 Modular Core · Phase 1
- 1.0.0의 UI/레이아웃 계약을 그대로 유지하고 내부 책임만 분리한다. 화면 재디자인이나 사용자 플로우 변경은 하지 않는다.
- 부팅 순서: `core/event-bus.js` → `core/history-store.js` → `core/work-lock.js` → `core/text-utils.js` → `ui/panel-manager.js` → `features/typewriter-engine.js` → `app.js`. 모든 코어 파일은 assetVersion 쿼리를 공유한다.
- `history-store.js`: Undo/Redo entries/index/restoring/limit/중복 snapshot 판정을 소유한다. app.js는 화면 상태 snapshot/restore만 연결한다.
- `work-lock.js`: 장기 작업 충돌 잠금의 공통 경계. 1차에서는 Typewriter와 자동 업데이트 충돌 방지에 사용한다.
- `event-bus.js`: 내부 `text:changed` 이벤트를 제공한다. 기존 `ai-cleaner:text-changed` DOM CustomEvent는 rewrite-studio 호환을 위해 계속 브리지한다.
- `panel-manager.js`: 패널 open/close/top-close, 모바일 compact/expanded 상태, viewport clamp, drag/resize 위치 저장을 소유한다.
- `typewriter-engine.js`: grapheme 단위 작성 scheduler/rAF/pause/resume/complete 상태를 소유한다. 실제 결과 textarea 적용/검증/히스토리 commit은 app.js의 UI 연결 계층에 남긴다.
- `text-utils.js`: `Intl.Segmenter` 기반 grapheme 분리를 공통 유틸로 이동. Diff와 Typewriter가 동일한 분리 규칙을 사용한다.
- 재작성 엔진과 이미지 분석 엔진은 기존처럼 lazy-load를 유지한다. 모듈화 때문에 초기 로딩에 무거운 엔진을 포함하지 않는다.
- `tests/module-check.mjs`를 추가해 Event Bus, History Store, Work Lock, grapheme 재조립, Typewriter scheduler를 브라우저 없이 단위 검사한다. GitHub Actions static-checks에서 이 검사를 별도 실행한다.
- 1.1.0은 Strangler 방식 1차 분리다. `app.js`의 분석/파일/업데이트/렌더 상태를 한 번에 옮기지 않는다. 다음 단계에서 text engine/file import/update manager/state boundary를 순차 분리한다.
- 외부 앱/사이트에 합성 키 입력을 보내는 기능은 계속 포함하지 않는다. 내부 Typewriter의 안전 경계는 1.0.0과 동일하다.


## 1.1.1 Visible Text Write / Widget Clarity
- X-ray 결과 탭을 제거한다. 숨은 Unicode 진단은 기술 정보 패널에만 남기고, 사용자가 별도 X-ray 화면을 오갈 필요가 없게 한다.
- `자동작성 원본 새로쓰기`는 원본 문자열을 무조건 100% 복제하지 않는다. `sanitizeVisibleTypingSource()`를 먼저 거쳐 U+200B, BOM, BIDI formatting controls, 일반 control 문자처럼 안전하게 제거 가능한 숨은 문자를 제외하고 작성한다.
- NBSP 및 특수 폭 공백은 일반 ASCII space로 정리한 뒤 새로 쓴다.
- ZWJ/ZWNJ/WORD JOINER/Variation Selector/Unicode Tags처럼 문자 결합·이모지 표현 등에 영향을 줄 수 있는 의미 민감 Unicode는 기본 보존한다. 무조건 삭제 금지.
- Typewriter 완료 검증 기준은 원본 raw string이 아니라 위 visible-text projection이다. 원본 진단 metadata는 raw 원문 기준을 유지한다.
- 모바일 420px 이하에서도 floating widget의 이름을 숨기지 않는다. badge만 숨기고 아이콘 + `새 글 재작성` / `교정 제안` / `문장 검토` / `기술 정보` 명칭은 계속 표시한다.
- 중앙 브리지 메뉴명은 `자동작성 원본 새로쓰기`로 고정한다.
- 모바일 compact panel 정책은 1.0.0/1.1.0 계약을 그대로 유지한다.


## 1.2.0 Modular Core · Phase 2
- 1.0.0 이후 고정한 UI/레이아웃 계약을 유지하고 `state boundary / text engine / file import / update manager`를 `app.js` 밖으로 분리한다.
- `core/state-store.js`: 텍스트 작업 상태의 **단일 안정 객체**를 소유한다. `replace/reset` 시 객체 참조 자체를 바꾸지 않아 다른 기능이 오래된 state 객체를 들고 있는 문제를 막는다. `text:changed` 이벤트에는 증가하는 revision을 같이 실어 비동기/Worker 단계의 stale-result 판정 기반으로 사용한다.
- `core/text-engine.js`: 숨은 Unicode/특수 공백 검사, 의미 민감 Unicode 보존, homoglyph 탐지, 문장 분리, 교정 제안 규칙, 위생 점수, 리뷰 추천 계산을 소유한다. UI 설정은 옵션으로 전달받고 DOM을 직접 읽지 않는다.
- `features/file-import.js`: 20MB 제한, 바이너리성 텍스트 거부, RTF `\\uN`, HTML/XML/일반 텍스트 변환을 소유한다. app.js에는 파일 선택과 사용자 알림 연결만 남긴다.
- `services/update-manager.js`: `version.json` polling, update busy, draft 저장/회수, 같은 버전 재로딩 방지, online/visibility/interval 스케줄을 소유한다. UI draft snapshot/restore는 callback으로 주입한다.
- 부팅 순서: `event-bus → history-store → work-lock → text-utils → state-store → text-engine → update-manager → panel-manager → file-import → typewriter-engine → app.js`. rewrite/image 엔진은 계속 lazy-load한다.
- `app.js`는 약 717줄에서 약 578줄로 줄었고, 남은 책임은 화면 렌더/사용자 이벤트/도메인 연결 위주다. 파일만 나눈 가짜 모듈화가 아니라 기존 pure/service 책임을 실제 모듈로 이동했다.
- `tests/module-check.mjs`는 Phase 2 모듈의 상태 객체 identity/revision, Unicode 분석, RTF/바이너리/용량 guard, update draft/reload 준비를 브라우저 없이 검사한다.
- GitHub Actions static-checks는 새 모듈 문법 + module-check + architecture static-check를 모두 실행한다.
- UI 변경 의도 없음: 모바일 compact panel, floating widget 명칭, `자동작성 원본 새로쓰기`, visible-text sanitizer 정책은 1.1.1과 동일하다.
- 다음 구조 단계는 **1.3.0**에서 Diff/분석 계산의 Worker 경계를 준비하거나 render/controller 경계를 더 분리하는 방향. 먼저 1.2.0 browser-smoke가 실제 Push 환경에서 녹색인지 확인한다.
- 결과물 전달 규칙은 계속 고정: 최종 답변 하단에 전체 통 프로젝트 ZIP + 직전 버전 기준 덮어쓰기 패치 ZIP 두 개를 제공하고 `OPTION/**`은 절대 포함/변경하지 않는다.


## 1.2.1 Standalone Typewriter Panel / Visible-Text Result Audit
- `자동작성 원본 새로쓰기` 진행 UI를 결과 카드 내부 overlay에서 제거하고 공통 `floatPanel` 시스템의 독립 `typingPreviewPanel`로 이동한다. 결과 textarea를 덮지 않으며 desktop drag/viewport clamp와 모바일 compact/expanded 정책을 공유한다.
- Typewriter 실행 중 다른 floating widget을 잠가 작업 중 패널이 다른 도구로 바뀌는 충돌을 막는다. 닫기/ESC는 자동 작성을 중지하고 이전 결과를 복원한다.
- 새로쓰기 source는 계속 raw 원본이 아니라 `sanitizeVisibleTypingSource()`의 visible-text projection이다. U+200B/BOM/BIDI controls뿐 아니라 U+00AD SOFT HYPHEN과 U+061C ARABIC LETTER MARK를 안전 제거 대상으로 포함한다.
- NBSP 등 특수 공백은 일반 공백으로 정리한다. ZWJ/ZWNJ/WORD JOINER/Variation Selector/Unicode Tags처럼 실제 표시 형태에 영향을 줄 수 있는 의미 민감 문자는 계속 보존한다.
- 완료 시 strict equality에 더해 결과를 visible sanitizer로 재검사하며, 안전 제거 대상/특수 공백 잔여가 0개일 때만 commit한다. 팝업에 `결과 안전 제거 대상 0개`를 표시해 원본 기술 진단과 최종 결과 상태를 구분한다.
- `표준` 정리 강도는 안전한 숨은 표식 + 특수 공백 자동 정리가 기본이다. 이 기능은 특정 AI detector/provenance/watermark 우회용이 아니며 출처/보안 표식을 무조건 삭제하지 않는다.
- 다음 구조 단계는 1.3.0 Modular Core Phase 3. UI 계약은 1.2.1을 기준으로 유지한다.


## 1.2.2 Old-v6 Layer A Hygiene Inventory
- 사용자 제공 `곰같은여우_ai_흔적지우개_v6.html`의 Layer A 문자 사전을 현재 공통 Unicode hygiene policy로 흡수한다. old-v6의 ZWSP/BOM/BIDI controls/특수 공백 항목명을 유지해 기술 정보에서 어떤 코드가 발견됐는지 명확히 보인다.
- `core/text-utils.js`의 `classifyTextCodePoint()`가 단일 정책 소스다. Typewriter visible-text sanitizer와 `core/text-engine.js` 스캔이 같은 classifier를 사용해 서로 다른 정리 결과가 생기지 않게 한다.
- old-v6는 ZWNJ/ZWJ/WORD JOINER/Variation Selector를 무조건 삭제했지만 1.2.2에서는 그렇게 하지 않는다. 문자 결합·이모지·줄바꿈 의미에 영향을 줄 수 있는 항목은 `의미 민감 문자`로 보존한다.
- 안전 정리 대상은 ZWSP/BOM/BIDI formatting controls, SOFT HYPHEN, ARABIC LETTER MARK, 일반 비표시 control이며 특수 폭 공백은 ASCII space로 정규화한다. OGHAM SPACE MARK도 특수 공백 확장으로 포함한다.
- 기술 정보 요약은 `원본 발견 / 자동 정리 / 의미상 보존 / 결과 잔여` 4개를 분리한다. `결과 잔여`는 현재 결과 문자열을 visible-text sanitizer로 다시 검사한 안전 제거/특수 공백 잔여 수다.
- 진단 JSON에도 정책 버전과 동일 audit를 내보낸다.
- old-v6 Layer B의 문체 패턴/생성형 표현 휴리스틱은 실제 삽입 워터마크로 간주해 자동 삭제하지 않는다. 텍스트 위생과 문체 편집을 분리한다.
- 자동작성 원본 새로쓰기는 계속 `raw 원본 → visible-text projection → grapheme 단위 setRangeText → 결과 residue 0 검사` 순서다. 외부 키 이벤트/합성 입력은 사용하지 않는다.


## 1.3.0 Modular Core Phase 3
- 외부 UI 계약은 1.2.2와 동일합니다.
- 신규 경계: `core/diff-engine.js`, `services/analysis-coordinator.js`, `ui/diff-view.js`.
- 라이브 분석은 가장 최근 입력만 적용합니다. Worker는 아직 활성화하지 않았으며 Coordinator executor를 다음 단계에서 Worker adapter로 교체할 수 있습니다.
- Diff 계산은 DOM에서 분리되었고 최대 LCS 범위를 넘는 대형 문서는 선형 fallback을 사용합니다.
- 다음 권장 단계: 1.3.x 안정화 후 1.4.0에서 worker-safe analysis kernel 또는 dedicated Worker adapter 도입.

### 1.3.0 validation note
- Static/architecture: 100 passed / 0 failed.
- Module unit checks and JS syntax pass.
- Local Playwright was not claimed as passed: npm dependency installation timed out in the build environment. Re-check `browser-smoke` after pushing.


## 1.3.1 Stability Audit
- 패치 기준선은 직전 실제 전달물 `AI_Cleaner_1_3_0_FULL_PROJECT_HANDOFF.zip`이다. 중간 작업 폴더를 기준으로 패치를 만들지 않는다.
- Update Manager는 Semantic Versioning으로 비교해 현재보다 큰 버전만 적용한다. stale `version.json`이 1.2.x를 반환해도 1.3.1에서 다운그레이드성 reload를 하지 않는다.
- rewrite/image lazy-load 실패는 캐시에서 제거되어 같은 세션에서 재시도 가능하다.
- Typewriter pause는 rAF idle 상태가 되며 resume 시 frame 하나만 다시 예약한다. visible-text projection 및 residue 0 검증 정책은 그대로다.
- 업데이트 draft의 직접 수정 결과는 suggestion baseline과 편집 상태를 함께 복원한다.
- 커스텀 우클릭 메뉴는 textarea/text input에서만 사용한다. 일반 페이지 영역은 브라우저 기본 context menu/선택/drag 동작을 방해하지 않는다. direct typing verifier의 별도 입력 차단은 유지한다.
- pagehide에서 live analysis 예약과 update polling을 정리한다.
- PROJECT_STATE runtime/handoff 버전 consistency를 static-check에서 검사한다.
- 다음 구조 단계는 1.4.0 Worker-safe Analysis Adapter. 먼저 1.3.1 browser-smoke를 확인한다.

## 1.4.0 Worker-safe Analysis
- 외부 UI 계약은 1.3.1과 동일하다. 이번 버전은 장문 자동분석 계산 경계를 Worker로 실제 이전하는 성능/구조 패치다.
- `services/analysis-worker-adapter.js`가 Worker lifecycle, request routing, cancel, main-thread fallback을 소유한다. 기본 Worker 임계값은 6,000자(UTF-16 length 기준)다.
- `workers/text-analysis-worker.js`는 `core/text-utils.js`와 `core/text-engine.js`를 `importScripts()`로 재사용한다. Worker 전용 분석 규칙 복제본을 두지 않는다.
- `text-utils.js`/`text-engine.js`는 `globalThis` 호환이다. 동일 Unicode hygiene policy와 교정 규칙이 window/Worker 양쪽에 적용된다.
- `analysis-coordinator.js`는 async executor를 지원하며 token 기반 latest-only guard를 Promise 완료 후에도 검사한다. 이전 입력 결과가 새 입력을 덮지 않는다.
- 입력 중 자동분석은 장문일 때 Worker를 사용한다. 수동 즉시 분석과 Typewriter 원본 metadata sync는 순서 의존성을 피하기 위해 sync executor를 유지한다.
- Worker를 사용할 수 없거나 Worker가 실패하면 main-thread `textEngine.analyze()`로 자동 fallback한다. 기능 사용 자체가 Worker 지원 여부에 의존하지 않는다.
- 새 입력으로 stale Worker 작업이 생기면 pending Worker를 terminate한다. pagehide에서도 Worker를 종료한다.
- 다음 권장 단계는 1.4.1에서 실제 GitHub Actions browser-smoke 결과를 기준으로 Worker/브라우저 안정성 점검 후, 필요하면 threshold/상태 표시를 미세 조정한다.

### 1.4.0 validation note
- Static/architecture: 117 passed / 0 failed.
- Module unit checks, all JavaScript syntax checks, and GitHub Actions YAML parse pass.
- Browser E2E now includes a >6,000-character live-analysis case that verifies Worker success when supported and fallback otherwise.
- Local Playwright was not claimed as passed: `npm install --ignore-scripts --no-audit --no-fund` timed out at 120 seconds in this build environment. `node_modules` and `package-lock.json` were removed; verify `browser-smoke` after push.

## 1.4.1 Worker Stability Audit
- Patch baseline is the actually delivered `AI_Cleaner_1_4_0_FULL_PROJECT_HANDOFF.zip`.
- `analysis-worker-adapter.js` now has a 20,000ms job timeout. A Worker that stops responding is terminated and its pending analysis is recovered through the existing main-thread executor.
- Worker infrastructure failures enter a 15,000ms circuit-breaker cooldown so a broken Worker is not recreated on every long live-analysis attempt. User-driven supersede/cancel does not trigger cooldown.
- Worker handlers are bound to the concrete Worker instance and detached before termination. Late `error` events from an old Worker cannot affect a newer replacement instance.
- `messageerror` is handled as an infrastructure failure and falls back safely. `postMessage` failures use the same terminate/fallback recovery path.
- Fallback calls are Promise-wrapped so synchronous exceptions are surfaced as rejected analysis Promises instead of escaping `analyze()` unexpectedly.
- `analysis-coordinator.js` now clears idle state even without `cancelIdleCallback` and runs immediately if `requestIdleCallback` scheduling throws.
- Worker threshold remains 6,000 UTF-16 code units. Manual immediate analysis remains on the synchronous main-thread path; only scheduled live analysis uses the Worker adapter.
- No UI contract changes: mobile compact panels, widget labels, visible-text `자동작성 원본 새로쓰기`, text hygiene counters, and old-v6 Layer A safe policy are unchanged.
- Validation: module checks PASS, static/architecture 120 passed / 0 failed, JavaScript syntax PASS, workflow YAML PASS. Local browser smoke is not claimed until Playwright dependencies install successfully; verify GitHub Actions `browser-smoke` after push.
- Next recommended structural step: 1.5.0 large-document performance/Worker tuning after 1.4.1 browser-smoke is green.
- Local browser validation note: `npm install --ignore-scripts --no-audit --no-fund` timed out at the 120-second execution limit in this environment. It was not retried; any partial `node_modules` / `package-lock.json` was removed. Do not claim local Chromium E2E passed.


## 1.4.2 Boot Readiness / Browser Smoke Fix
- Root cause from GitHub Actions run 31889020366: `DOMContentLoaded` occurred before the asynchronous core/app script chain completed. `boot-ready` exposed the UI too early, so E2E could read `window.AICleanerApp` before creation and could fill the long-text input before its live-analysis handler was attached.
- Introduces an explicit app-ready contract: `window.__AI_CLEANER_APP_READY__ === true`, `html.app-ready`, `window.AICleanerApp.ready === true`, and `ai-cleaner:ready`. These are published only after `app.js` load completes and the app object exists.
- During the visible-but-not-yet-ready interval, `body.inert=true` and `aria-busy=true` block real interaction. At ready they are cleared. A boot failure remains non-interactive and is marked `html.app-boot-failed` instead of pretending readiness.
- Browser E2E uses a common readiness-aware navigation helper before every test. This directly fixes the 1.4.1 foundation-module race and the >6000-character Worker test that previously left output empty because the input event handler was not wired yet.
- No Worker tuning or UI contract change in 1.4.2; this is a boot lifecycle correctness patch.

- 1.4.2 validation: module checks PASS, static/architecture 124 passed / 0 failed, JavaScript syntax PASS, workflow YAML PASS. Local Playwright/Chromium setup timed out at the 120-second execution limit and was not retried; partial install/test artifacts were removed. GitHub Actions `browser-smoke` remains the final browser verification.


## 1.5.0 Large-document Performance Governor
- 1.4.2 GitHub Actions `browser-smoke` green을 기준선으로 사용한다. 패치는 실제 전달된 `AI_Cleaner_1_4_2_FULL_PROJECT_HANDOFF.zip`에서 만든다.
- 신규 `services/analysis-performance-governor.js`가 live-analysis debounce를 소유한다. 문서 길이, 빠른 연속 입력 burst, 최근 실제 분석시간 EMA를 조합해 다음 자동분석 대기시간을 조절한다.
- 수동 `분석`은 기존처럼 즉시 main-thread sync 분석이다. Governor는 입력 중 자동분석에만 적용한다.
- `core/text-engine.js`는 분석 결과에 가벼운 `reviewMeta` 요약을 포함한다. Worker 결과만으로 문장 검토 후보 수와 overflow를 먼저 알 수 있어, 숨겨진 리뷰 패널 DOM을 즉시 만들 필요가 없다.
- 자동분석 결과 적용 시 `교정 제안`, `문장 검토`, `기술 정보` 패널이 닫혀 있으면 내부 DOM 렌더를 지연한다. 사용자가 해당 위젯을 열 때 최신 상태로 생성한다.
- 접힌 `상세 진단`의 전/후 비교는 접힌 동안 장문 전체를 재스캔하지 않고, 펼칠 때 최신값을 계산한다. 입력 통계는 기존 batch 경로로 갱신한다.
- Worker threshold 6,000자, 20초 timeout, 15초 cooldown, stale-result guard, 1.4.2 app-ready 계약은 변경하지 않는다.
- Unicode hygiene, visible-text `자동작성 원본 새로쓰기`, 모바일 compact panel, rewrite/image lazy-load UI 계약도 변경하지 않는다.
- 1.5.0 로컬 정적/모듈 기준: static 129/0, module PASS. 최종 브라우저 확인은 Push 후 GitHub Actions `browser-smoke`. 로컬 Playwright 의존성 설치는 120초 실행 제한에서 timeout되어 재시도하지 않았고 부분 설치 파일은 제거했다.
- 다음 권장 단계: 1.5.1에서 성능 Governor/lazy rendering의 실브라우저 안정성만 점검한 뒤 다음 기능 단계로 이동한다.
\n\n## 1.5.1 Cohesion & Integrity Stability Audit\n- 패치 기준선은 실제 전달된 `AI_Cleaner_1_5_0_FULL_PROJECT_HANDOFF.zip`이다. 중간 작업 폴더가 아니라 직전 전달물을 기준으로 diff/패치를 만든다.\n- 원본이 수정되어 자동분석이 대기 중인 상태를 명시적인 **stale result boundary**로 취급한다. 결과에 `원본 변경됨` 상태를 표시하고 복사/TXT/직접수정/전체되돌리기/Diff/Undo/Redo처럼 이전 분석 결과를 소비하는 액션을 최신 분석 전까지 잠근다.\n- `입력 중 자동 분석`을 끈 사용자도 결과를 갱신할 수 있도록 원본 카드에 보이는 `지금 다듬기` 버튼을 복구했다. 재작성 도구가 최신 결과가 필요할 때는 방어적으로 동기 분석한다.\n- Update Manager는 분석 예약/실행 중 버전 reload를 시작하지 않는다. draft에는 `analysisFresh`와 `outputBasis`를 저장하며, 복원 시 새 원본과 짝이 맞지 않는 오래된 결과는 버리고 최신 원본을 다시 분석한다.\n- `pagehide`에서 Worker/예약 분석/update polling/Typewriter를 정리하고, BFCache `pageshow.persisted` 복원 시 패널 위치, update polling, dirty live-analysis/stat 갱신을 다시 연결한다.\n- Rewrite Studio는 generation token을 사용한다. 새 생성/reset/기준 글 변경/패널 종료가 이전 비동기 generation보다 우선하며, 오래된 작업은 초안을 뒤늦게 쓰지 못한다. 생성 중 옵션/탭은 잠그고 이전 progress hide timer도 격리한다.\n- 재작성 기준이 `현재 결과`여도 원본이 바뀌면 결과가 곧 갱신될 종속 관계를 감안해 기존 초안을 즉시 stale-lock한다. 장문 입력 이벤트에서는 매 키마다 전체 source hash를 다시 계산하지 않고 가벼운 invalidation만 수행하며, 실제 hash 검증은 open/apply/validation 같은 명시 경로에 남긴다.\n- Typewriter는 dirty 원본에서 시작하기 전에 최신 동기 분석을 먼저 확정한다. 진행 중 `Esc`로 자동작성 패널을 닫으면 창만 사라지는 것이 아니라 작업도 중지하고 현재 원본의 직전 결과로 복원한다. Rewrite 패널을 Esc/닫기/다른 패널 전환으로 닫을 때도 진행 중 generation을 취소한다.\n- 데스크톱 floating panel clamp는 `topMin` 예약 영역과 화면 하단을 동시에 고려한다. 저장된 큰 패널/resize/drag가 화면 아래로 탈출하는 경우를 줄였다. 패널 위젯의 `aria-controls`/`aria-expanded`도 실제 패널 visibility와 동기화한다.\n- 연속 toast의 이전 hide timer가 새 toast를 가리지 않도록 timer를 분리했다. 1.5.0 lazy review rendering은 전체 후보 수와 실제 렌더 subset 수를 별도로 유지해 위젯 숫자와 패널 DOM이 어긋나지 않도록 보강했다.\n- 1.5.1 최종 로컬 검증: static 140/0, module/integration PASS, 전체 JS/MJS syntax PASS, workflow YAML PASS. 로컬 Playwright 의존성 설치는 120초 실행 제한에서 timeout되어 재시도하지 않았고 부분 설치 파일을 제거했다. Push 후 GitHub Actions `browser-smoke`를 실제 Chromium 최종 검증으로 사용한다.\n

## 1.5.2 Browser Regression Alignment
- 1.5.1 GitHub Actions `browser-smoke`는 10개 중 9개가 통과했고, foundation rewrite 흐름 1개만 실패했다. 실패 시 `rewriteApply`는 이미 disabled였지만 `rewriteValidation`은 `아직 만든 초안이 없습니다.`였다.
- 원인은 1.5.1 Rewrite Studio가 generation token/`requestAnimationFrame` 기반 비동기 transaction으로 바뀌었는데 foundation E2E가 두 번째 `rewriteGenerate` 완료를 기다리지 않고 즉시 원본을 변경한 것이다. 원본 변경 이벤트가 정상적으로 in-flight generation을 취소해 draft가 비게 되었으므로 런타임 보호 로직은 의도대로 작동했다.
- 1.5.2 foundation E2E는 generation 시작(`aria-busy=true`)과 완료(`aria-busy=false`), 완성 draft, enabled apply를 확인한 뒤 원본을 변경하고 completed-draft stale-lock 메시지를 검증한다.
- 별도 E2E는 generation 진행 중 원본 변경을 실행해 `기준 글이 바뀌어 생성 작업을 취소했습니다.` 상태, 빈 draft, disabled apply를 검증한다. resetSession 취소/current-result dependency stale-lock 테스트도 유지한다.
- 런타임 앱/Rewrite Studio/Worker/UI/Unicode 정책은 변경하지 않는다. 브라우저 회귀 테스트만 실제 비동기 transaction 계약에 맞춘다.
- 패치 기준선은 실제 전달된 `AI_Cleaner_1_5_1_FULL_PROJECT_HANDOFF.zip`이며 `OPTION/**`은 계속 보호한다.
- 1.5.2 로컬 검증: static 142/0, module PASS, JS/MJS syntax PASS, workflow YAML PASS. Playwright 의존성 설치는 120초 제한에서 timeout되어 재시도하지 않았고 부분 설치 파일을 제거했다. Push 후 GitHub Actions `browser-smoke`에서 11개 테스트를 최종 확인한다.



## 1.6.0 UX Navigation & Visual Comfort
- 패치 기준선은 실제 전달된 `AI_Cleaner_1_5_2_FULL_PROJECT_HANDOFF.zip`이다.
- 모바일 `자동작성 원본 새로쓰기` 완료 시 floating panel이 결과를 가리지 않도록 완료 후 결과 카드로 자동 이동한다. 이동 목표는 textarea 중앙이 아니라 `#resultCard`이며 sticky top header 아래에 카드 제목이 보이도록 scroll margin을 둔다.
- Typewriter 완료 시 `일시정지` 버튼은 `완료 · 결과 보기` 액션으로 바뀐다. 사용자가 누르면 자동 이동 타이머를 취소하고 즉시 패널을 닫은 뒤 결과 위치로 이동한다. 누르지 않으면 짧은 완료 확인 시간 후 자동 이동한다.
- 완료 패널과 결과 도착 카드에 성공 상태 시각 피드백을 추가하되 `prefers-reduced-motion`에서는 이동/강조 모션을 줄인다.
- Typewriter sanitation/verification, Worker, Rewrite Studio, Fact Lock, stale-result/update lifecycle 정책은 변경하지 않는다.
- Browser E2E는 완료 버튼 수동 이동과 자동 이동을 별도로 검증하며 sticky header 아래 결과 카드 착지 위치도 검사한다. 420px 이하 wrapped header의 실제 높이와 결과 액션 2열 밀도도 함께 회귀검사한다.
- 완료 후 다른 floating panel을 사용자가 먼저 열면 pending result-navigation timer를 취소해 사용자 의도를 우선한다. 로컬 Playwright 설치는 120초 제한 timeout으로 미실행이며 GitHub browser-smoke를 최종 검증으로 사용한다.


## 1.6.1 Mobile UI/UX Exception Audit
- Baseline is the actually delivered `AI_Cleaner_1_6_0_FULL_PROJECT_HANDOFF.zip`; the user confirmed 1.6.0 GitHub `browser-smoke` green before this patch.
- Mobile viewport handling now combines CSS `dvh` with runtime `visualViewport.height` (`--app-visual-height`). Floating panels are capped to the currently visible viewport during browser chrome/keyboard height changes.
- `viewport-fit=cover` and safe-area insets are applied to the sticky header, page wrapper, floating panel sides/bottom, floating dock, and toast. Landscape left/right notch insets are included.
- Near-1x visual viewport shrink detects the software-keyboard state. Panels use more of the remaining visible area and the focused field inside a floating panel is kept within its scroll body after viewport changes.
- Panel Manager clears stale `mobileExpanded` state when crossing the mobile breakpoint. Mobile opens no longer falsely consume the pending desktop default-position state; a visible panel crossing to desktop can establish and clamp its anchor position correctly.
- Delayed Typewriter result auto-navigation now yields to explicit user interaction. Pointer/wheel/keyboard activity or choosing another floating panel cancels the pending jump. Page suspension clears navigation/feedback timers as well.
- E2E contract grows to 17 cases with user-intent cancellation, mobile visible-viewport bounds, and breakpoint expansion reset coverage.
- Local static validation: 153/0; module/integration PASS; JS/MJS syntax PASS; workflow YAML PASS. The single local `npm install --ignore-scripts --no-audit --no-fund` attempt timed out at 120 seconds and was not retried; partial install/test artifacts were removed. GitHub `browser-smoke` is the final real-Chromium validation.
- If 1.6.1 browser-smoke is green, the 1.6.x mobile exception/stability cycle can be closed and the next feature/UX phase can start at 1.7.0.


## 1.6.2 Deep Integration & Lifecycle Safety Audit
- Baseline is the actually delivered `AI_Cleaner_1_6_1_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected and excluded.
- Rewrite Studio session recovery is now one-time per loaded Studio instance. Rapid close/reopen before the 120ms draft debounce can no longer reload an older session snapshot over the newest in-memory draft.
- Rewrite generation acquires the shared `rewrite-generation` Work Lock. Switching to another top-level tool or suspending the page cancels in-flight generation, releases the lock, and flushes the latest rewrite session.
- Update Manager now aborts/invalidate in-flight checks on `stop()`, re-checks active work after fetch and before reload, refuses automatic reload when captured-draft persistence fails, and clears the reload guard when `location.replace()` throws so a later check can retry.
- Delayed Typewriter result navigation now yields to plain `input` events as well as pointer/wheel/keyboard intent. This covers IME/dictation/autofill-style input-only flows.
- Touch-capable devices use the OS-native editor context menu for normal text fields; the original-direct-write verifier keeps its independent paste/drop/synthetic-input blocking.
- Transient result/rewrite visual timers are isolated and page suspension clears their classes/timers. JSON diagnostic export now refreshes stale analysis before producing a report.
- Browser E2E configuration is 21 cases; static architecture checks are 163/0 and module checks PASS. The single local Playwright dependency-install attempt timed out at 120 seconds, was not retried, and partial install artifacts were removed. GitHub `browser-smoke` remains the final Chromium gate.

## 1.6.3 Functional Wiring & Source Pipeline Audit
- Baseline is the actually delivered `AI_Cleaner_1_6_2_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected.
- Sample, text-file import, update restore, and real input are routed through a shared source-mutation boundary so dirty/freshness state, result-navigation cancellation, statistics/widgets, rewrite invalidation, and analysis scheduling cannot drift between input origins. Sample has explicit browser regression coverage and success feedback.
- Synchronous/manual analysis now has a recovery boundary: the source is retained, stale state remains actionable, performance shows `오류`, and the user gets a visible message if analysis throws.
- All static buttons and dynamically rendered issue action buttons explicitly use `type="button"`.
- Image analysis is awaited by the app, uses per-run shared Work Locks, can be cancelled on tool/page lifecycle changes, has decode/Exif/C2PA time bounds, and no longer leaves a stale “engine preparing” message for rejected files.
- Direct-write verification keeps progress across Rewrite Studio tab/panel round trips while the original is unchanged, resets on original change, and blocks automatic update while trusted direct-typing progress exists because that progress is not serialized across reloads.
- Browser E2E is configured for 26 cases. Local static 170/0, module PASS, JS/MJS syntax PASS, workflow YAML PASS. System Chromium cannot access local/private HTTP origins in this execution environment; GitHub Actions `browser-smoke` remains the final browser gate.



## 1.6.4 UX Flow Simplification / Typewriter Next-Step Navigation
- Patch baseline is the actually delivered `AI_Cleaner_1_6_3_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected/excluded.
- The visible `지금 다듬기` button is removed from the source card. It duplicated live analysis and freshness-aware internal analysis paths. `analyze()` remains available internally through `AICleanerApp.analyzeNow()` and `ensureFreshAnalysis()` so stale-safe copy/rewrite/typewriter flows do not lose their refresh boundary.
- When live analysis is disabled and the source becomes stale, the status now says `원본 변경됨 · 다음 작업에서 자동 갱신` instead of instructing the user to find a removed manual button.
- `자동작성 원본 새로쓰기` is disabled while no source exists. As soon as source text arrives through typing/paste, Sample, file import, or update restore, it becomes a highlighted next-step action with `다음 단계 · 눌러서 새로쓰기`. The cue does not continually restart on every keystroke.
- Source mutation immediately clears any previous `data-typewriter-verified` marker so a new source cannot temporarily inherit an old visible-text verification state.
- Starting `자동작성 원본 새로쓰기` now opens the progress panel and immediately aligns the viewport to the result card, while keeping the progress panel open. The result card gets a temporary `자동작성 중` state so the user sees the output being written in place. Completion behavior (`완료 · 결과 보기`, mobile auto-close/navigation, user-intent cancellation) remains intact.
- Browser coverage adds the source-arrival recommendation and immediate-start navigation case. Existing manual-analysis test paths now invoke the internal analysis API rather than depending on removed UI.
- Local validation before packaging: static/architecture 173 passed / 0 failed, module PASS, JS/MJS syntax PASS, workflow YAML PASS. GitHub Actions `browser-smoke` remains the real Chromium gate after push.


## 1.6.5 Async Intent & UX Guidance
- Baseline is the actually delivered `AI_Cleaner_1_6_4_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected/excluded.
- GitHub Actions 1.6.4 browser-smoke exposed one real async navigation race and two stale test assumptions. Rewrite lazy-open is now tokenized: selecting another panel/tool or suspending the page invalidates an older pending `ensureRewriteStudio()` open request, so a late script load cannot reopen Rewrite Studio over newer navigation intent.
- In-flight rewrite-generation E2E now waits for `aria-busy=true` before tool switching; a separate delayed-lazy-load test covers the pending-open race.
- The mobile input-intent test no longer assumes the freshness pill stays visible after the automatic analysis window; it verifies the delayed result jump remains cancelled and the changed source remains intact. Sample textarea output uses a value matcher rather than DOM textContent.
- Hero copy now explicitly tells users to press `자동작성 원본 새로쓰기` when they want the source to be written from the beginning in the result field. The footer explains that this is an internal result-textarea progressive-writing feature, not synthetic external keyboard input.
- The same intent-token audit now covers image lazy loading. If a selected image is still waiting for `image-analyzer.js` and the user leaves the image tool, that pending run becomes stale, cannot begin hidden analysis after the script arrives, and releases its shared Work Lock.
- On mobile, Sample / File / Reset stay on one compact row. Result `정리본 / 변경 비교` tabs stay on the same header row at the right, including while the stale/freshness status is visible.
- Local validation: static 179/0, module PASS, JS/MJS syntax PASS, workflow YAML PASS. Browser E2E is configured for 30 cases; GitHub `browser-smoke` is the final Chromium validation after push. A direct system-Chromium file-render attempt did not complete within 20 seconds in this execution environment.
- Next planned patch after green CI: 1.6.6 UX Priority & Completion Flow Audit.


## 1.6.6 UX Priority & Completion Flow Audit
- Baseline is the actually delivered `AI_Cleaner_1_6_5_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected/excluded.
- Source-stage visual priority is explicit: while a source is present and `자동작성 원본 새로쓰기` is still the recommended next step, the floating Rewrite Studio widget remains available but does not compete with its `rewriteReady` attention cue. After a verified Typewriter completion, Rewrite Studio may surface as the next optional action.
- Result cards now include a compact state-aware next-step guide for analysis pending, normal result ready, Typewriter writing, and verified Typewriter completion. It points users toward copy/TXT save and optional rewrite without adding another duplicate action button.
- Result cleaned/diff controls use `tablist`/`tab`/`tabpanel` semantics and runtime `aria-selected` synchronization. The text-file action receives a visible `focus-within` ring for keyboard users.
- TXT download now provides immediate visible feedback after the browser download is triggered. History actions are visually demoted relative to Copy/Save while retaining their existing positions and behavior.
- Browser coverage adds staged priority and result-tab accessibility state checks, including left/right keyboard navigation. Worker, Unicode hygiene, Typewriter sanitation, Rewrite Fact Lock, image analysis, update lifecycle, and mobile viewport policies are unchanged.
- The 1.6.5 baseline was verified green on GitHub Actions run `31954107010` (static-checks + browser-smoke) before finalizing this patch. 1.6.6 local validation: static 184/0, module PASS, all JS/MJS syntax PASS, workflow YAML PASS; browser E2E is configured for 31 cases and GitHub Actions remains the final Chromium gate.


## 1.6.7 Final UX & Edge-Case Audit
- Baseline is the actually delivered `AI_Cleaner_1_6_6_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected/excluded. GitHub Actions run `31955705356` for 1.6.6 completed green for both static-checks and browser-smoke before this patch was finalized.
- Mobile Typewriter completion cleanup now cancels the delayed result-navigation timer during workspace reset and clears transient completion/result destination state. Reset can no longer be followed by a stale empty-result scroll.
- Exact Typewriter verification is now treated as a property of the current result, not a permanent source flag. Manual result edits, issue/review application, Rewrite Studio application, initial-result restore, and user history navigation invalidate `data-typewriter-verified`. Typewriter cancellation/failure restores the previous result without suppressing the source-stage cue.
- Once the user intentionally edits a result through a downstream path, `자동작성 원본 새로쓰기` remains available but is demoted to `필요할 때 새로쓰기` instead of reappearing as the primary next step. The result guide uses a separate customized-result state. Safe update draft restoration preserves this recommendation state and only restores exact Typewriter verification when the saved output still equals the sanitized visible-text projection of the saved source.
- Text-file import now has a latest-intent sequence token and a per-request shared Work Lock. An older slow file read cannot overwrite a newer file selection, Sample action, direct source input, Typewriter start, reset, or page lifecycle intent.
- Text files at or above the 6,000-character Worker threshold no longer use immediate synchronous `analyzeNow`; they schedule immediate coordinated background analysis even when live scan is off. Small file imports keep the existing immediate sync result path.
- Download links are briefly attached to the DOM before click and removed afterward, with delayed object-URL cleanup for broader mobile/browser compatibility. A dedicated 320px media guard and E2E scenario cover very narrow source/result header overflow.
- Browser E2E configuration increases from 31 to 36 cases. New cases cover verified-result invalidation, completion-reset timer cleanup, stale async text-file reads, large-file background Worker analysis, and 320px layout containment. Local static architecture checks are 192/0 and module checks PASS. System Chromium is installed but localhost is blocked by the execution environment's organization policy, so GitHub `browser-smoke` remains the final real Chromium gate.
- If 1.6.7 browser-smoke is green, close the 1.6.x stabilization cycle and start the next feature phase at 1.7.0.

## 1.7.0 Result Checkpoint Workspace
- 패치 기준선은 실제 전달된 `AI_Cleaner_1_6_7_FULL_PROJECT_HANDOFF.zip`이다. `OPTION/**`은 계속 보호/제외한다.
- 결과 카드 아래에 독립적인 `☆ 현재 결과 보관 / 보관함 N` 빠른 작업 행을 추가한다. 기존 복사/TXT/직접수정/Undo 액션의 우선순위와 모바일 2열 배치는 유지한다.
- 신규 `features/result-checkpoint-store.js`가 체크포인트 목록, 중복 갱신, 최대 개수, 세션 복원, 삭제/전체비우기, 원본 지문 계산을 소유한다. 메인 앱은 UI/현재 원본 연계만 담당한다.
- 체크포인트는 현재 브라우저 탭의 `sessionStorage`에 최대 8개 저장한다. 저장소 접근이 차단되거나 quota 오류가 발생하면 현재 메모리 목록은 유지하되 UI에서 새로고침 시 사라질 수 있음을 알린다.
- 항목당 최대 300,000자, 전체 체크포인트 텍스트 예산 600,000자를 적용한다. 전체 예산을 넘으면 오래된 항목부터 제거해 update draft / Rewrite Studio session과 sessionStorage 공간을 과도하게 경쟁하지 않게 한다.
- 각 체크포인트는 원본 전체를 중복 저장하지 않고 이중 해시+길이 지문을 저장한다. 현재 원본이 동일하고 최신 분석 상태일 때만 `결과로 복원`이 활성화된다. 다른 원본에서는 복원은 잠그고 복사/삭제만 허용한다.
- 동일 원본+동일 결과를 다시 저장하면 중복 항목을 만들지 않고 최근 항목으로 갱신한다. 저장 라벨은 자동작성 완료/직접 수정/현재 history 작업명을 활용한다.
- 보관함 복원은 Typewriter exact-verification을 무효화하고 현재 결과 history에 새 복원 단계를 기록한 뒤 기존 결과 reveal/focus 흐름을 재사용한다.
- Browser E2E는 체크포인트 저장→수정 버전 추가→이전 결과 복원→원본 변경 시 복원 잠금, 그리고 같은 탭 새로고침 뒤 목록 유지/빈 원본 복원 잠금을 검증한다.
- 로컬 검증: static 197/0, module PASS, 전체 JS/MJS syntax PASS, workflow YAML/JSON PASS. Browser E2E는 38개 구성. 2026-08-17 작업 시작 시 GitHub에서 확인되는 최신 AI Cleaner CI는 1.6.6 run `31955705356` GREEN이며 1.6.7 push run은 아직 보이지 않았다.


## 1.8.0 AI Writing OS Static Embed
- Baseline is the actually delivered `AI_Cleaner_1_7_0_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected/excluded.
- Added a third top-level tool `AI 글쓰기 OS`, fully separate from the existing text-cleaner and image-inspection workspace states.
- Migrated the user-provided `AI_COMPANY_OS_HUB_V1_EMBED 1.0.0` flow into the existing AI Cleaner UI/UX: ChatGPT/Claude/Gemini/Grok/Meta AI selection, free task input, automatic channel routing, workforce mode, Task Pack generation/preview/copy/download, provider launch, Portable OS ZIP, and browser-local preferences.
- Because the live product is GitHub Pages, the uploaded Node `/api/*` and Remote MCP server cannot run in the current deployment. The UI does not invent a fake MCP URL. The real static delivery path is Task Pack then public OS ZIP. The source integration contract is retained for a future authenticated server/reverse-proxy implementation.
- Public-repository privacy boundary: the uploaded personalized `01_OWNER_PROFILE.md` is replaced by a generic public runtime profile, and a sanitized `AI_COMPANY_OS_V6_1_PUBLIC.zip` is built for download. User preferences stay in `localStorage` and are included in Task Packs only; the UI tells users not to store secrets/API keys/tokens there.
- New browser module: `js/features/ai-writing-os.js`. Public runtime assets live under `ai-writing-os/`. Existing Worker, Unicode hygiene, Typewriter, Rewrite Studio, image analysis, result checkpoints, and update lifecycle are not reused as OS state and remain isolated.
- Mobile top navigation supports three equal tools; OS cards/provider/actions follow the existing responsive card/button/focus language.
- Local architecture validation during implementation: static 211/0 and module PASS before final package verification. Browser E2E is configured for 40 cases, adding AI Writing OS Task Pack generation plus cross-tool state isolation/mobile navigation coverage.

## 1.8.1 AI Writing OS Simple Start & Practical Audit
- Baseline is the actually delivered `AI_Cleaner_1_8_0_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected/excluded.
- The AI Writing OS default screen is reduced to a non-technical three-step path: `원하는 글 적기 -> AI 고르기 -> 글쓰기 준비`. The generated result then exposes `요청문 복사` and `선택 AI 열기` as the two primary completion actions.
- Workforce mode, route diagnostics, local profile preferences, Portable OS ZIP, full generated Markdown preview, and Markdown download are still available but moved behind collapsed advanced/detail controls.
- The primary prepare action is disabled until a request exists. ChatGPT remains the default provider; provider hints now explain the immediate user action instead of static-delivery implementation details.
- A prepared request is invalidated immediately when task/provider/mode/profile inputs change. The same invalidation aborts any preparation already in progress, preventing an older provider/profile Task Pack from appearing after a newer choice.
- AI Writing OS preparation now uses `AbortController` plus a per-run shared Work Lock. Leaving the top-level writing tool aborts preparation, stale completion is ignored, and auto-update waits while preparation is active.
- Provider launch happens immediately on the click path to preserve browser popup user activation; clipboard copy is attempted after launch and popup blocking receives explicit feedback.
- Local validation target: static 215/0, module PASS, JS/MJS syntax PASS, JSON/YAML PASS, browser E2E 43 cases. GitHub `browser-smoke` remains the final interactive Chromium gate after push.

## 1.8.1 AI Writing OS Simple Start & Practical Audit
- Baseline is the actually delivered `AI_Cleaner_1_8_0_FULL_PROJECT_HANDOFF.zip`; `OPTION/**` remains protected/excluded.
- The AI Writing OS default screen is reduced to a non-technical three-step path: `원하는 글 적기 -> AI 고르기 -> 글쓰기 준비`. The generated result then exposes `요청문 복사` and `선택 AI 열기` as the two primary completion actions.
- Workforce mode, route diagnostics, local profile preferences, Portable OS ZIP, full generated Markdown preview, and Markdown download are still available but moved behind collapsed advanced/detail controls.
- The primary prepare action is disabled until a request exists. ChatGPT remains the default provider; provider hints now explain the immediate user action instead of static-delivery implementation details.
- A prepared request is invalidated immediately when task/provider/mode/profile inputs change. The same invalidation aborts any preparation already in progress, preventing an older provider/profile Task Pack from appearing after a newer choice.
- AI Writing OS preparation now uses `AbortController` plus a per-run shared Work Lock. Leaving the top-level writing tool aborts preparation, stale completion is ignored, and auto-update waits while preparation is active.
- Provider launch happens immediately on the click path to preserve browser popup user activation; clipboard copy is attempted after launch and popup blocking receives explicit feedback.
- Local validation target: static 215/0, module PASS, JS/MJS syntax PASS, JSON/YAML PASS, browser E2E 43 cases. GitHub `browser-smoke` remains the final interactive Chromium gate after push.

## 1.8.2 AI Writing OS Prompt Compiler & Adaptive Delivery
- 기준선은 실제 전달된 `AI_Cleaner_1_8_1_FULL_PROJECT_HANDOFF.zip`이다. 기존 **글 다듬기 / 이미지 검사** 코너의 동작은 유지하고 신설 `AI 글쓰기 OS` 코너만 강화한다.
- AI 글쓰기 OS의 기본 역할을 `긴 OS 문서 전달`에서 **사용자 자연어를 AI 실행용 강화 프롬프트로 컴파일**하는 구조로 전환했다.
- `ai-cleaner/ai-writing-os/prompt-compiler.json`을 추가했다. 공통 Truth/Control 규칙 + BLOG/INSTAGRAM/YOUTUBE/PRODUCT/GENERAL 채널 규칙 + 품질 모드 규칙을 선언적으로 관리한다.
- 기본 생성 프롬프트는 `00_OPEN_FIRST.md`, `07_STATE_AND_UPDATE.md` 등 전체 Fast Path 문서를 매번 붙이지 않는다. 작업에 필요한 규칙만 선택해 `# AI CLEANER OS — EXECUTION PROMPT`로 압축한다.
- 기본 화면은 `원하는 일 적기 -> 평소 쓰는 AI 선택 -> OS로 강화해서 AI에 보내기` 한 동작으로 단순화했다. `원문 그대로 보내기`를 비교용 보조 경로로 제공한다.
- 모바일/터치 환경에서 Web Share API가 가능하면 시스템 공유창을 사용한다. PC에서는 선택 AI를 열면서 강화 프롬프트를 클립보드에 복사한다. 실패 시 수동 복사/프롬프트 보기 경로가 남는다.
- ChatGPT / Claude / Gemini / Grok / Meta AI + `기타 AI` 6개 선택을 제공하고 마지막 선택은 `localStorage`에 기억한다.
- API 키를 요구하지 않는다. GitHub Pages 정적 모드, Remote MCP 비활성화, 외부 합성 입력 금지 경계는 그대로 유지한다.
- 1.8.2 로컬 중간 검증: module PASS, static/architecture 219/0. 최종 패키지 생성 전 버전/문서/JSON/구문 검사를 다시 수행한다.


## 1.8.3 AI Writing OS 연결성 / 설명 UX
- 기존 `AI 글 다듬기` / `AI 이미지 검사` 코너의 엔진과 기본 UI는 수정하지 않고 신설 `AI 글쓰기 OS` 코너만 개선한다.
- 제품 설명을 기술 용어 중심에서 사용자 목적 중심으로 변경: **사용자의 자연어 요청을 필요한 규칙·형식·검수 기준이 포함된 실행 프롬프트로 정리해 평소 쓰는 AI에 넘기는 도구**로 설명한다.
- AI 선택 명칭은 `평소 쓰는 AI`에서 **`내 기본 AI`** 로 정리한다. 마지막 선택은 기존처럼 localStorage에 기억한다.
- 선택 AI와 실제 전달 방식을 하나의 `현재 연결 방식` 카드로 묶는다.
  - 데스크톱: 강화 프롬프트 복사를 시도하면서 선택 AI 새 탭을 연다. 사용자는 새 탭에서 붙여넣기만 하면 된다.
  - 모바일/터치 + Web Share 지원: 시스템 공유창을 사용한다. 브라우저가 선택한 AI 앱을 강제로 직접 열 수 있다고 표현하지 않는다. 공유창에서 사용자가 해당 AI 앱을 선택한다.
  - `기타 AI`: 특정 사이트를 열지 않고 강화 프롬프트 복사 중심으로 동작한다.
- 메인 CTA 문구는 전달 방식에 맞춰 동적으로 변경한다: `...공유하기` / `...ChatGPT 열기` / `...복사하기`.
- `원문 그대로 보내기`는 비교용 보조 동작으로 시각적 우선순위를 낮춘다.
- 강화 결과에는 이번 요청에 적용된 핵심 기준 4개를 칩으로 표시하고, 실제 전달 결과에 따라 `붙여넣기`, `공유 취소`, `브라우저 차단` 등 다음 행동을 안내한다.
- OS 설명 블록은 `작업 파악 / 규칙 보강 / 안전 검수` 3개 개념으로 단순화한다. Prompt Compiler, Portable ZIP 등 기술 정보는 고급 설정에 유지한다.
- API 키, 가짜 MCP/API, 외부 AI 사이트 DOM 주입/합성 타이핑은 계속 사용하지 않는다.


## 1.8.4 AI Writing OS 전달 안정화 — 복사 우선 / 인앱 브라우저
- 기준선은 실제 전달된 `AI_Cleaner_1_8_3_FULL_PROJECT_HANDOFF.zip`이다. 기존 `AI 글 다듬기` / `AI 이미지 검사` 엔진은 수정하지 않는다.
- 실사용 피드백: 카카오톡 인앱 브라우저에서 `보내기`를 누르면 ChatGPT 창은 열리지만 붙여넣을 프롬프트가 없는 현상이 확인됐다.
- 코드 원인: 1.8.3 fallback은 `AI 창 열기 -> clipboard.writeText()` 순서였다. 인앱 WebView에서 창 열기/이동이 사용자 제스처 기반 클립보드 권한을 끊을 수 있다.
- 1.8.4부터 핵심 계약은 **`복사 성공 -> AI 열기`** 이다. 복사가 실패하면 AI는 열지 않는다.
- Async Clipboard가 제한된 WebView를 위해 사용자 클릭 순간 temporary readonly textarea + `document.execCommand('copy')` 동기 fallback을 추가한다. modern `navigator.clipboard.writeText()`도 보조 경로로 유지한다.
- KakaoTalk / Android WebView / Facebook / Instagram / LINE 계열 UA는 restricted in-app browser로 취급해 Web Share를 무조건 신뢰하지 않고 `인앱 브라우저 안전 연결` UI를 보여준다.
- 모든 자동 복사가 실패하면 생성 프롬프트를 화면에 남기고 선택 상태로 만들어 수동 복사를 바로 할 수 있게 한다. 이때 provider open count는 0이어야 한다.
- 결과 영역의 `ChatGPT 열기` 등은 복사 재시도가 아닌 AI-only recovery action으로 분리한다.
- 자동검사: static/architecture 227/0, module PASS. Browser E2E는 46개 구성하며 신규 2개 케이스가 `copy -> open` 순서와 clipboard 완전 차단 시 `no open`을 강제한다.
- 실제 배포 후 GitHub Actions `browser-smoke`와 KakaoTalk/Chrome/Safari 실기기 확인이 최종 게이트다.


## v1.8.5 AI 글쓰기 OS Blog Factory
- 변경 범위는 세 번째 `AI 글쓰기 OS`로 제한. `글 다듬기`/`이미지 검사` 엔진은 1.8.4 기준을 그대로 보존한다.
- AI Company OS V7 Zero-Dependency를 내장 기준으로 갱신하고, 정적 Prompt Compiler는 V7 BLOG/DESIGN/Truth Guard를 Blog Factory 흐름으로 압축한다.
- 기본 생산 프리셋: `오늘 1편`, `3편 생산`, `소재 20개`, `자유 요청`. 자유 요청은 기존 일반 OS 강화 흐름의 호환 모드다.
- Blog Factory pipeline: 소재 레이더 → 필요한 경우 실제 웹 기능으로 최신 사실 확인 → Creator-10 글 → 자연스러움 편집 → 이미지 생성/프롬프트 → Truth Guard 최종 검수.
- 정적 Pages 자체는 웹 검색/이미지 생성을 실행했다고 주장하지 않는다. 선택 AI가 실제 기능을 가질 때만 실행을 요청하고, 없으면 확인 필요/이미지 제작 브리프로 fallback한다.
- 자연스러움 목표는 detector 우회가 아니라 독자 가독성/브랜드 문체/사실 보존. detector 점수 최적화는 계속 금지한다.
- 생산 기본값(mode/blog type/audience/research/image count)은 localStorage에 저장. 실제 경험/피할 소재는 작업값이며 기본 설정으로 영구 저장하지 않는다.
- V7 전체 ZIP은 `ai-cleaner/ai-writing-os/os/releases/AI_COMPANY_OS_V7_ZERO_DEPENDENCY.zip`.


## v1.8.6 AI 글쓰기 OS 안정화 패치
- 기준선은 실제 전달된 `AI_Cleaner_1_8_5_FULL_PROJECT_HANDOFF.zip`. 앞의 `글 다듬기` / `이미지 검사` 엔진과 공통 core/service/UI는 변경하지 않는다.
- `소재 20개` 모드에서 남아 있던 고정 `이미지 N장 패키지` 표현 충돌을 제거했다. 이 모드는 이미지 장수 선택을 비활성화하고 각 소재별 이미지 콘셉트만 제안한다.
- 생산 단계 UI는 모드별로 실제 흐름을 표시한다: daily/batch는 소재→조사→글→자연화→이미지→검수, idea bank는 소재→조사→각도→우선순위→이미지 콘셉트→7일 큐, free는 요청→분류→규칙→강화→전달→실행.
- update draft나 오래된 local state에서 복원되는 provider ID는 현재 provider registry에 존재하는 값만 적용한다. 잘못된 ID로 인해 활성 AI가 화면에서 사라지는 상태를 막는다.
- 독자 설명 500자, 실제 사실/경험 80,000자, 중복 방지 메모 80,000자 상한을 추가했다. free mode는 이전 factory 보조값 때문에 막히지 않는다.
- `선택 AI 열기` 복구 버튼의 안내 문구는 실제 복사 여부를 전제로 하지 않도록 수정했다.
- CSS는 기존 계통을 유지하며 factory disabled 상태와 reduced-motion hover만 보강했다.
- 신규 회귀 검사는 idea-bank 이미지 계약, mode-aware pipeline, context bounds, restored provider validation을 포함한다.


## 1.9.1 UI/UX · 예외사항 안정화
- 결과 `직접 수정` 중에는 오래된 교정 제안, 문장 검토, 재작성, 보관함 복원, Undo/Redo, 변경 비교를 잠근다. 수정 완료 뒤 현재 결과를 기준으로 제안을 다시 계산한다.
- 결과를 전부 지운 상태에서도 `수정 완료` 버튼은 살아 있어 편집 모드에 갇히지 않는다.
- 교정 제안 목록은 최대 120개만 렌더링하고 숨겨진 제안도 `안전 일괄 반영`에서는 처리한다. 겹치는 개별 제안은 안전 일괄 처리로 유도한다.
- 텍스트 도구 복사는 Async Clipboard 실패 시 legacy copy를 시도하고, 최종 실패 시 결과를 선택해 수동 복사할 수 있게 한다.
- Blog Factory 저장 프로필/요청 입력 상한을 UI와 런타임 양쪽에 두고, 로컬 일일 프롬프트의 날짜/파일명/캐시 키를 `Asia/Seoul`로 통일한다.
- Daily Engine JSON이 10개 미만이면 `부분 준비 · N/10`으로 실제 개수를 표시하고 TOP 3를 다시 정규화한다.
- Daily Engine generator 기본 모델은 `gpt-5`; `OPENAI_MODEL`로 override 가능. seed/audience/avoid 변수 길이와 150초 timeout 오류를 방어한다.
- Daily 생성 JSON은 정적/모듈 검사가 통과한 뒤에만 커밋한다. 동시 main push가 있으면 최대 3회 fetch/rebase/push 재시도한다.
- 일반 CI의 오래된 commit은 최신 `main`과 SHA가 다르면 Pages 배포를 건너뛴다. CI와 Daily의 Pages deploy job은 공통 `github-pages-deploy` concurrency group으로 직렬화한다.

## 1.9.3 Pages artifact 격리
- 기준선은 실제 전달된 `AI_CLEANER_1.9.2_FULL_PROJECT_HANDOFF.zip`이다. `OPTION/**`은 계속 절대 보호/제외한다.
- 일반 CI와 Daily workflow는 더 이상 저장소 루트 `.` 전체를 GitHub Pages artifact로 업로드하지 않는다.
- `.github/scripts/build-pages-artifact.mjs`가 `.pages-site/` staging 디렉터리를 만들고, 공개 런타임에 필요한 파일만 allowlist 방식으로 복사한다.
- Pages 공개 대상은 루트 `index.html`과 `ai-cleaner/` 런타임 파일/디렉터리만이다. `OPTION/**`, `PROJECT_HANDOFF/**`, `.github/**`, `package.json`, `ai-cleaner/tests/**`, `ai-cleaner/MIGRATION.md`는 배포 artifact에서 제외한다.
- 이 규칙은 보호 폴더를 이동/삭제해서 해결하는 방식이 아니라, 애초에 배포 입력을 별도 staging directory로 제한하는 방식이다.
- 결과물 FULL/Patch ZIP에도 `OPTION/**`은 포함하지 않는다.
- 빈 상태 안내와 footer의 옅은 텍스트는 기존 `--muted` 색으로 통일해 작은 글씨 대비를 보강한다.

## 1.9.4 browser-smoke 빈 입력 상태 hotfix
- 기준선은 실제 배포된 `1.9.3` (`main` commit `030ea0869f292c73e39d695a72a6f6e76dda85ed`)이다.
- GitHub Actions `browser-smoke`에서 50개 중 1개가 실패했다. 분석 뒤 원본을 `''`로 비웠을 때 결과 textarea가 이전 값 `앞뒤 끝`을 유지하는 회귀였다.
- `handleSourceMutation()`의 빈 입력 처리를 최우선 fast-path로 이동했다. 빈 입력에서는 stale/dirty UI 동기화보다 먼저 `clearTextAnalysis({keepInput:true})`를 실행한다.
- 빈 입력 초기화 뒤 `original` 변경 이벤트는 유지하여 Rewrite Studio 등 연결 모듈의 기준 글 변경 감지가 끊기지 않게 한다.
- 집중 E2E `clearing the source immediately clears stale output and analysis state`를 추가했다. output empty, 이슈/문장검토/기술 위젯 hidden, 진단 `분석 전`을 검증한다.
- 정적 검사는 빈 입력 fast-path가 `setInputDirty(true)`보다 앞서는 순서 계약까지 검사한다.
- 로컬 검증: module PASS, static 260/0, JS/MJS syntax PASS. 컨테이너 Chromium은 조직 정책으로 localhost 자체가 차단되어 GitHub browser-smoke 재실행이 최종 확인이다.
- `OPTION/**`은 절대 보호 영역이며 어떤 수정/복사/패키징에도 포함하지 않는다.

## 1.9.5 런타임 vendor / 구형 한글 import / lazy Blog Factory
- `OPTION/**`은 계속 절대 보호 영역이며 수정·복사·패키징하지 않는다.
- 이미지 검사 브라우저 런타임의 외부 CDN 의존성을 제거했다. GitHub Actions가 배포 전에 고정 버전 ExifReader/C2PA + WASM을 `ai-cleaner/vendor/`로 생성하고 Pages allowlist에 포함한다.
- 로컬 개발에서 이미지 검사를 사용하려면 저장소 루트에서 의존성 설치 후 `npm run build:vendor`를 먼저 실행한다. 일반 CI와 Daily Pages workflow는 이 단계를 자동 수행한다.
- TXT 가져오기는 UTF-8/UTF-16뿐 아니라 오래된 CP949/EUC-KR byte stream을 fallback으로 복구한다. RTF `\\ansicpg949` ANSI byte run도 codepage에 맞게 해석한다.
- Blog Factory controller는 초기 boot에서 제외하고 해당 도구를 처음 열 때 lazy-load한다. 로드 전 복원 상태는 pending state로 보존한다.
- UI 글자 크기 하한을 9.5px로 잡고 기존 9.5px 미만 선언을 정리했다.
- 자동검사: module PASS, static 266/0, JS/MJS syntax PASS, workflow YAML PASS. Playwright는 53개로 확장했으며 실제 vendor build/browser-smoke는 GitHub Actions가 최종 게이트다.


## 1.9.6 Blog Factory resilience / anti-repeat quality
- OPTION/** remains a protected, excluded path. Do not inspect, modify, move, delete, rename, or package it.
- Daily Engine browser fetch is bounded to 8 seconds and exposes a manual retry state instead of hanging indefinitely.
- Topic cards use progressive disclosure and support copying one topic brief. Selecting a topic clears previous topic-specific USER FACT context.
- Stale Daily Engine dates are carried into the task with an explicit today-freshness recheck instruction.
- Daily generation compares up to 14 git revisions / 120 recent topic titles to reduce repeated themes without adding public history files.
- Daily priority score is now rubric-based and includes priorityReason; runtime surfaces history comparison count and score rationale.
- Blog compiler 1.3 removes rigid keyword/length targets and strengthens intent-first, mobile, title/body promise, freshness, and factual-source boundaries.


## 1.9.7 browser-smoke / OPTION coexistence hotfix
- `OPTION/**` 보호 규칙은 **AI Cleaner 작업/전달물에서 절대 건드리지 않는다**는 의미다. 저장소 소유자가 별도 서비스 목적으로 직접 갱신하는 것을 AI Cleaner CI가 차단하면 안 된다.
- 따라서 AI Cleaner CI는 OPTION-only 변경에서 실행/실패하지 않고, Pages runtime allowlist만 OPTION을 계속 제외한다.
- Blog Factory E2E는 접힌 `osFactoryContext`를 실제 사용자처럼 펼친 뒤 `osFacts`를 입력한다.

## 1.9.8 OPTION Pages public bridge hotfix
- `OPTION/**` ownership is unchanged: AI Cleaner must not edit, rename, delete, reformat, or include it in FULL/Patch delivery ZIPs.
- A separate owner-managed program depends on the legacy public URL `/OPTION/SS_OPTION.txt`. Pages artifact isolation in 1.9.3 unintentionally removed that URL and caused HTTP 404.
- `.github/scripts/build-pages-artifact.mjs` now has one explicit exception: if repository file `OPTION/SS_OPTION.txt` exists, it is copied verbatim to `.pages-site/OPTION/SS_OPTION.txt`. No other OPTION file is staged.
- Delivery bundles still omit `OPTION/**`; the bridge reads the repository-owned file only during Pages packaging and does not modify it. Missing `OPTION/SS_OPTION.txt` is non-fatal for source-only handoff bundles.
- `ai-cleaner-ci.yml` push paths include only `OPTION/SS_OPTION.txt` so an owner update refreshes GitHub Pages. The old protected-path failure rule remains removed.
- Expected compatibility URL after deployment: `https://junl-im.github.io/meta/OPTION/SS_OPTION.txt`.

## 1.9.9 CSP / 로더 timeout hardening
- 루트 redirect 페이지는 JavaScript를 제거하고 meta refresh + 링크 fallback만 유지하며 `script-src none` CSP를 사용한다.
- 앱 head의 대형 inline boot JavaScript를 `ai-cleaner/js/boot.js`로 분리했다.
- 앱 페이지에 Content Security Policy를 추가해 runtime script를 same-origin으로 제한하고 `object-src none`, `base-uri none`, `form-action none` 경계를 둔다. C2PA WASM 때문에 `wasm-unsafe-eval`만 명시적으로 허용한다.
- 최초 `version.json` 확인은 3.5초 뒤 abort하고 로컬 fallback metadata로 계속 부팅한다.
- core script와 lazy tool script는 각각 10초 timeout 후 명시적 오류/재시도 상태로 전환한다.
- background update check는 8초 timeout으로 abort해 `busy`가 영구 고정되지 않게 한다.
- 이미지 vendor는 ExifReader/C2PA module 10초, C2PA WASM init 12초 timeout을 둔다. 실패는 이미지 분석 전체 hang이 아니라 해당 metadata 신호의 실패 상태로 귀결된다.
- `OPTION/**`은 수정/이동/삭제/전달 ZIP 포함 금지. 기존 Pages bridge는 owner-managed `OPTION/SS_OPTION.txt`를 존재할 때 그대로 읽어 복사하는 예외만 유지하며, AI Cleaner 코드가 내용을 변경하지 않는다.


## 1.10.0 Offline / performance / mobile foundation

- `OPTION/**` remains outside all handoff ZIPs and outside the AI Cleaner service-worker scope. The existing Pages bridge for `OPTION/SS_OPTION.txt` remains a deployment-only exception.
- Initial core/app JavaScript is generated as `vendor/app-core.bundle.js` during `npm run build:vendor`, reducing production first-load script requests. `boot.js` falls back to the original ordered source files if the bundle is unavailable.
- `ai-cleaner/sw.js` adds a scoped offline shell for `/ai-cleaner/` only. `version.json` and `data/daily-topics.json` use network-first freshness; other runtime assets use cache-first within the versioned cache.
- The web app manifest now has an explicit id, language, description, categories, and orientation metadata.
- Coarse-pointer mobile controls receive a larger touch floor; text fields/selects use 16px on mobile to avoid focus zoom. Reduced-motion and increased-contrast preferences receive stronger global handling.


## 1.11.3 — PC F5 reload scroll stability

- PC Chrome F5에서 스크롤 위치가 몇 px씩 누적 이동할 수 있는 초기 레이아웃 타이밍을 정리했습니다.
- `app.css`는 HTML 파싱 단계에서 먼저 로드하며 `boot.js`는 해당 stylesheet를 재사용합니다.
- 부팅 중에만 scroll anchoring을 비활성화하고, reload 시 강제 top 이동은 하지 않습니다.
- Protected `OPTION/**` remains untouched/excluded.


## 1.12.0 변경 요약
- 전체 서비스 브랜드를 `곰같은여우의 AI 놀이터`로 전환했다. 개별 도구명과 기존 `/ai-cleaner/` URL은 유지한다.
- HTML/PWA/root redirect/PROJECT_STATE의 사용자-facing 브랜드와 설명을 동기화했다.
- 선택한 도구에 따라 브라우저 문서 제목이 바뀌도록 해 멀티탭 구분과 플랫폼 구조를 강화했다.
- 모바일 toolnav에 누적되어 있던 중복 breakpoint 선언을 정리하면서 현재 390/320px 렌더 결과는 유지했다.
- 정적 검사는 브랜드 일관성, 활성 도구 문서 제목, toolnav CSS 중복 상한을 회귀 계약으로 고정한다.


## 1.12.1 빈 원본 / 재작성 수명주기 핫픽스
- 재작성 스튜디오를 사용한 뒤에도 원본이 빈 문자열이 되면 결과와 분석 상태가 최종적으로 빈 상태를 유지하도록 source mutation token + microtask/rAF/80ms 후속 guard를 추가했다.
- 렌더 rebuild도 원본이 비어 있으면 stale working text를 다시 출력하지 않는다.
- 재작성 적용 API는 원본이 빈 상태에서는 결과를 쓰지 않는다.
- 재작성 스튜디오 로드/생성/적용/검증 탭을 거친 뒤 원본을 비우는 브라우저 회귀 테스트를 추가했다.
- OPTION/** 정책과 Pages bridge는 변경하지 않는다.


## 1.13.0 자동작성 원본 100% 동일 재입력 계약

- 사용자 확정 핵심 계약에 따라 `자동작성 원본 새로쓰기`는 더 이상 `sanitizeVisibleTypingSource()` 결과를 작성 대상으로 사용하지 않는다. 이전 버전의 visible-text projection 규칙은 이 기능에 한해 폐기되며, 아래 1.13.0 규칙이 우선한다.
- 작성 source는 `#input.value`의 원본 문자열 자체다. 숨은 Unicode, 특수 공백, 줄바꿈, 조합 문자 등도 임의 삭제/정규화/치환하지 않는다.
- 결과는 복사·붙여넣기나 `value = source` 일괄 대입이 아니라 grapheme 단위 scheduler가 `HTMLTextAreaElement.setRangeText()`로 현재 결과 끝에 순차 삽입해 처음부터 누적 작성한다.
- 외부 키보드 이벤트를 위조하거나 `KeyboardEvent`/합성 paste를 사용하지 않는다. 기능 범위는 이 페이지 결과 편집기의 실제 값 누적 작성이다.
- 완료 성공 조건은 `output.value === original source`의 정확 문자열 일치다. 한 글자라도 다르면 실패 처리하고 이전 결과로 복원한다.
- 오른쪽 Unicode/기술 분석은 기존 정책대로 문제점을 탐지·표시할 수 있으나, 그 분석 결과가 자동작성 source를 변경해서는 안 된다. 즉 분석과 자동작성은 목적을 분리한다.
- 업데이트 복원 시 `typewriterVerified` 역시 저장된 output과 저장된 input 원문이 정확히 같을 때만 복원한다.
- UI 문구도 `보이는 텍스트 정리 후 작성`에서 `원본 전체를 내용 변경 없이 새 입력`으로 변경한다.
- `OPTION/**` 보호 규칙, Rewrite Studio, 이미지 분석, Blog Factory, 기존 분석/위젯 기능은 변경하지 않는다.

## 1.13.1 Browser Smoke 회귀 복구

- 1.13.0 exact-source 자동작성 계약은 그대로 유지한다. 원문을 정리/정규화하지 않고 결과 textarea에 순차 삽입하며 완료 시 원문과 정확히 일치해야 성공한다.
- 자동작성 실행은 독립 트랜잭션으로 취급한다. 시작 직전의 결과값/수정 상태/적용 상태/검증 마커를 rollback snapshot으로 보관하고, ESC 또는 패널 닫기로 진행 중 취소하면 history index 추정 대신 그 정확한 시작 직전 결과로 복원한다.
- exact-source 자동작성 결과에 원본의 숨은 문자/특수 공백이 의도적으로 남아 있는 경우 기술 패널은 이를 `결과 잔여` 오류처럼 경고하지 않고 `원본 그대로 보존`으로 구분한다. 일반 분석/정리 결과의 실제 잔여 항목 표시는 기존 정책을 유지한다.
- Rewrite Studio generation도 트랜잭션 rollback을 가진다. 생성 중 다른 도구 이동/패널 닫기/기준 글 변경 등으로 취소되면 첫 생성은 빈 초안으로, 변형 생성은 직전 완료 초안으로 복원하고 `rewrite-generation` work lock을 해제한다. 완료된 초안의 일반 닫기/재열기 persistence는 그대로 유지한다.
- Browser E2E의 exact-source 기술 감사 기대값을 새 계약에 맞게 수정했다. 1.13.0 GitHub browser-smoke에서 보고된 3개 실패를 대상으로 회귀 복구했다.
- 로컬 검증: static/architecture 292 passed / 0 failed, module PASS, app.js/rewrite-studio.js syntax PASS. 실제 Chromium browser-smoke는 Push 후 GitHub Actions가 최종 게이트다.




## 1.13.3 ESC 취소 전파 경로 안정화
- 자동작성 패널 ESC 취소 처리를 `document` 캡처가 아니라 `window` 최상단 캡처 단계로 승격했다.
- 포커스가 편집기/패널 내부 어느 요소에 있더라도 진행 중 자동작성 취소가 하위 이벤트 전파 정책에 의존하지 않도록 했다.
- 자동작성 원문의 내용·문자·순서 100% 동일 및 문자 단위 순차 입력 계약은 변경하지 않았다.
- 취소 시 시작 직전 분석/정리 결과 스냅샷으로 복원하는 기존 트랜잭션 계약을 유지한다.

## 1.13.2 ESC 자동작성 취소 강화

- 자동작성 원본 새로쓰기의 **원문 100% 동일 / 문자 단위 순차 작성** 계약은 변경하지 않는다.
- 자동작성 패널이 열린 동안 `Escape` 키를 document capture 단계에서 우선 수신한다.
- ESC 수신 시 기본 동작과 하위 전파를 차단하고 `stopTypingPreview({restore:true})`를 실행한다.
- 진행 중 자동작성은 즉시 중지되고 시작 직전의 분석된 결과/상태 스냅샷으로 원자적으로 복원된다.
- 일반 패널의 ESC 동작은 자동작성 패널이 열려 있지 않을 때 기존 `panelManager.closeTop()` 경로를 그대로 사용한다.
- 목적: GitHub Actions Chromium 환경에서도 포커스/이벤트 버블링 차이와 무관하게 취소 계약을 결정적으로 보장한다.

## 1.15.2 자동작성 ESC 포커스 레이스 수정

- 자동작성 패널을 열 때 포커스를 다음 프레임에만 예약하던 구조를 보강해 즉시 포커스 + 다음 프레임 재확인으로 변경했다.
- 작업 잠금이 자동작성 트리거 버튼을 disabled 처리하기 전에 패널이 키보드 포커스를 확보하므로, 실행 직후 ESC도 브라우저에서 유실되지 않고 취소 경로로 전달된다.
- window capture ESC 처리와 함께 이중 안전장치로 동작한다.
- 원문 100% 동일, 내용 추가/삭제/정규화 금지, 문자 단위 순차 입력이라는 자동작성 핵심 계약은 변경하지 않았다.


## 1.15.3 GomFox Reach browser-smoke 안정화
- 모바일 상단 도구 탭 E2E 기대값을 3개에서 4개로 갱신해 Reach 추가 이후 레이아웃 회귀를 올바르게 검증합니다.
- GomFox Reach 활성화 시 URL 입력칸으로 포커스를 강제로 이동하던 동작을 제거했습니다.
- 이 변경으로 상단 탭의 roving keyboard focus가 유지되어 Reach 탭에서 Home/End/Arrow 키 이동이 정상 동작합니다.
- 기존 AI 글 다듬기, 이미지 검사, 블로그 팩토리, 자동작성 원본 새로쓰기 로직은 변경하지 않습니다.


## 1.15.4 빈 원본 권위 가드

- Rewrite Studio를 거친 뒤 원본 입력을 비우면 결과가 즉시 빈 문자열이 되도록 보강.
- 지연 lifecycle callback이 남아 있어도 빈 원본이 최종 권위 상태로 유지되도록 microtask / animation-frame / short-delay 재확인.
- GomFox Reach 2.0과 기존 원본 100% 동일 문자 단위 자동작성 계약은 변경 없음.
