# WEBTOON STUDIO 웹 시험판

이 폴더는 WEBTOON STUDIO v0.6.105의 AI 없는 브라우저 실행 파일입니다. AI 놀이터 홈의 WEBTOON STUDIO 카드에서 들어오며, `AIPlayground/WebtoonStudio/` 경로에서 다른 도구와 분리되어 작동합니다.

컷·말풍선·텍스트·이미지 기본 편집, 레이어 숨김/잠금, 브라우저 IndexedDB 임시저장, PC판과 호환되는 `.wtoon` 열기·저장, 690px PNG 초안 ZIP을 지원합니다. 원고는 이 정적 사이트의 서버에 업로드되지 않습니다.

PNG는 초안입니다. 복잡한 컷 모양, 고급 식자·그리기, 네이버 최종 파일 제한은 아직 PC판과 동등하지 않습니다. 연재용 출력은 PC판에서 확인하세요. 브라우저 저장소는 기기·브라우저에 묶이므로 중요한 원고는 `.wtoon` 파일로 별도 보관해야 합니다.

소스와 재빌드 명령은 WEBTOON STUDIO 소스 통합본의 `src/web/`, `vite.web.config.ts`, `WEB_README.md`에 있습니다. 정적 파일은 `npm run build:web`으로 생성하고 이 폴더에 복사합니다.
