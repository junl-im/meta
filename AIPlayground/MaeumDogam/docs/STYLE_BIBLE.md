# 곰같은여우의 마음도감 — ART / UI STYLE BIBLE v0.1

기준일: 2026-10-24 · 기획 및 제작 검수용 · 기존 AI놀이터 서비스와 분리 보관

## 브랜딩
- 공식 제목: **곰같은여우의 마음도감**
- 한 줄 카피: **나를 발견하는 가장 재미있는 방법**
- 포지셔닝: MBTI 16유형 × ABO 혈액형 4종으로 읽는 재미있는 관계·감정 이야기.
- MBTI·혈액형으로 운명, 건강, 지능, 직업 적합성을 진단한다고 주장하지 않는다. 특히 혈액형 성격론은 **과학적으로 검증된 성격 예측 도구가 아니라 놀이 소재**로 명확히 알린다.
- 무료 이용 기본. 동일 유형을 경직된 고정관념으로 단정하거나 사람을 차별하지 않는다.

## 원화 마스터 캐릭터
'곰같은여우'는 작은 크림색 복슬 여우. 곰처럼 동글동글한 몸·포근한 볼살·까만 콩코, 그러나 뾰족한 살구색 귀와 커다란 복슬 여우 꼬리(흰 끝). 살구빛 볼, 진남색 반짝이는 눈, 작은 탐험가 크로스백과 마음노트. 눈·귀·꼬리 비율을 모든 장면에서 일관되게 유지. 기본 표정은 친근하고 호기심 많은 웃음. 딱딱한 MBTI 로고나 의학적 권위감을 배제.

### 캐릭터용 원본 생성 프롬프트
Original character design for a whimsical Korean personality-story web experience. Tiny friendly teddy-bear-rounded cream fluffy anthropomorphic fox, large peach upright fox ears, luxuriant peach fox tail with pale tip, glossy navy eyes, tiny dark button nose, peach blush, leather explorer satchel, small cream notebook, inviting paw, soft modern picture-book gouache aesthetic, subtle paper texture, full body centered on fully transparent background, no text, no other characters, no watermark, 3/4 view.

## 팔레트와 타이포
- Midnight Ink `#18213A` (본문·외곽)
- Paper Ivory `#FFF9EF` (본문 바탕)
- Peach Coral `#FF8274` (주 행동)
- Mint Cloud `#B8E6D7` (차분한 안내)
- Lilac Story `#D5C3FF` (MBTI)
- Honey Light `#FFD99E` (혈액형)
- 타이틀은 한글 오자 방지를 위해 이미지에 글씨를 굽지 않고 HTML 텍스트/개별 검수 레터링으로 만든다. 상용 웹폰트 라이선스 확인. 권장 읽기 크기 모바일 기본 16px 이상, 본문 대비 WCAG AA를 목표로 한다.

## 끊김 없는 다섯 구간
1. **입구/마음의 숲:** 여우 발자국 길과 낮은 포근한 나무들로 시작. 주 행동 `내 마음 펼치기`.
2. **16유형 마을:** 각기 다른 집/창문/골목 등으로 16유형을 시각화; 반복 자산이지만 캐릭터가 유형별로 명료하게 구별. 세부 유형은 알파벳 약어와 한국어 제목 동시 표기.
3. **네 가지 혈액형 광장:** A/B/AB/O의 **놀이 이야기**를 4개 독립 캐릭터로 제시. 의학적 인과성은 주장하지 않음.
4. **관계의 다리:** 나/친구/연인 등의 조합을 카드로 보여주되 점수는 정량 과학 수치가 아닌 명확히 '놀이 지표'로 표기.
5. **마음극장/공유:** 에피소드 그림책과 공유 카드; 상단 장식이 다음 섹션 길·나뭇잎·천막으로 자연스럽게 넘어가게 제작.

배경 원화는 PC(가로 2400×1200 기준), 모바일(세로 900×1600 기준)로 독립 구도 준비. **가장자리 연결부**는 그림자가 깔리듯 끝나고 다음 배경에서 같은 길·색·식생이 이어지게 해 생경한 경계선을 제거. 텍스트·입력 필드·결과 버튼을 배경 픽셀 속에 박아 넣지 않는다.

