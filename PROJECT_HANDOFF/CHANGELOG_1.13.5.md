# CHANGELOG 1.13.5

- 자동작성 원본 새로쓰기의 원문 100% 동일 문자 단위 작성 계약 유지.
- 진행 중 ESC 취소를 `window` capture와 포커스된 `#typingPreviewPanel` 직접 `keydown` 처리의 이중 경로로 강화.
- 직접 패널 경로에서도 시작 직전 결과 복원, 입력 잠금 해제, work lock 해제 동작을 동일한 `stopTypingPreview({restore:true})`로 통합.
- 기존 분석/정리/Rewrite/Image/Blog Factory 기능 변경 없음.
- `OPTION/**` 미접촉.
