# WEBTOON STUDIO 웹 소스 보관

WEBTOON STUDIO v0.6.105 웹판의 변경 파일을 보관합니다. 배포 파일은 `../WebtoonStudio/`에 있습니다.

이 폴더만으로 재빌드할 수는 없습니다. 웹판은 PC판 원본의 `src/core/` 모듈, React, Vite, fflate에 의존합니다. 전체 PC·웹 통합 소스 ZIP에서 이 파일들을 같은 상대 경로로 사용하세요.

현재 배포본의 웹 편집 기능은 이 폴더의 `src/web/`와 함께 보관합니다. `scripts/upgrade-deployed-web.mjs`와 `scripts/fix-bubble-contour.mjs`는 각각 해당 변경을 **이전 버전 스냅샷에 한 번 적용**하는 재현용 스크립트입니다. 현재 파일은 이미 적용된 상태이므로 다시 실행하지 마세요. 전체 원본을 확보한 뒤에는 이 변경을 원본 빌드에 반영하고 Vite 산출물로 교체해야 합니다.

원본 저장소에서 `npm run typecheck`, `npm run test:web`, `npm run build:web`을 실행합니다. 웹 검사에는 브라우저에서 저장한 `.wtoon`을 PC판 디코더로 다시 여는 항목과 PNG 초안 ZIP 생성 항목이 있습니다.

웹판은 AI를 호출하지 않고 브라우저 저장소에서 원고를 관리합니다. 최종 연재용 출력은 아직 PC판에서 검증해야 합니다.
