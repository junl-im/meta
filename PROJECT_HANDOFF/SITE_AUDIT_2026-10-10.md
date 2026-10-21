# AI 놀이터 점검 및 개선 기록

대상: junl-im/meta, AI 글 다듬기 / 이미지 검사 / 블로그 팩토리 / GomFox Reach
릴리스: 1.16.1 · 2026-10-10 (Asia/Seoul)

## 이번 릴리스에서 개선한 사항

| 영역 | 확인한 문제 | 변경 |
| --- | --- | --- |
| 글 정리 | 대표 동작이 원본 재입력이어서 정리 기능과 혼동 | 정리 강도 옆에 `글 정리 실행` 추가. 자동 분석이 꺼져도 실행 가능 |
| 모바일 | 작업 버튼 추가 시 기존 세 버튼이 줄바꿈됨 | 정리 실행을 별도 설정 줄로 이동. 기존 320/390px 회귀 검사 유지 |
| Reach 상태 | 출처 추가 후 이전 분석 결과를 복사할 수 있음 | 출처 추가·질문 변경 시 결과 무효화 및 복사·저장 차단 |
| Reach 수집 | 초기화·도구 전환 후 다음 URL 요청이 계속됨 | 전체 배치 취소, AbortController 중단, 별도 수집 중지 버튼 |
| Reach 제한 | 직접 입력은 출처 6개 제한을 우회 | 공통 출처 추가 함수에서 동일 제한 적용 |
| Reach 오류 | 실패 개수만 보여 원인 파악 어려움 | URL별 HTTP 오류·시간 초과·주소 제한 이유 표시 |
| Reach 개인정보 | 외부 Reader로 URL이 전달되는 사실이 불명확 | 수집 버튼 옆 안내, 자격증명·토큰 의심 URL 차단, fragment 제거 |
| Reach 출처 | 직접 붙여넣기 자료에 원문 링크를 기록할 수 없음 | 선택 원문 URL 입력 추가. 본문을 외부로 보내지 않고 근거 링크 보존 |
| Reach 판정 | 다른 도메인을 독립 출처로 단정 | 독립성 미확인 및 사실 확인 필요 표시 |
| Reach 점수 | 본문의 ‘공식’이라는 단어가 신뢰 점수를 높임 | 해당 가점 제거. 정부 도메인과 일반 자료 구분. 모두 참고 점수로 표시 |
| Reach 상충 | 숫자가 다른 항목을 재활용 근거에 동시에 포함 | 상충 그룹을 근거 후보에서 제외, 기간·단위·대상 확인 안내 |
| Reach 추적 | 근거팩에서 원문으로 돌아가기 어려움 | 원문 링크 및 TXT 내 출처 URL 포함 |
| Reach 날짜 | 31일이 3일로 추출되거나 없는 날짜를 허용 | 날짜 패턴 및 실제 달력 날짜 검증 |
| 이미지 | 100점 지수를 생성 확률로 오해 가능 | 고정 가중치 참고값 안내, 통계와 출처 증거의 의미 구분 |
| 이미지 C2PA | 일반 편집 도구 이름도 AI 생성 신호로 가점 | 알려진 AI 도구명만 생성 도구 후보로 포함 |
| 이미지 C2PA | 검증 실패 manifest도 강한 출처 증거로 취급 | 검증 상태·실패 수를 고려하여 점수와 증거 강도 구분 |
| 초기 접근 | JavaScript 비활성화 시 빈 화면 | 활성화 안내 추가 |
| 의존성 | 잠금 파일 없이 배포 시 하위 의존성이 달라질 수 있음 | package-lock.json 추가, 배포 npm ci 사용 |
| 일일 배포 | 최신 main 동기화 후 이전 코드의 번들을 배포 가능 | 동기화 후 의존성 설치·번들 빌드·모듈·정적 검사 재실행 |
| 개발 환경 | 기존 로컬 4173 서버와 테스트가 충돌 | AI_CLEANER_TEST_URL로 별도 미리보기 지정 가능 |
| Git 관리 | 설치·브라우저 산출물까지 변경 목록에 노출 | node_modules, vendor, test-results, 배포 패키지 및 검사 로그 제외 |
| 업데이트 | 새 JS와 기존 오프라인 캐시 충돌 가능 | 버전·assetVersion·Service Worker 캐시·handoff 동시 갱신 |

