# AI Cleaner 1.9.6 — Blog Factory resilience / anti-repeat quality

## 보호 규칙
- `OPTION/**`은 절대 수정/이동/삭제/rename/패키징하지 않는다.

## Blog Factory 개선
- Daily Engine fetch 8초 timeout + 실패 상태 + `다시 확인` 복구 버튼.
- 자동 주제 카드 상세정보 progressive disclosure, 개별 브리프 복사.
- 지난 날짜 자동 주제 선택 시 오늘 기준 최신성 재확인 지시 자동 삽입.
- 자동 주제를 선택할 때 이전 주제의 `USER FACT` 입력을 비워 문맥 오염을 방지.
- 생성기에서 git history 14회 / 최근 최대 120개 제목을 중복 회피 자료로 사용.
- priorityScore 평가 기준을 검색 의도 30 + 시기성 25 + 차별화 25 + 실행가능성 20으로 명문화하고 `priorityReason` 추가.
- prompt compiler 1.3: 고정 키워드 횟수/문자수 지침을 제거하고 검색 의도 우선, 제목-본문 약속 일치, 변동 정보 확인 경계를 강화.
- 생성 프롬프트에 글자 수/줄 수 표시.

## 검증
- module-check PASS
- static-check PASS
- 전체 JS/MJS syntax PASS
- Browser E2E에 Daily fetch retry와 stale-topic freshness/context 회귀 케이스 추가.
