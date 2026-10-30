# AI놀이터 서재 × 소리온 낭독 연동

## 공식 관리 기준

- **개발 원본**: GitHub `junl-im/meta` → `NaverNovelShelf/site/`
- **AI놀이터에 연결된 공개 경로**: `https://meta-deee1.web.app/NaverNovelShelf/site/`
- **낭독 화면**: 같은 폴더의 `listen.html`. 홈페이지에서 상대 링크로 진입
- **브라우저 연결 확장**: `NaverNovelShelf/extension/sorion-naver-reader/`. 다운로드 ZIP은 `site/downloads/`
- 기존 별도 ChatGPT Sites 주소 및 `gomfox-novel-shelf` 저장소는 개발 이력 보관용이며, AI놀이터 공개본의 운영 기준이 아님

## 회차 자동 전달

1. 사용자가 AI놀이터 서재에서 네이버 작품을 선택하고 회차를 엶
2. PC Chrome/Whale 확장이 네이버의 현재 무료·공개 회차 `#con_data`를 읽음. 버튼 클릭 전에는 본문을 수집하지 않음
3. 본문이 확장 `chrome.storage.session`에만 잠시 저장되고, 일회용 토큰으로 같은 Firebase 도메인 내 낭독 화면에 전달됨
4. 전달 후 임시 본문 삭제. 브라우저 작업실에서만 미리보기하며 GitHub·Firebase Hosting 정적 파일로 본문을 올리지 않음
5. 소리온 FastAPI / CosyVoice3 엔진 연결 시에만 해당 성우 낭독이 활성화됨. 기본 음성 대체 버튼은 소리온 목소리로 표시하지 않음

## 동기화 기준과 검증

- 작품 목록은 **meta** 서재의 번들 `catalog.js` + 현재 운영 중인 GitHub Pages `catalog-feed.json`(동적 최신 목록)을 따른다.
- 2026-10-30 기준 라이브 목록 29편 확인. 성우 확장에 29개 ID를 등록함. 이후 신규 작품에는 확장 ID 목록 갱신이 필요함.
- `node NaverNovelShelf/scripts/test-sorion-capture.cjs`로 선택 회차 추출과 임시 전달 검증.
- `node NaverNovelShelf/scripts/test-sorion-integration.cjs`로 정적 계약 및 ZIP 검사.
- SVG 없음. 기존 작품 목록·검색·작품 URL·AI놀이터 복귀 링크 유지.

## 운영 제약

- 모바일 기본 브라우저는 데스크톱 확장 프로그램을 지원하지 않아 모바일 자동 인식은 후속 과제.
- 네이버 로그인·유료회차 접근 우회, 다른 저작자의 작품 일괄 수집을 지원하지 않음.
- 기존 SoriON v0.11.37 소스에는 실제 승인 음색용 기준 WAV와 공개 HTTPS 엔진이 없어 아직 AI 성우가 실제로 합성되는 상태가 아님.
- Firebase 실제 공개 배포는 `meta`의 `.github/scripts/build-pages-artifact.mjs`로 `.pages-site` 빌드 후 해당 프로젝트의 Hosting 권한으로 배포해야 함. GitHub `main` 커밋만으로 Firebase 주소의 배포가 자동 확정되는 건 아님.