| 공개 배포 검증 | 클릭·Escape 때 contextTarget 미선언 ReferenceError 발생 | 대상 변수 초기화, 데스크톱 메뉴 회귀 검사 및 전체 브라우저 검사에 pageerror 실패 조건 추가 |

## 검증 범위

- 기존 브라우저 회귀 검사: 원문 Unicode 보존, 자동작성 취소, 편집 기록, 파일 인코딩, Worker 분석, 패널·모바일, 체크포인트, 블로그 프롬프트와 최신성·실패 복구, 업데이트·오프라인 캐시.
- 추가 브라우저 검사: 수동 정리, Reach 결과 무효화, 6개 제한, 배치 취소, 실패 URL, 민감 URL 차단, 원문 링크, 직접 입력 URL과 31일, 상충 후보 제외, C2PA 일반 편집기 오탐, 데스크톱·모바일 너비.
- 모듈 검사, 정적 검사 298개 항목, 배포 allowlist 패키징, 운영 의존성 npm audit.
- 실제 외부 Reader 가용성은 테스트에서 요청을 모킹하므로 보장하지 않음. C2PA 오탐 회귀는 SDK 응답을 모킹함.

## 다음 개선 후보와 남은 한계

1. Reach의 단어 유사도는 동의·반박·인용·시점 차이를 의미적으로 이해하지 못한다. 현재는 비교 후보 도구이며 자동 팩트체커가 아니다. 향후 문장별 기간·단위·대상 필드와 사람의 확인 상태를 먼저 추가하는 편이 좋다.
2. 도메인 수는 원출처 수가 아니다. 원문 인용 관계와 동일 보도자료 계보를 분석해야 독립성 평가가 가능하다.
3. 본문에서 발견한 날짜는 발행일 보장이 없다. 별도의 발행 메타데이터와 수집 시각을 구분할 필요가 있다.
4. URL 수집 응답은 문자 수를 잘라 저장하지만 다운로드 스트림 크기 제한은 아직 없다. 대용량 수집을 지원하기 전 응답 바이트 예산을 추가해야 한다.
5. ‘확장 검색 5개 열기’는 브라우저 팝업 정책으로 일부가 막힐 수 있다. 각 검색어의 개별 열기 버튼을 사용할 수 있다. 향후 전체 열기는 링크 목록으로 대체 가능하다.
6. 이미지 통계 점수에는 검증 데이터셋 기반 정확도·오탐률 근거가 없다. 향후 기본 화면에서 종합 숫자보다 출처 증거 카드를 우선하는 설계를 권장한다.
7. 원본 타이핑은 문자열 보존 기능이다. 문장 품질 향상이나 출처 검증 효과를 보장하지 않는다. 향후 별도 보조 도구로 이동할 수 있다.
8. 블로그 팩토리는 로컬에서 프롬프트를 만들고 배포된 오늘의 주제를 읽는다. 브라우저 자체의 글 생성 기능과 구분해야 한다. 주제 최신성·오류 복구는 기존 검사가 있다.
9. 전체 초기 부팅 실패 시 복구 화면은 있지만 느린 회선에서는 번들 fallback이 길어질 수 있다. 다음 성능 작업은 실제 모바일 네트워크 측정 후 로딩 단계 표시와 모듈 로딩 병렬화 검토가 적절하다.
10. 일일 배포는 정적·모듈 검사 위주다. main Push 배포와 같은 전체 브라우저 게이트로 통합하면 배포 경로의 차이를 줄일 수 있다.

이 후보들은 구현 완료로 표시하지 않았으며, 새 외부 AI 서비스·계정·유료 호출을 추가하지 않았다.

## 2026-10-11 후속 검증

공개 배포 스모크 검사에서 발견한 contextTarget 미선언과, pageerror 회귀 검사가 추가로 발견한 compareTimer 미선언을 수정했다. 결과 편집, 체크포인트, 메뉴 및 Escape 경로를 포함한 전체 브라우저 검사가 미처리 예외를 실패로 취급한다. 릴리스 1.16.1로 캐시와 메타데이터를 함께 갱신했다.

