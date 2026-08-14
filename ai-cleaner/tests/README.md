# AI Cleaner browser regression lab

이 폴더는 `ai-cleaner` 마이그레이션 브랜치를 `main`에 합치기 전에 브라우저 동작을 확인하기 위한 수동 회귀 테스트 도구입니다.

## Windows + GitHub Desktop에서 실행

1. GitHub Desktop에서 `agent/ai-cleaner-migration` 브랜치를 체크아웃합니다.
2. **Repository → Show in Explorer**를 누릅니다.
3. `ai-cleaner/tests/START-PREVIEW.cmd`를 더블클릭합니다.
4. 브라우저가 `http://127.0.0.1:8765/tests/`를 자동으로 엽니다.
5. 먼저 **핵심 테스트 실행**을 누릅니다.
6. 인터넷 연결이 가능한 환경에서는 **CDN/C2PA 네트워크 테스트**도 실행합니다.
7. 테스트가 끝나면 검은 PowerShell 창에서 `Ctrl+C`로 로컬 서버를 종료합니다.

`START-PREVIEW.cmd`는 PowerShell로 `127.0.0.1`에 읽기 전용 정적 서버를 띄웁니다. 서버의 루트는 `ai-cleaner/`로 제한되어 있으며 저장소의 `OPTION/` 폴더에는 접근하지 않습니다.

## 기대 결과

핵심 테스트에서 확인하는 항목:

- 필수 DOM 요소 존재
- standard / safe / inspect Unicode 정리 프로필
- ZWJ 및 Variation Selector 보존
- NFKC 옵션
- X-ray 코드포인트 표시
- 문장 검토 카드
- ExifReader 로딩
- 합성 PNG 로컬 이미지 분석
- C2PA 검사 코드 경로 실행

네트워크 테스트에서 확인하는 항목:

- ExifReader CDN 로딩
- C2PA 공식 공개 테스트 이미지 다운로드
- `@contentauth/c2pa-web` manifest 판독
- validation 결과와 `digitalSourceType` 표시

## 실패했을 때

테스트 화면의 빨간 항목에 원인이 함께 표시됩니다. 스크린샷이나 표시된 오류 문구를 그대로 남기면 재현에 도움이 됩니다.

이 테스트는 GitHub Pages 배포 설정을 변경하지 않습니다.
