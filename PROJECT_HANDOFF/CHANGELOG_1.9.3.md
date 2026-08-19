# AI Cleaner 1.9.3

날짜: 2026-08-19

## GitHub Pages 배포 격리
- 일반 CI와 Daily Blog Factory workflow가 저장소 루트 `.` 전체를 Pages artifact로 업로드하던 구조를 제거.
- 새 `.github/scripts/build-pages-artifact.mjs`가 공개 런타임에 필요한 파일만 `.pages-site/`에 명시적으로 복사한다.
- 공개 대상은 루트 `index.html`과 `ai-cleaner/`의 런타임 파일/디렉터리(`index.html`, `site.webmanifest`, `version.json`, `assets`, `css`, `data`, `js`, `ai-writing-os`)로 제한.
- `OPTION/**`, `PROJECT_HANDOFF/**`, `.github/**`, `package.json`, `ai-cleaner/tests/**`, `ai-cleaner/MIGRATION.md`는 Pages artifact에 들어가지 않도록 차단.
- `OPTION/**`은 소스에서 읽거나 복사하지 않으며, 이번 패치 ZIP/FULL ZIP에도 포함하지 않는다.

## UI 가독성
- 빈 상태 안내와 footer의 옅은 갈색 텍스트를 기존 `--muted` 색으로 통일해 작은 글씨의 대비를 보강.

## 회귀 방지
- 정적 검사에 `Pages artifact isolation`과 `Pages runtime allowlist` 검사를 추가.
- 두 workflow 모두 `.pages-site`만 업로드하는지 검사.
- Pages builder 자체가 보호/비런타임 경로를 거부하는지 검사.

## 검증
- Pages builder 직접 실행 PASS.
- 생성된 `.pages-site`에 `OPTION`, `PROJECT_HANDOFF`, `.github`, `tests`, `MIGRATION.md`, `package.json` 없음 확인.
- JavaScript/MJS 문법 검사 PASS.
- 모듈 검사 PASS.
- 정적 회귀 검사 PASS.
