# AI Cleaner 1.4.0 — Worker-safe Analysis

- 장문 입력의 **자동 분석**을 dedicated Web Worker로 옮겼다. 기본 임계값은 6,000 UTF-16 code units이며 짧은 글은 기존 main-thread 분석을 사용한다.
- `js/services/analysis-worker-adapter.js`를 추가했다. Worker 생성/요청/응답, stale 작업 취소, Worker 오류 시 main-thread fallback을 담당한다.
- `js/workers/text-analysis-worker.js`를 추가했다. 별도 분석 규칙을 복제하지 않고 기존 `core/text-utils.js` + `core/text-engine.js`를 `importScripts()`로 재사용한다.
- `text-utils.js`와 `text-engine.js`는 `window` 전용에서 `globalThis` 호환으로 바뀌어 main window와 Worker에서 동일 코어가 실행된다.
- `analysis-coordinator.js`는 scheduled executor의 Promise를 지원한다. latest-only/stale-result guard는 비동기 Worker 결과에도 그대로 적용된다.
- 즉시성이 필요한 수동 분석/원본 metadata sync는 기존 동기 `textEngine.analyze()` 경로를 유지해 UI 계약과 내부 호출 순서를 깨지 않는다.
- 새 입력이 들어와 이전 Worker 계산이 더 이상 필요 없으면 in-flight Worker를 종료하고 다음 요청에서 새 Worker를 만든다.
- Worker 미지원, 생성 실패, 런타임 오류, 메시지 처리 오류가 발생하면 앱은 자동으로 main-thread 분석으로 fallback한다.
- pagehide에서 Worker도 terminate해 페이지 이탈 후 계산이 남지 않게 한다.
- 기존 visible-text sanitizer, old-v6 Layer A hygiene, 모바일 compact panel, 자동작성 원본 새로쓰기 UI/동작은 변경하지 않았다.
