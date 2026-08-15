# AI Cleaner 1.6.0 — UX Navigation & Visual Comfort

## 핵심 변경
- 모바일 `자동작성 원본 새로쓰기` 완료 후 결과 카드가 sticky 헤더 바로 아래에 오도록 자동 네비게이션합니다.
- 완료 상태의 버튼을 `완료 · 결과 보기` 액션으로 전환했습니다. 버튼을 누르면 자동 대기 없이 즉시 팝업을 닫고 결과로 이동합니다.
- 버튼을 누르지 않아도 완료 후 짧은 확인 시간을 거쳐 자동으로 결과 위치로 이동합니다.
- 결과 카드에 `resultCard` 앵커와 짧은 도착 강조 효과를 추가해 시선 이동을 명확하게 했습니다.
- 완료된 Typewriter 패널은 성공 상태를 초록색 계열로 표현하며 진행률 100%와 결과 이동 액션을 구분합니다.
- `prefers-reduced-motion` 환경에서는 부드러운 이동/강조 애니메이션을 최소화합니다.

## 동작/안전 계약
- Typewriter의 visible-text projection, 안전 제거 문자 정책, 의미 민감 Unicode 보존, exact verification, 결과 잔여 0 검사는 변경하지 않았습니다.
- 외부 키 입력/합성 KeyboardEvent는 추가하지 않았습니다. 결과 textarea 내부 `setRangeText()` 방식만 유지합니다.
- Worker, Rewrite Studio, Fact Lock, 업데이트 복원, stale-result 경계는 변경하지 않았습니다.

## 테스트
- 모바일 완료 버튼 수동 결과 이동 E2E 추가.
- 모바일 완료 후 자동 결과 이동 E2E 추가.
- 결과 카드가 sticky header 아래 0~30px 범위에 안착하는지 검사합니다.
- 좁은 모바일 헤더가 실제 높이를 확보하고 결과 액션이 2열 밀도를 유지하는지 E2E로 확인합니다.
- 기존 1.5.2 browser-smoke 11개 회귀 흐름은 유지합니다. 예상 브라우저 테스트 수: 14개.

## 연계성 보강
- Typewriter 완료 직후 사용자가 다른 floating panel을 직접 열면 예약된 자동 결과 이동을 취소합니다. 사용자의 새 도구 선택을 자동 스크롤이 뒤늦게 덮지 않습니다.
- 로컬 Playwright 설치는 이 실행 환경의 120초 제한에서 timeout되어 재시도하지 않았습니다. 부분 설치 파일은 제거하고 GitHub Actions `browser-smoke`를 최종 Chromium 검증으로 사용합니다.
