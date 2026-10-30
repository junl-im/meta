# 곰같은여우의 소설 서재 — AI놀이터 연동 명세

> 본 서비스는 네이버 웹소설 **원문 복제 사이트가 아닌 공식 링크 서재**입니다.

## 보관 위치와 역할

- 공개 웹사이트 / 웹 자산 / 사용자 화면: Firebase Hosting `meta-deee1`의 `/NaverNovelShelf/site/`
- GitHub `junl-im/meta/NaverNovelShelf/`: **공식 원본 소스**, 작품 메타데이터 및 연동 규칙
- Google Drive `곰같은여우의 소설 서재/`: 시점별 소스·이미지 백업 ZIP
- Notion `곰같은여우의 소설 서재 — MASTER 개발·연동 기록`: 사양·운영 기준
- 현재 AI놀이터: `/ai-cleaner/`의 소설 서재 입구와 연결되어 작품을 표시하고 네이버 공식 링크로 이동

## 기계가 읽는 내보내기

프로젝트 경로에서 `node scripts/build-catalog-export.cjs` 실행.

결과물: `NaverNovelShelf/site/catalog-feed.json`

공개 URL: `https://meta-deee1.web.app/NaverNovelShelf/site/catalog-feed.json`

JSON 필드:

| 필드 | 용도 |
| --- | --- |
| `schema_version` | JSON 계약 버전 (`1`) |
| `app_id` | 향후 AI놀이터 서비스 구분키 |
| `source_site` | 읽을 작품을 고르는 원래 사이트 |
| `catalog_last_verified` | 네이버 공개 검색 마지막 확인일 |
| `copyright_policy` | 본문 재배포 금지(`metadata-and-links-only`) |
| `works[]` | 작품 ID, 제목, 원문 필명, 리그, 장르, 공식 목록 링크, 표지 URL |

## 표시·연동 규칙

1. 화면에서 필명별로 묶지 않습니다. 내부 데이터에만 필명을 보유해 정확한 네이버 검색을 수행합니다.
2. 공개 화면의 리그는 `베스트리그`와 `챌린지리그`이며 JSON 내부 값은 각각 `best`와 `challenge`입니다.
3. 모바일 표지는 가로 3개씩 배치합니다. 일러스트는 WebP 기반이며 SVG를 추가하지 않습니다.
4. 작품/회차를 열 때는 네이버 공식 URL을 새 탭으로 열고, 브라우저가 멈추면 해당 탭만 닫고 재시도하도록 안내합니다.
5. 본문·회차 텍스트, 로그인 정보, 개인 열람 이력은 외부 JSON이나 GitHub로 절대 내보내지 않습니다.
6. 공개 서재에는 과거 랭킹 기록 구간을 표시하지 않습니다. 랭킹 데이터는 내부 참고용으로만 관리하며, 최신순 전체 목록을 임의로 인기순이라고 부르지 않습니다.

## 이후 연동

AI놀이터는 위 JSON을 읽고 표지 카드·장르 필터·베스트/챌린지리그 화면을 구성할 수 있습니다.
기존 AI놀이터 코드는 이 단계에서 변경하지 않습니다. CORS는 실제 AI놀이터 출처에서 테스트한 후 결정해야 합니다.

새 작품을 발견하면 `dist/catalog.js` 수정 → 정합성 점검 → JSON 재생성 → GitHub `meta` 업데이트 → GitHub Pages/Firebase 동기화 → Drive 백업의 순서로 동기화합니다.
Notion에는 변경 이력과 검증 날짜를 기록합니다. 현재 자동 갱신은 작품 검색 확인을 위한 일정이며, GitHub·Drive·Notion 연동의 완전 자동화는 별도 인증·검증이 필요합니다.
