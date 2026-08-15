# 1.3.1 Stability Audit

- 1.3.0 전달 ZIP을 기준선으로 다시 풀어 패치를 생성합니다. 작업 중간 폴더가 아니라 실제 전달물 기준입니다.
- `version.json` 업데이트 비교를 Semantic Versioning 비교로 변경했습니다. 현재보다 **엄격히 새 버전일 때만** reload하며, 캐시된 이전 버전이나 잘못된 버전 문자열은 무시합니다.
- rewrite/image lazy script가 한 번 네트워크 오류로 실패해도 실패 Promise를 캐시에 고정하지 않고 제거하여 같은 세션에서 다시 시도할 수 있습니다.
- Typewriter 일시정지 시 `requestAnimationFrame`을 계속 순환하지 않습니다. pause에서 예약 frame을 취소하고 resume에서 하나만 다시 예약합니다.
- 업데이트 draft 복원 시 결과가 사용자의 직접 수정본이었다면 그 결과를 새 suggestion baseline으로 동기화하고, 수정 중이던 상태도 복원합니다.
- 앱 전체에서 브라우저 우클릭/텍스트 선택/드래그를 막던 전역 억제를 제거했습니다. 커스텀 우클릭 메뉴는 텍스트 입력 요소에만 적용됩니다. 직접 쓰기 검증 모드의 붙여넣기/드롭/합성 입력 차단은 별도 로직으로 그대로 유지됩니다.
- `pagehide`에서 예약 분석과 업데이트 polling을 정리합니다.
- `PROJECT_STATE.json`의 1.3.0 당시 stale `current_version/asset_version/modularCore phase` 메타데이터를 실제 런타임 상태와 일치하도록 바로잡고 정적 검사에 consistency guard를 추가했습니다.
- UI/모바일 compact panel/old-v6 Layer A text hygiene/자동작성 visible-text 정책은 변경하지 않습니다.