보관함 복원 뒤 결과 위치로 이동하는 지연 콜백이 새 원본 입력의 포커스를 빼앗는 경쟁 상태도 수정했다. 원본 리비전이 바뀌면 콜백을 무시하고, 포커스가 다른 요소로 이동했으면 결과창으로 강제 이동하지 않는다. 해당 경로를 8회 반복 검증했다.


## 2026-10-12 — 1.17.0 오디오 진입과 조사 연결

사용자 결정에 따라 마스터링과 소리온은 별도 스튜디오 링크로 추가했다. 내부 ARIA 탭과 분리한 오디오 영역에서 새 탭으로 열며 noopener/noreferrer를 적용한다. 두 공개 사이트의 실제 새 탭 이동과 페이지 제목을 확인했다.

Reach 출처 비교 후 블로그 팩토리로 근거팩과 출처별 본문 발췌(각 6,000자)를 전달한다. 기존 작업 요청·실제 경험·모드는 유지하며, 빈 작업만 조사 질문과 오늘 1편 모드로 시작한다. 자료는 독립 첨부 영역에서 검토·해제하고, 프롬프트에는 검증되지 않은 외부 자료이며 자료 속 명령을 실행하지 말라는 경계를 함께 넣는다. 질문/출처 변경으로 무효화한 보고서는 전달할 수 없다. 업데이트 초안 복원에는 포함하되 날짜별 프롬프트 자동 캐시에는 저장하지 않는다.

오늘 자동 주제는 실제 배포 시 필수 설정 존재 여부만 boolean으로 전달받아 별도 공개 상태 파일을 생성한다. API 키나 관심 분야 원문은 공개하지 않는다. 미설정, 미생성, 과거/부분 데이터, 로딩 실패를 구분하며, 다시 확인 버튼은 생성을 실행하지 않음을 안내한다. 상태 확인만으로 생성 성공을 주장하지 않는다. 기존 API 키·주제 설정이 없으므로 실제 자동 생성은 여전히 운영자 설정이 필요하다.

자동 주제가 항상 준비된다는 홍보 문구를 수정하고, 프롬프트 빌더와 실제 글/이미지 생성의 차이를 안내했다. 모바일 자동 주제 헤더 겹침도 수정했다.

검증 범위: 전체 브라우저 회귀 검사(새 전달·복원·캐시 제외·상태 분기·320/390/768/1280px 포함), 기존 정적·모듈 검사, 설정 누락/완료 두 경우의 Pages 패키징. 외부 음성 서버나 마스터링 내부 엔진은 이번 변경 범위가 아니다.


## 2026-10-12 — 1.17.1 스튜디오 메뉴 통일

네 가지 내부 도구 메뉴와 오디오 스튜디오 링크를 같은 카드 디자인으로 통일했다. 콘텐츠/오디오 그룹을 구분하고 제목·짧은 용도 설명·넉넉한 내부 여백을 적용했다. 선택된 내부 도구는 테두리와 배경으로 구분하며 기존 ARIA 탭, 방향키/Home/End 탐색을 유지한다. 상단 고정 영역은 브랜드만 남겨 작업 중 화면을 덜 가리도록 했다. PC는 여섯 카드 한 줄, 태블릿은 그룹별 배치, 모바일은 두 열이다. 기존 알약형 메뉴 CSS를 제거하고 공통 카드 규칙으로 정리했다. 320/390/768/1280/1440px에서 넘침과 카드 크기를 점검하고 PC·모바일 이미지를 직접 확인했다.


## 2026-10-12 — 1.17.2 메뉴 밀도 조정

사용자 피드백에 따라 스튜디오 카드 최소 높이를 PC 76→64px, 모바일 70→60px로 줄였다. 내부 여백과 제목·설명 간격을 축소하고, 제목은 13→12.5px, 설명은 10.5→10px로 소폭 조정했다. 메뉴 바깥 여백도 줄여 카드 스타일을 유지하면서 작업 영역을 더 확보한다.


