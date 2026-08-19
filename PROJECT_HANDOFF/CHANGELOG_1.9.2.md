# AI Cleaner 1.9.2

날짜: 2026-08-19

## Daily Blog Factory / GitHub Actions
- `OPENAI_API_KEY` 또는 `BLOG_FACTORY_SEED`가 없을 때 Daily 생성 단계만 경고 후 건너뛰고, 정적 검사와 GitHub Pages 배포는 계속 진행하도록 변경.
- GitHub Actions Step Summary에 누락된 설정을 한 번에 표시하고 실제 Secret 값은 출력하지 않도록 유지.
- 생성 스크립트를 직접 실행할 때도 필수 설정 누락을 하나씩 실패시키지 않고 전체 누락 목록을 한 번에 보고.
- 설정이 존재한 상태에서 OpenAI API 호출 자체가 실패하면 기존처럼 workflow를 실패시켜 실제 생성 장애는 숨기지 않음.

## 부팅 실패 복구
- core script 또는 초기화 실패 시 앱 전체가 inert 상태로 멈추는 대신 전면 복구 UI를 표시.
- 오류 요약과 `다시 불러오기` 버튼을 제공하고 버튼에 자동 포커스.
- 실패 화면이 기존 UI 위를 덮어 미초기화 컨트롤의 오동작을 방지.

## 접근성 / 키보드 UX
- 원본, 결과, 재작성 초안, 직접 입력, Blog Factory 모드 컨트롤에 명시적 accessible name 추가.
- 모든 플로팅 패널을 프로그램적으로 포커스할 수 있게 하고, 열 때 패널로 포커스 이동.
- 닫기 버튼 또는 Escape로 패널을 닫으면 원래 열었던 컨트롤로 포커스를 복원.

## UI 가독성 / 선택 동작
- 전역 `user-select:none`을 제거해 일반 설명/진단 텍스트를 드래그 복사 가능하게 변경.
- 버튼/탭/드래그 헤더 등 상호작용 chrome만 선택 방지 유지.
- 360px 이하 원본 액션 버튼과 결과 탭의 높이/글자 크기를 상향.
- Blog Factory의 pipeline, preset 설명, Daily topic 메타/설명, 적용 chip 등 7~9px대 텍스트를 읽기 쉬운 크기로 상향.

## 검증
- JavaScript 문법 검사 PASS.
- Blog Factory module check PASS.
- 정적 회귀 검사 `256 passed / 0 failed`.
- Daily generator를 필수 설정 없이 실행해 2개 누락값 동시 진단 확인.
- GitHub Actions workflow YAML 파싱 확인.
