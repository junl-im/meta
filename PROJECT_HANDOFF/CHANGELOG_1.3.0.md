# AI Cleaner 1.3.0 — Modular Core Phase 3

- Diff 계산을 `core/diff-engine.js`로 분리하고 DOM 렌더를 `ui/diff-view.js`로 분리했습니다.
- grapheme-safe 변경 강조와 line diff 제한/대형 문서 fallback을 엔진 경계로 이동했습니다.
- 실시간 분석을 `services/analysis-coordinator.js`로 이동했습니다. 가장 최근 입력만 적용하며 대기 작업을 취소합니다.
- Coordinator executor 경계를 통해 이후 Web Worker로 교체할 수 있는 기반을 만들었습니다. 현재 1.3.0은 메인 스레드 실행 + idle scheduling이며 Worker 자체는 아직 사용하지 않습니다.
- 수동 분석/파일 열기/설정 변경은 즉시 분석을 유지하고, 입력 중 자동 분석만 latest-only scheduling을 사용합니다.
- `analysis:scheduled`, `analysis:completed` 이벤트와 입력 snapshot 검증으로 stale 결과가 새 입력을 덮지 않도록 했습니다.
- 기존 1.2.2 UI, 모바일 compact panel, Unicode hygiene, `자동작성 원본 새로쓰기` 계약은 유지합니다.

## Validation
- Modular core unit checks: PASS
- Static/architecture checks: 100 passed, 0 failed
- JavaScript syntax: PASS
- Workflow YAML: PASS
- Local Playwright run: not completed because `npm install` exceeded the 120s environment limit; GitHub Actions `browser-smoke` remains the browser-level verification.
