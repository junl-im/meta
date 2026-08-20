# AI Cleaner 1.9.7 — browser-smoke / OPTION coexistence hotfix

## 보호 규칙
- AI Cleaner 작업자는 `OPTION/**`을 수정/이동/삭제/rename/패키징하지 않는다.
- 저장소 소유자가 별도 서비스 목적으로 `OPTION/**`을 직접 갱신하는 것은 허용한다.
- GitHub Pages runtime allowlist는 계속 `OPTION/**`을 배포 artifact에서 제외한다.

## 수정
- Blog Factory Daily Engine E2E가 접힌 `실제 경험 · 고정 사실` details 내부의 `#osFacts`를 바로 fill하여 timeout 나던 테스트를 실제 사용자 동작처럼 details를 펼친 뒤 입력하도록 수정.
- AI Cleaner CI의 전역 `Protect OPTION path` 실패 step 제거.
- pull_request path trigger에서 `OPTION/**` 제거.
- push에도 AI Cleaner 관련 path allowlist를 추가해 OPTION-only 커밋은 AI Cleaner CI 자체를 실행하지 않음.
- static regression에 `OPTION owner-change coexistence`를 추가해 CI 정책 재회귀 방지.

## 검증 목표
- OPTION-only 변경은 AI Cleaner static/browser workflow를 막지 않는다.
- AI Cleaner Pages staging은 기존처럼 OPTION을 포함하지 않는다.
- Blog Factory Daily Engine E2E는 접힌 선택 입력의 실제 visibility 계약을 존중한다.
