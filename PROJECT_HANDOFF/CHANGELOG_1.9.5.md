# AI Cleaner 1.9.5 — Runtime Vendor / Legacy Korean / Lazy Writing hardening

Date: 2026-08-20

## 절대 보호 규칙
- `OPTION/**`은 수정·이동·삭제·rename·복사·패키징 대상이 아니다.
- 1.9.5 Patch/FULL 전달물에도 `OPTION/**`을 포함하지 않는다.

## 1. 이미지 검사 런타임 CDN 제거
- 브라우저가 jsDelivr에서 ExifReader/C2PA 실행 코드를 직접 가져오던 경로를 제거했다.
- 빌드 단계에서 고정 버전 `exifreader@4.42.0`, `@contentauth/c2pa-web@0.13.4`를 `ai-cleaner/vendor/` 런타임 자산으로 생성한다.
- C2PA WASM도 `vendor/c2pa_bg.wasm`으로 함께 배포한다.
- `.github/scripts/build-runtime-vendor.mjs`가 번들/복사/버전 메타/제3자 라이선스 파일을 생성한다.
- 일반 CI browser-smoke, 일반 Pages package, Daily Pages workflow 모두 런타임 vendor를 먼저 생성한다.
- Pages allowlist에 `ai-cleaner/vendor/`를 추가했다.

## 2. 오래된 한글 파일 가져오기
- TXT byte decoding 우선순위: BOM 기반 UTF-8/UTF-16 → strict UTF-8 → EUC-KR/CP949 fallback.
- CP949/EUC-KR 파일은 브라우저 `TextDecoder('euc-kr')`로 복구한다.
- RTF의 `\\ansicpg949`와 연속 `\\'hh` ANSI byte run을 해당 codepage로 해석한다.
- UTF-16과 EUC-KR/CP949 감지 시 가져오기 toast에 인코딩 정보를 보여준다.
- 기존 파일 import 크기 제한과 async race 방어는 유지한다.

## 3. Blog Factory 초기 부팅 경량화
- `features/ai-writing-os.js`를 core boot 목록에서 제거했다.
- 사용자가 `AI 글쓰기 OS`를 처음 열 때만 lazy script를 로드하고 controller를 만든다.
- 업데이트 draft/local state 복원값은 module이 아직 로드되지 않았어도 pending state로 보존 후 최초 활성화 시 적용한다.

## 4. UI 가독성 floor
- CSS에 남아 있던 9.5px 미만 UI 글자 크기 74개를 9.5px로 올렸다.
- 정적 검사에서 9.5px 미만 `font-size` 재도입을 막는다.

## 5. 회귀 검사
- module check: legacy CP949 TXT + CP949 RTF decoding 포함 PASS.
- static check: 266 passed / 0 failed.
- JS/MJS syntax sweep PASS.
- workflow YAML parse PASS.
- E2E는 53개 구성: CP949 실제 파일 import와 Blog Factory lazy-load 케이스 추가.
- 이 실행 환경은 npm dependency fetch/local Chromium 검증이 제한되어 실제 vendor build 및 53개 browser-smoke 통과 여부는 GitHub Actions가 최종 게이트다.

## 배포 전/후 확인
1. GitHub에 1.9.5 push.
2. `browser-smoke`의 `Build local runtime vendor` 단계 green 확인.
3. 53개 Playwright 테스트 green 확인.
4. `pages-package`에서 vendor build + isolated Pages artifact green 확인.
5. 배포 페이지에서 이미지 검사 1회 실행해 Exif/C2PA 리소스가 `/ai-cleaner/vendor/`에서 로드되는지 확인.
