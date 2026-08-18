# AI Cleaner 1.9.1

날짜: 2026-08-18

## UI/UX 안정화
- 교정 제안 CTA를 `안전 일괄 반영`으로 명확화하고 모바일에서는 전체 폭 버튼으로 정리.
- 교정 제안이 120개를 넘으면 목록 렌더링을 제한하되 안전 일괄 반영은 전체 제안을 처리.
- 이미 적용한 제안과 범위가 겹치는 개별 제안은 `겹침 · 일괄` 상태로 전환해 stale index 치환을 방지.
- 결과 직접 수정 중 교정/문장 검토/재작성/보관함 복원/Undo·Redo/변경 비교를 잠그고, 수정 완료 뒤 현재 결과 기준으로 재분석.
- 결과를 모두 지워도 `수정 완료` 버튼이 비활성화되지 않도록 편집 상태를 별도 처리.
- 결과/컨텍스트/보관함 복사에 Clipboard fallback과 수동 선택 복구 추가.

## Blog Factory / Daily Engine 예외 처리
- 프로필/선호/주제 씨앗 저장값의 길이·개수 상한 추가.
- 브라우저의 일일 회전·캐시·다운로드 날짜를 `Asia/Seoul` 기준으로 통일.
- 10개 미만 Daily 데이터는 `부분 준비 · N/10`으로 표시하고 TOP 3를 최대 3개로 재정규화.
- route summary의 중복 `결과 형식` 문구 제거.
- Daily generator 기본 모델을 `gpt-5`로 수정하고 `OPENAI_MODEL` override 유지. Actions 변수 길이와 API timeout 오류를 방어.

## GitHub Actions / 배포 경쟁 조건
- Daily JSON은 정적/모듈 검사 통과 후에만 커밋.
- 동시 main 변경 시 Daily commit push를 fetch/rebase 후 최대 3회 재시도.
- 일반 CI가 최신 main보다 오래된 commit이면 Pages packaging/deploy를 생략.
- 일반 CI와 Daily Pages deploy를 `github-pages-deploy` concurrency group으로 직렬화.

## 검증
- 교정 개별 overlap, 직접 수정 transaction lock, partial Daily payload E2E 추가.
- 정적 검사에 UI/예외/모델/env/배포 race guard 추가.
- `OPTION/**` 변경 금지 유지.
