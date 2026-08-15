# AI Cleaner 1.2.2

- 첨부 old-v6의 Layer A Unicode/특수 공백 사전을 현재 공통 text hygiene policy로 흡수.
- old-v6 항목의 공식 이름을 기술 정보 표에 표시.
- ZWJ/ZWNJ/WORD JOINER/Variation Selector/Unicode Tags는 과거 v6의 무조건 삭제 정책을 따르지 않고 의미 민감 항목으로 보존.
- U+00AD, U+061C, U+1680 및 일반 비표시 control은 안전 정리 확장으로 유지.
- text-utils와 text-engine이 하나의 `classifyTextCodePoint()` 정책을 공유해 스캔/Typewriter 결과 불일치 방지.
- 기술 정보에 `원본 발견 / 자동 정리 / 의미상 보존 / 결과 잔여` 4개 카운터 추가.
- 진단 JSON에 textHygieneAudit와 정책 사전 정보 추가.
- 자동작성 visible-text 결과의 안전 제거 대상 0 재검사는 유지.
- old-v6의 문체/AI 패턴 점수를 실제 워터마크로 간주해 자동 삭제하는 동작은 가져오지 않음.
