# WEBTOON STUDIO 웹 소스

현재 웹 편집기(v0.6.106)의 `src/web/`와 재빌드에 필요한 공용 코어를 보관합니다. 공용 코어는 로컬의 PC판 통합 소스 `WEBTOON_STUDIO_v0.6.99_INTEGRATED.zip`에서 복구했습니다. 웹판 코드가 이 코어와 TypeScript 검사 및 Vite 빌드를 통과했습니다.

```
npm ci --ignore-scripts
npm run typecheck
npm run build:web
npm run verify:deployed
```

출력은 `dist-web/`에 생성됩니다. 운영 파일은 `../WebtoonStudio/`에 있습니다. 빌드 산출물과 운영 JS/CSS가 같은지 `verify:deployed`와 CI에서 검사합니다. 새 빌드를 운영 경로로 옮기기 전에 `.wtoon` 파일 왕복, 말풍선·이미지·PNG 출력, 모바일 조작을 확인하세요.

`src/web/`의 파일 저장과 PNG 출력은 브라우저에서 실행합니다. `scripts/upgrade-deployed-web.mjs`와 `scripts/fix-bubble-contour.mjs`는 이전 스냅샷에 한 번만 적용한 패치이며 현재 소스에 다시 실행하지 않습니다. PC 전용 AI 엔진과 최종 연재용 출력은 이 웹 빌드에 포함되지 않습니다.
