# AI Cleaner 1.8.6 — Blog Factory Stability Patch

날짜: 2026-08-18

## 범위
- 1.8.5 AI 글쓰기 OS의 안정화 패치.
- `글 다듬기`, `이미지 검사` 엔진 및 기존 공통 core/service/UI 동작은 변경하지 않음.

## 수정
- `소재 20개` 모드가 고정 이미지 장수 패키지를 암시하던 UI/프롬프트 모순 수정.
- idea-bank에서는 이미지 장수 선택 비활성화, 소재별 이미지 콘셉트만 납품.
- `오늘 1편/3편/소재 20개/자유 요청`에 따라 생산 파이프라인 표시를 실제 흐름으로 동기화.
- batch 모드 이미지 표기를 `글당 이미지 N장`으로 명확화.
- 저장/복원 provider ID를 현재 registry와 재검증.
- factory 보조 입력에 안전 상한 추가: 독자 500자, 사실/경험 80,000자, 피할 소재 80,000자.
- AI-only 열기 복구 안내가 이미 복사되었다고 오해시키지 않도록 문구 수정.
- disabled factory 입력 시각 상태와 reduced-motion hover 보강.

## 회귀 검사
- 기존 static architecture 검사 + 신규 mode/image/context/provider 검사를 포함해 233개 통과 목표.
- module 검사에 idea-bank 이미지 계약, invalid provider 복원, context size guard 추가.
- Browser E2E 47개 구성: 신규 idea-bank/free/daily pipeline 전환 회귀 포함.
- copy-before-open, clipboard failure no-open, mobile share 계약 유지.

## 보호 검증
- 1.8.5 대비 패치 허용 파일 외 89개 파일 SHA-256 동일.
- `app.js`, `rewrite-studio.js`, `image-analyzer.js` SHA-256 완전 일치.
- `index.html`의 `#writingTool` 이전 영역과 `app.css`의 AI Writing OS 전용 블록 이전 영역도 바이트 동일.
- 로컬 Chromium 바이너리는 존재하지만 조직 정책으로 localhost/file navigation이 차단되어, 실제 상호작용 E2E는 GitHub Actions `browser-smoke`가 최종 게이트.
