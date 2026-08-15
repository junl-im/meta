# AI Cleaner 프로젝트 인수인계 메모리

업데이트: 2026-08-15 · 현재 패키지: 1.2.0

## 새 채팅에서 가장 먼저 읽을 것
이 폴더를 새 채팅에 업로드한 뒤 `PROJECT_HANDOFF/AI_CLEANER_HANDOFF.md 읽고 이어서 개발하자`라고 요청한다. 이 문서는 프로젝트의 결정사항, 보호 경로, UX 방향, 안전 제약, 배포 방식, 알려진 이슈를 보존하기 위한 인수인계 메모리다.

## 프로젝트/배포
- GitHub: `junl-im/meta`
- GitHub Pages 루트: `https://junl-im.github.io/meta/`
- 루트 `index.html`은 `./ai-cleaner/`로 진입시킨다.
- Pages Build and deployment는 **Branch 방식(main / root)** 을 유지한다. Actions로 Pages 배포 방식으로 바꾸지 않는다.
- `.github/workflows/ai-cleaner-ci.yml`은 배포가 아니라 검사 전용이다.
- **`OPTION/**`은 다른 서비스가 사용하는 보호 경로. 어떤 경우에도 수정/이동/삭제/rename 금지.**

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
- 실시간 텍스트 분석은 문서 길이에 따라 debounce 증가.
- 문장 검토 UI는 최대 400문장.
- 이미지 연속 선택 시 analysis sequence token으로 오래된 비동기 결과가 새 이미지 결과를 덮지 못하게 함.
- C2PA WASM 인스턴스 재사용.
- 큰 이미지 바이너리 문자열 스캔은 전체 복사 대신 필요한 앞/뒤 구간 위주.

## 파비콘/캐시
- 여우 원본 로고 사용. 이모지 임시 로고로 되돌리지 않는다.
- favicon/apple-touch/PWA 아이콘은 버전 파일명으로 교체해 캐시를 피한다.
- `version.json` + `APP_VERSION` + HTML meta version을 일치시킨다.
- 앱은 version.json을 no-store로 확인해 새 버전 발견 시 cache-busting query로 재진입한다.

## CI
- `.github/workflows/ai-cleaner-ci.yml`: checkout@v7, setup-node@v6, Node 24.
- JS syntax, static-check, OPTION 보호를 검사한다.
- 2026-08-14 v6.5.1 기준 Actions와 Pages 둘 다 Success 확인됨.

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
