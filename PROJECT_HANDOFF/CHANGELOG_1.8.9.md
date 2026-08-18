# AI Cleaner 1.8.9

## Blog Factory public UI polish

- 사용자 화면에서 GitHub/GitHub Pages/Actions/Secret/Variable 같은 운영·배포 설명을 제거했습니다.
- 자동 주제가 없는 상태는 `준비 전`과 간단한 재확인 안내만 표시합니다.
- 자동 주제가 있을 때 모델명/배포 정보 대신 준비 시각, 최신 정보 확인 여부, TOP 3 추천만 보여줍니다.
- 상단 `1 자동 주제 → 2 하나 선택 → 3 글 프롬프트 → 4 복사` 단계 바를 데스크톱에서도 중앙 정렬합니다.
- 고급 설정의 실행 방식 설명도 제품 용어 중심으로 단순화했습니다.
- Daily Engine, GitHub Actions workflow, API Secret 처리 방식 자체는 변경하지 않았습니다.
- assetVersion을 189로 올려 기존 CSS/JS 캐시가 새 UI를 가리지 않게 했습니다.
