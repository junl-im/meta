# AI Cleaner 1.11.3

## PC F5 새로고침 스크롤 안정화

- `app.css`를 `boot.js`가 뒤늦게 생성하는 방식에서 HTML `<head>`의 정적 stylesheet 링크로 앞당겼습니다.
- 정적 stylesheet는 `assetVersion=1113`과 맞춰 첫 레이아웃부터 최종 CSS 기준으로 계산됩니다.
- `boot.js`는 기존 `#appStylesheet`를 재사용하고 version.json과 버전이 다를 때만 href를 교정합니다.
- 부팅 중에는 `overflow-anchor:none`을 적용해 CSS/부트 과정의 미세한 레이아웃 변화가 Chrome의 scroll anchoring으로 누적되지 않게 했습니다.
- 새로고침 때 강제로 `scrollTo(0,0)` 하지 않습니다. 사용자가 보고 있던 위치를 브라우저가 정상적으로 복원하는 동작은 유지합니다.

## 회귀 방지

- 정적 검사에서 stylesheet가 boot script보다 먼저 선언되는지, HTML assetVersion이 `version.json`과 일치하는지, boot가 기존 stylesheet를 재사용하는지 검사합니다.
- Service Worker cache version을 1.11.3으로 갱신했습니다.
- `OPTION/**`는 변경하지 않습니다.
