# 1.12.1 — 빈 원본 / 재작성 수명주기 핫픽스

## 원인
- 짧은 빈 원본 테스트는 통과했지만, 재작성 스튜디오를 생성/적용/검증까지 사용한 긴 세션에서는 원본을 비운 직후 오래된 결과가 남는 browser-smoke 회귀가 관찰됐다.
- 빈 원본 자체의 초기화 경로는 존재했지만, 이미 로드된 재작성/렌더 후속 콜백보다 빈 상태가 최종 권한을 가진다는 계약이 충분히 강제되지 않았다.

## 수정
- source mutation sequence token을 추가해 더 최신 입력이 들어오면 이전 빈 원본 후속 guard가 자동 무효화된다.
- 빈 원본 처리 직후 microtask, double requestAnimationFrame, 80ms 후속 시점에서 stale 결과/분석 상태가 다시 생겼는지 확인하고 필요하면 무음 재초기화한다.
- `rebuild()`는 원본이 비어 있으면 `state.working`과 `#output`을 즉시 비워 stale 렌더 복원을 차단한다.
- `applyRewrite()`는 원본이 비어 있을 때 결과를 쓰지 않는다.

## 회귀 검증
- 재작성 스튜디오를 실제로 lazy-load하고 original source 생성/적용/verify 탭까지 거친 뒤 원본을 비우는 E2E를 추가했다.
- 빈 상태는 즉시 및 140ms 후에도 유지되고 분석 위젯/요약도 초기 상태여야 한다.

## 보호 경로
- `OPTION/**`은 읽기/수정/이동/삭제/rename/패키징하지 않는다.
- 기존 `OPTION/SS_OPTION.txt` Pages public bridge 정책은 변경하지 않는다.
