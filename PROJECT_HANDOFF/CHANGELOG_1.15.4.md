# 1.15.4

- Browser smoke 회귀 수정: 원본 입력이 빈 문자열이 되는 순간 결과/분석 상태를 즉시 비웁니다.
- Rewrite Studio의 지연 라이프사이클 콜백 뒤에도 빈 원본이 최종 권위 상태로 유지되도록 microtask/animation-frame/short-delay 재확인 가드를 추가했습니다.
- GomFox Reach 2.0, 기존 텍스트 분석, 원본 100% 동일 문자 단위 자동작성 계약은 변경하지 않았습니다.
