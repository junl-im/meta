# 1.0.0

- 제품 버전 체계를 legacy 6.x에서 1.0.0 기준 Semantic Versioning으로 전환.
- 모듈화 전 UI/Layout 제품 기준선 확정. 데스크톱 2열 + floating auto-write bridge 계약 유지.
- 모바일/태블릿 패널 기본 compact 43~46dvh, 필요 시 84~86dvh 확장. 작은 화면에서 보조 설명과 위젯 밀도를 줄여 본문 가림 완화.
- 모바일 패널 확대/축소 버튼, safe-area, 닫기/패널 전환 시 compact 복귀.
- floating dock z-index를 패널보다 위에 유지해 열린 교정 패널이 다른 도구 위젯 클릭을 가로막는 문제 수정.
- Playwright Typewriter 테스트가 숨겨진 속도 select를 visible action으로 조작해 timeout 나던 문제를 DOM 설정 방식으로 수정.
- Playwright에서 reduced-motion을 사용해 attention/rewriteReady 애니메이션으로 인한 불안정 클릭을 제거.
- 모바일 E2E의 정의되지 않은 APP_URL을 공통 BASE URL로 통일.
- static-check의 scope 밖 `check()` 호출 오류를 제거하고 1.0.0 모바일/CI 계약 검사를 정상 pass/fail 파이프라인 안으로 이동.
- 결과물 전달 규칙 유지: 전체 프로젝트 ZIP + 직전 기준본 덮어쓰기 패치 ZIP, OPTION/** 보호.
- 다음 단계: 1.1.0 Modular Core. 1.0.0 UI 계약을 유지하면서 state/history/work-lock/panels/typewriter부터 내부 분리.