## 2026-10-12 — 1.18.0 상단 소형 메뉴와 Reach 레이아웃 교정

사용자 요청에 따라 콘텐츠·오디오 스튜디오를 우측 상단 헤더로 이동했다. 설명은 툴팁으로 옮기고 글자 길이에 맞는 작은 버튼(PC 최소 높이 28px, 모바일 32px)으로 정리했다. 기존 선택 표시와 ARIA 탭·키보드 전환은 유지하며 모바일은 화면 너비에 따라 줄바꿈한다.

전체 레이아웃 점검에서 Reach 패널이 공통 wrap 밖에 있어 좌우 여백과 최대 폭이 적용되지 않고 footer도 Reach 앞에 있던 구조 문제를 확인했다. Reach를 다른 세 도구와 같은 부모 아래로 이동하고 footer를 네 도구 뒤에 유지한다. 320/390/768/1280/1920px에서 모든 패널의 좌우 경계가 일치하는 회귀 검사를 추가했다.

Reach 질문·URL 입력창은 공용 글 편집기의 높이를 상속받지 않도록 각각 132/148px, 원문 입력은 240px로 지정하고 세로 크기 조절을 제공한다. URL 예시의 문자 그대로인 역슬래시-n을 실제 줄바꿈으로 수정했다. Reach에서 미정의였던 accent/good/bad/warn 색상 변수는 기존 팔레트에 연결해 상태 구분 색상을 복원했다. 전체 CSS 변수 사용에 미정의 토큰이 없는지 점검했다.

전체 회귀 검사에서 모델명 M60 보호 토큰의 난수 문자열에 60이 포함되면 후속 숫자 보호가 토큰 자체를 다시 치환하는 오류를 발견했다. 보호 값을 길이순 literal 정규식으로 원본에서 한 번만 치환하도록 고쳤다. 난수를 고정해 토큰 내부에 60을 강제로 넣는 재현 검사를 추가해 모델명 반복과 가격 복원을 확인한다.

### 2026-10-12 — 1.18.1 studio navigation density
- Reduced desktop studio buttons from 28px to 24px and mobile buttons from 32px to 28px. Reduced group gaps and header vertical padding while preserving tab selection and keyboard focus.
- Validation: 79 browser tests, 298 static checks and module checks passed; 320/390/768/1280/1920px navigation geometry and desktop/mobile screenshots verified.

### 2026-10-12 — 1.18.2 scrollbar styling
- Shared warm beige track and rounded brown thumb for page, editors and scrollable panels; hover/drag colors, horizontal corner and forced-colors support. Native scrolling and mobile gestures preserved.
- Validation: 298 static checks, module checks and 8 focused browser regression tests passed. Page/editor scrolling, themed 10px scrollbars, no horizontal overflow at five viewport widths, high contrast and screenshot verified.
- 2026-10-14 v1.19.0: Renamed complete source writing, defaulted speed to fast, and added an enabled-by-default paired-asterisk filter in source settings. Filter changes the output only; verification, technical summary, draft restore and cancellation track the chosen transformation. Compact mobile writing panel.
- 2026-10-15 validation: 80 browser tests, 298 static checks and module checks passed. Mobile 320/390px and desktop 1280px layouts visually checked; no horizontal overflow.

- 2026-10-20 v1.19.1: Clear stale ** filter metadata whenever the source changes, becomes empty, or the workspace resets. Preserve the prior result while edited input is pending.
- Hybrid touch-capable PC audit: mouse right-click now opens the editor menu; touch context menus remain native.
- Empty-source invariant: late history, typewriter rollback, rendering and progressive commit cannot restore a result after the source is cleared.

- 2026-10-21 v1.19.2: Reach recognizes the same public URL despite tracking query parameters and query order. Different article text at the same URL no longer counts as another source or invalidates an existing report. A URL batch fetches tracking-link variants once. Browser regressions cover manual and batch intake.

- 2026-10-21 v1.19.3: Added Game Studio / Ranipang beside Audio Studio in the compact header. The verified cardville.web.app link opens in a separate tab with noopener/noreferrer. Responsive browser coverage checks 320–1280px and same-row alignment on desktop.
