# AI Cleaner 1.9.4

## Browser-smoke hotfix
- GitHub Actions `browser-smoke`의 `foundation flow keeps state, layout and rewrite tools coherent` 실패를 수정했습니다.
- 증상: 분석 결과가 있는 상태에서 원본 입력을 완전히 비우면 `#output`에 이전 결과(예: `앞뒤 끝`)가 남아 있었습니다.
- 원인 경계: `handleSourceMutation()`이 빈 입력 여부를 확인하기 전에 dirty/UI/widget/typewriter 동기화를 먼저 수행해, 빈 상태 초기화가 가장 우선인 경로가 아니었습니다.
- 수정: 원본이 빈 문자열/공백-only가 되면 `clearTextAnalysis({keepInput:true})`를 즉시 실행하는 fast-path를 dirty/UI 동기화보다 앞으로 이동했습니다.
- 빈 상태 초기화 뒤 `original` 변경 이벤트를 전달해 재작성 세션 등 연동 모듈의 stale 상태도 함께 정리합니다.
- 별도 E2E `clearing the source immediately clears stale output and analysis state`를 추가해 input/output/widget/diagnostics 초기화를 직접 검증합니다.
- 정적 검사도 빈 입력 fast-path가 `setInputDirty(true)`보다 먼저 존재하는지 확인하도록 강화했습니다.

## Validation
- module checks: PASS
- static checks: 260 passed / 0 failed
- JS/MJS syntax: PASS
- Browser E2E: 51 cases configured. 로컬 컨테이너 Chromium은 `127.0.0.1 is blocked` 조직 정책으로 실행 불가하므로 GitHub `browser-smoke`가 최종 브라우저 게이트입니다.
- `OPTION/**`: 수정/복사/패키징 대상에서 제외합니다.
