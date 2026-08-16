# AI Cleaner 1.6.5 — Async Intent & UX Guidance

## 기준선
- 실제 전달본 `AI_Cleaner_1_6_4_FULL_PROJECT_HANDOFF.zip` 기준 패치.
- `OPTION/**`은 수정/포함하지 않는다.

## GitHub browser-smoke 회귀 수정
- 1.6.4 Actions run `31950980163`은 27개 중 24개 통과, 3개 실패였다.
- Rewrite Studio lazy-load가 끝나기 전에 사용자가 이미지 도구 등 다른 위치로 이동하면, 이전 `rewriteWidget` async open 요청이 늦게 완료되어 재작성 패널을 다시 열 수 있는 실제 navigation-intent race를 수정했다.
- `rewriteOpenSeq` request token을 추가하고 다른 패널/도구 선택 및 `pagehide`에서 pending rewrite open을 무효화한다. 로딩 자체가 끝나더라도 오래된 요청은 UI를 다시 열지 않는다.
- 기존 in-flight generation 취소 E2E는 실제 `aria-busy=true`를 확인한 뒤 이미지 도구로 전환하도록 바꿔 generation cancellation/Work Lock release를 정확히 검증한다.
- lazy-load pending 상태에서 다른 도구로 이동했을 때 늦은 로드가 패널을 재오픈하지 않는 별도 E2E를 추가했다.
- 모바일 input-intent 테스트는 1.3초 사이 자동 재분석이 끝나 freshness 배지가 다시 숨을 수 있다는 정상 상태를 반영한다. 자동 결과 이동이 취소되어 완료 패널이 그대로 유지되는지와 수정한 입력값 보존을 검증한다.
- Sample 결과는 `<textarea>`이므로 DOM text matcher 대신 `toHaveValue()`로 검증한다.

- 같은 비동기 패턴을 이미지 lazy-load에서도 점검했다. 이미지 엔진 로딩 중 텍스트 도구로 이동하면 pending run token을 무효화하여 숨은 화면에서 분석이 뒤늦게 시작되지 않으며, 해당 Work Lock도 해제된다. 별도 delayed-lazy-load E2E로 보호한다.

## UX 문구와 모바일 밀도
- Hero 안내를 기능 설명 중심에서 행동 중심으로 바꿨다: 원문 입력 후 결과창에 처음부터 한 글자씩 새로 작성하려면 `자동작성 원본 새로쓰기`를 누르도록 안내한다.
- 하단 참고에는 이 기능이 외부 키보드 이벤트를 합성하는 것이 아니라 **이 페이지의 결과 textarea 내부에서 보이는 글씨를 순차적으로 작성**하는 기능임을 명시한다.
- 모바일 `샘플 / 파일 열기 / 초기화`는 3열 한 줄로 고정하고 높이/패딩/글자 크기를 줄여 세로 공간을 절약한다.
- 모바일 결과 헤더의 `정리본 / 변경 비교`는 결과 제목 오른쪽 같은 줄에 유지한다. freshness 상태가 보이는 불리한 상태도 E2E로 확인한다.

## 유지되는 경계
- Worker 6,000자 threshold, timeout/cooldown/fallback, stale-result guard, Update Manager, Rewrite Fact Lock, 직접쓰기 검증, Unicode 보존 정책은 변경하지 않는다.
- `자동작성 원본 새로쓰기`는 앱 내부 result textarea에 `setRangeText()`로 진행되며 `KeyboardEvent`/외부 키 입력을 생성하지 않는다.

## 검증
- Static/architecture: 179 passed / 0 failed.
- Module checks: PASS.
- JS/MJS syntax: PASS.
- Browser E2E configuration: 30 cases.
- GitHub Actions `browser-smoke`가 최종 real-Chromium gate다.
