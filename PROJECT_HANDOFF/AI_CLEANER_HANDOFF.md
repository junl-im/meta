# AI Cleaner 프로젝트 인수인계 메모리

업데이트: 2026-08-14 · 현재 패키지: v6.6

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
- X-ray는 표시 전용. 숨은 Unicode 위치를 보여주며 클릭 시 원본 위치로 이동한다.

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
- X-ray 위치 조회는 Map 기반. 탭을 열 때만 렌더링.
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
- 실제 브라우저 회귀 테스트를 CI에서 headless browser로 자동화(현재 정적 검사가 중심).
- 접근성: 키보드 focus trap, ESC로 팝업 닫기, aria-live 알림 정교화.
- 긴 문서에서 위치 네비게이션/문장검토 벤치마크.
- 이미지 픽셀 계산을 Web Worker/OffscreenCanvas로 이동할 수 있는지 검토.

## 변경 시 반드시 확인
1. `OPTION/**` 변경 0건.
2. `node --check ai-cleaner/js/app.js` / image-analyzer.js 통과.
3. `node ai-cleaner/tests/static-check.mjs` 통과.
4. HTML ID 중복/DOM 참조 누락 0.
5. `version.json`, HTML app-version, APP_VERSION 일치.
6. 모바일 760px 이하에서 팝업은 하단 시트, 본문 overflow 정상.
7. GitHub Pages 루트 주소에서 `/ai-cleaner/` 진입 정상.
