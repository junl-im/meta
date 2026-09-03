# 1.15.5 — GomFox Reach Visible UI Recovery

- Reach 탭의 핵심 UI가 정적 HTML에 항상 존재하도록 가시성 계약을 강화했습니다.
- 탭 전환 시 panel hidden/class/ARIA 상태를 동기화해 빈 패널 회귀를 방지합니다.
- CSP에 `https://r.jina.ai` 연결을 허용하고 외부 공개 URL은 Reader 경로를 사용합니다.
- Reach 초기화 시 필수 DOM 누락을 즉시 오류로 감지합니다.
- E2E/정적 게이트에 URL 입력, 가져오기, 붙여넣기, 복사, 분석 결과 UI 존재 검사를 추가했습니다.
- 기존 AI 글 다듬기 원본 100% 동일 자동작성 엔진은 변경하지 않았습니다.
