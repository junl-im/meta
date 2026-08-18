# 블로그 팩토리 — V1.8.8 GitHub Actions Daily Engine

AI Cleaner의 세 번째 도구 **블로그 팩토리**는 1.8.8부터 두 층으로 동작합니다.

1. **Daily Engine**: GitHub Actions가 매일 자동으로 실제 오늘의 주제 10개를 생성해 `data/daily-topics.json`에 저장하고 GitHub Pages를 배포합니다.
2. **로컬 프롬프트 빌더**: 사용자가 직접 주제 씨앗을 넣어 `오늘의 주제`, `오늘 1편`, `3편 생산`, `소재 20개`, `자유 요청` 프롬프트를 만들고 화면에서 확인한 뒤 복사합니다.

특정 AI 선택, AI 새 탭 열기, 시스템 공유 전달은 사용하지 않습니다.

## Daily Engine 흐름

`GitHub Actions schedule → OpenAI Responses API + web_search → 오늘의 주제 10개 → daily-topics.json → GitHub Pages 배포 → 블로그 팩토리 카드 표시`

기본 스케줄은 **매일 06:20 Asia/Seoul**입니다. Actions의 수동 실행(`workflow_dispatch`)으로 즉시 새로 생성할 수도 있습니다. 일반 `push`에서는 API를 다시 호출하지 않고 현재 저장된 데이터를 포함해 Pages만 배포합니다.

## 최초 설정

GitHub 저장소에서 아래 값만 설정합니다. 브라우저 코드에는 API 키를 넣지 않습니다.

### Actions Secret

- `OPENAI_API_KEY` — 필수

### Actions Variables

- `BLOG_FACTORY_SEED` — 필수. 예: `육아, 아이와 갈 곳, 생활정보, 주말 나들이`
- `BLOG_FACTORY_AUDIENCE` — 선택. 예: `초등 자녀가 있는 30~40대 부모`
- `BLOG_FACTORY_AVOID_TOPICS` — 선택. 이미 자주 쓴 소재나 피할 주제
- `OPENAI_MODEL` — 선택. 비어 있으면 generator의 기본 모델을 사용

Pages 설정은 `Settings → Pages → Build and deployment → Source → GitHub Actions`로 전환합니다. 그 뒤 `Actions → Daily Blog Factory + GitHub Pages → Run workflow`를 한 번 실행해 초기 데이터와 배포를 확인합니다.

## 오늘의 주제 카드

`data/daily-topics.json`이 오늘 날짜의 `ready` 상태이면 블로그 팩토리 상단에 10개가 표시됩니다. 우선순위 상위 3개는 TOP 3로 강조합니다.

각 카드의 `이 주제로 글 만들기`를 누르면 해당 주제의 검색 의도, 오늘 쓰는 이유, 차별화 각도, 확인할 자료가 `오늘 1편` 입력으로 넘어갑니다. 이후 기존 V7 Blog Factory 프롬프트를 만들고 복사하면 됩니다.

## 로컬 프롬프트 자동 준비

1.8.7의 로컬 자동 준비는 삭제하지 않고 **로컬 프롬프트 자동 준비**로 이름을 명확히 했습니다. 이것은 브라우저가 닫힌 동안 AI를 실행하지 않습니다. Daily Engine과 별개의 로컬 보조 기능입니다.

## 실패 경계

- Daily Engine 생성이 실패하면 workflow를 실패 처리해 잘못된 빈 결과를 배포하지 않습니다. 기존 Pages 배포본은 그대로 남습니다.
- 생성 결과는 정확히 10개 제목이 있는지 검증한 뒤 JSON을 덮어씁니다.
- API 키는 JSON/HTML/JS에 기록하지 않습니다.
- 사용자의 실제 방문·구매·사용 경험을 모델이 지어내지 않도록 generator 프롬프트에 명시합니다.
- 최신 정보가 필요한 소재는 web search를 허용하지만, 확인되지 않은 검색량·조회수·효과 수치는 만들지 않도록 제한합니다.

## 주요 파일

- `.github/workflows/daily-blog-factory-pages.yml` — 예약 생성 + 저장 + Pages 배포
- `.github/scripts/generate-daily-topics.mjs` — OpenAI Responses API 호출/검증/JSON 생성
- `ai-cleaner/data/daily-topics.json` — 공개 Pages가 읽는 오늘의 주제 데이터
- `ai-cleaner/js/features/ai-writing-os.js` — Daily Engine 카드 표시 + 선택 주제를 기존 빌더로 전달
- `ai-cleaner/ai-writing-os/*` — V7 OS manifest/compiler/runtime 자료