## SVG 전면 금지 — 최우선 자산 규칙 (2026-10-25 확정)
- **SVG 파일, 인라인 SVG, SVG 스프라이트, SVG 아이콘 패키지, CSS의 SVG data URI, SVG 대체 이미지 전부 사용 금지.** 품질과 그림체 일관성을 위해 예외를 두지 않는다.
- 캐릭터·로고·버튼·메뉴 아이콘·배경·장식 모두 개별 제작한 고해상도 **PNG 원본**, 실제 웹 배포용으로는 검수한 **WebP/PNG**만 사용한다.
- **SVG가 필요한 상황에도 예외는 없다.** 기능·UI·외부 디자인 자료가 SVG를 요구하면 먼저 같은 역할·형태의 독립 PNG 원화를 확보하거나 적법한 원본을 고해상도 PNG로 래스터화한 뒤 WebP/PNG로 최적화·검수한다. 프로젝트와 배포물에는 SVG 원본·참조를 포함하지 않는다.
- 변환 자산은 원본 출처·라이선스·선택한 래스터 해상도·투명 알파·선명도·WebP 품질과 SHA256을 기록하고 승인된 파일만 적용한다.
- 화면 배치·텍스트·테두리·그림자·반응형 요소는 HTML/CSS로 구성할 수 있지만, 그림·아이콘 자산을 SVG 또는 단순 벡터 모양으로 대체하지 않는다.
- 파일명·소스 참조 금지 검사 `node tests/verify-no-svg.mjs`를 원화/코드 QA의 필수 단계로 포함한다.

## 컴포넌트 및 아이콘
- 모든 버튼: normal/hover/pressed/disabled/focus/selected 상태. 모바일 최소 터치 영역 44×44 CSS px; 우측/하단 안전영역, 화면 확대 시 겹침 금지.
- 아이콘 10종: 책, 나침반, 사람, 여우얼굴, 관계, 네잎클로버, 공유, 뒤로, 음성, 도움말. 24/32/48px용 소스 일관. 일러스트 PNG/WebP 및 의미 있는 alt 텍스트.
- 장식 8종: 잎사귀·구름·별가루·노트·구불길·발자국·모서리 식물·섹션 브릿지.
- 16유형은 16개 **독립 원화 파일**, A/B/AB/O도 4개 독립 파일. 아틀라스 합성 하나만으로 대체하지 않는다.
- 애니메이션: 120–240ms 버튼 반응, 섹션 fade/float 300–500ms; 사용자 reduced-motion 설정 시 정적 전환.
- 무거운 패럴랙스, 과도한 흐림·반짝임·자동 재생 사운드는 지양.

## 자산 생산·검수·추적
- 단일 진실 소스: `ASSET_MANIFEST.json`의 ID·경로. 현재 **57개 계획 자산**.
- 파일 네이밍: 소문자 케밥, 같은 버전 `-v01`, 알파 투명 PNG 원화와 WebP 최적화 파생본 별도.
- 원본은 Google Drive `01_MASTER_원화_투명PNG` 저장, WebP는 `02_WEB_경량WebP`; GitHub에는 실제 배포에 사용할 정리된 에셋만.
- 노션 DB에는 ID, 타입, 검수 상태, 원본 링크, GitHub 경로, 버전, 라이선스/출처를 기록.
- 일러스트별 원본 생성일, 생성 프롬프트, 저작/사용권 주석, 최종 파일 SHA-256, 모바일/데스크톱 리뷰를 체크.
- 색상 대비, 제목 오탈자, 눈·귀·꼬리 비율, 여백, 로딩 속도, 저사양 사용성, 접근성, 파일 크기, 이미지 깨짐 최종 검수 후에만 `approved`.

## 배포 격리 조건
- GitHub `junl-im/meta`의 `AIPlayground/MaeumDogam/`에만 작업.
- `AIPlayground/DalbitUnse/`, `ai-cleaner/`, `.github/workflows/`, 루트 빌드 파일은 사용자의 별도 승인 없이 수정하지 않음.
- `feature/maeumdogam-assets-v01`에서 개발 후 미리보기·테스트·검토가 끝나기 전 `main` 병합/Pages 배포 금지.
