# AI Cleaner 1.8.5 — AI 글쓰기 OS Blog Factory

날짜: 2026-08-18

## 범위
- **세 번째 `AI 글쓰기 OS`만 리뉴얼.**
- 앞의 `글 다듬기`, `이미지 검사` 엔진/동작은 변경하지 않는다.
- UI/UX는 기존 오렌지/크림 계열 카드, pill, 고급설정 접기, provider handoff 계통을 유지한다.

## AI Company OS V7 결합
- 내장 OS 기준을 `AI_COMPANY_OS_V7_ZERO_DEPENDENCY`로 갱신.
- V7 fast-path 00~07 핵심 파일을 `ai-writing-os/os/current/`에 반영.
- 전체 V7 ZIP을 `ai-writing-os/os/releases/AI_COMPANY_OS_V7_ZERO_DEPENDENCY.zip`으로 제공.
- Prompt Compiler를 `AI Cleaner Blog Factory Compiler 1.1`로 갱신.

## Blog Factory
- `오늘 1편`: 소재 후보 → 사실 확인 → Creator-10 글 1편 → 이미지 패키지 → 발행 전 검수.
- `3편 생산`: 겹치지 않는 3개 소재로 완성 패키지 3개.
- `소재 20개`: 소재 20개 + 우선순위 + 다음 7일 큐.
- `자유 요청`: 1.8.4까지의 일반 AI 글쓰기 OS 흐름 유지.

## 생산 입력
- 글 유형, 목표 독자, 최신 정보 조사 강도, 이미지 수 선택.
- 실제 경험/고정 사실과 이미 쓴 소재는 선택 입력.
- 실제 경험/피할 소재는 일회성 작업값으로만 다루고 localStorage 기본설정에는 저장하지 않음.
- 생산 모드/글 유형/독자/조사 모드/이미지 수는 브라우저 로컬 기본값으로 기억.

## 자연스러움 / Truth Guard
- 목표는 AI detector 우회가 아니라 실제 독자가 읽기 자연스러운 한국어.
- 반복 종결, 상투적 도입, 번역투, 과도한 광고투를 줄이도록 컴파일.
- 없는 구매/방문/사용/가족 반응/효과를 1인칭 경험으로 만들지 않음.
- 최신성이 필요한 사실은 선택 AI에 실제 웹 기능이 있을 때만 확인하도록 요청하고, 기능이 없으면 확인했다고 주장하지 않음.

## 이미지
- 선택 AI에 실제 이미지 생성 기능이 있으면 생성 가능.
- 기능이 없으면 각 이미지의 생성 프롬프트, 구도, 비율, 본문 위치, 캡션, ALT를 납품하도록 지시.
- 정적 GitHub Pages 앱 자체가 이미지 생성/웹 검색을 했다고 표시하지 않음.

## 호환성
- provider 선택, 모바일 share, PC copy-before-open, 인앱 브라우저 fail-closed 전달 안전성 유지.
- 기존 `osTask`, `osSendEnhanced`, provider/result IDs를 유지해 업데이트 복원 및 기존 전달 흐름을 보존.
