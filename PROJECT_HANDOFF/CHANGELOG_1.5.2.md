# AI Cleaner 1.5.2 — Browser Regression Alignment

- GitHub Actions 1.5.1 `browser-smoke` 결과는 10개 중 9개 통과, foundation rewrite 흐름 1개 실패였다.
- 실패 원인은 Rewrite Studio 런타임이 아니라 E2E가 1.5.1의 비동기 generation transaction을 완료되기 전에 다음 원본 변경을 실행한 테스트 순서 불일치였다.
- foundation 흐름은 `rewriteGenerate` 뒤 `#rewritePanel[aria-busy=true] -> false` 전환과 완성 draft/apply 가능 상태를 확인한 뒤 원본을 변경한다. 이때 완성된 초안이 `기준 글이 ... 바뀌었습니다` stale-lock으로 잠기는 것을 검증한다.
- 별도 E2E `rewrite source change cancels an in-flight draft transaction`을 추가했다. generation이 `aria-busy=true`인 동안 원본을 변경해 generation이 취소되고, 빈 draft/disabled apply/취소 status가 유지되는지 검증한다.
- 기존 `resetSession()` 기반 in-flight transaction 취소 테스트와 current-result dependency stale-lock 테스트도 유지한다. 따라서 reset 취소, source-change 취소, completed-draft stale-lock을 각각 독립적으로 검증한다.
- Rewrite Studio/app/Worker/Unicode hygiene/Typewriter/UI 런타임 코드는 변경하지 않는다. 이번 버전은 브라우저 회귀 테스트의 비동기 계약 정렬 패치다.
- 패치 기준선은 실제 전달된 `AI_Cleaner_1_5_1_FULL_PROJECT_HANDOFF.zip`이다. `OPTION/**`은 변경하지 않는다.
- 최종 로컬 검증: static 142/0, module PASS, 전체 JS/MJS syntax PASS, workflow YAML PASS. 로컬 Playwright 의존성 설치는 120초 실행 제한에서 timeout되어 재시도하지 않았고 부분 설치 파일을 제거했다. Push 후 GitHub Actions `browser-smoke`가 실제 Chromium 최종 검증이다.
