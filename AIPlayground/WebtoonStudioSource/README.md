# WEBTOON STUDIO 웹 소스 보관

WEBTOON STUDIO v0.6.105 웹판의 변경 파일을 보관합니다. 배포 파일은 `../WebtoonStudio/`에 있습니다.

이 폴더만으로 재빌드할 수는 없습니다. 웹판은 PC판 원본의 `src/core/` 모듈, React, Vite, fflate에 의존합니다. 전체 PC·웹 통합 소스 ZIP에서 이 파일들을 같은 상대 경로로 사용하세요.

원본 저장소에서 `npm run typecheck`, `npm run test:web`, `npm run build:web`을 실행합니다. 웹 검사에는 브라우저에서 저장한 `.wtoon`을 PC판 디코더로 다시 여는 항목과 PNG 초안 ZIP 생성 항목이 있습니다.

웹판은 AI를 호출하지 않고 브라우저 저장소에서 원고를 관리합니다. 최종 연재용 출력은 아직 PC판에서 검증해야 합니다.
