# AI Cleaner 1.11.2

## browser-smoke Service Worker isolation hotfix

- 일반 Playwright E2E context에서는 Service Worker를 차단해 `page.route()` 기반 Daily Engine 응답 모킹이 활성 SW/cache에 의해 우회되지 않게 했다.
- 실제 Service Worker/offline 동작 검사는 별도의 `serviceWorkers: 'allow'` browser context를 직접 생성해 독립적으로 수행한다.
- 생산 runtime의 Service Worker 등록, network-first Daily Topics 정책, app-core bundle/PWA 동작은 변경하지 않는다.
- 정적 검사는 기본 E2E SW 차단 + 전용 SW context 계약을 확인한다.
- 이전 `build` run의 282/3 실패는 1.11.1 적용 전 혼합 commit의 1.10 PWA 기반 누락 검사였으며, 1.11.2는 1.11.1 누적 복구본을 기준으로 한다.
- `OPTION/**`은 수정하거나 전달 ZIP에 포함하지 않는다. 기존 owner-managed `OPTION/SS_OPTION.txt` Pages bridge에도 변경이 없다.
