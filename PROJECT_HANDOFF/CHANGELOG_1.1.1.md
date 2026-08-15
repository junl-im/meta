# 1.1.1 — Visible Text Write / Widget Clarity

- X-ray 결과 탭 제거. 기술 정보 패널은 유지.
- 자동작성 원본 새로쓰기: safe hidden Unicode 제거 후 결과 textarea에 grapheme 단위 순차 작성.
- 특수 공백은 일반 공백으로 정규화.
- ZWJ/ZWNJ/WORD JOINER/Variation Selector/Unicode Tags 등 의미 민감 Unicode는 기본 보존.
- 모바일 floating widget 명칭 항상 표시. 420px 이하에서는 badge만 숨김.
- 중앙 메뉴명 `자동작성 원본 새로쓰기`로 변경.
- Typewriter E2E에 U+200B/NBSP 제거 회귀 테스트 추가.
- 모듈 단위 테스트에 visible-text sanitizer + 의미 민감 보존 테스트 추가.
