# AI Cleaner 1.8.8

날짜: 2026-08-18

## GitHub Actions Daily Engine
- GitHub Pages 배포 방식을 custom GitHub Actions workflow 기준으로 전환.
- 매일 06:20 `Asia/Seoul`에 오늘의 블로그 주제 10개 자동 생성.
- OpenAI Responses API + `web_search`를 GitHub Actions에서만 호출.
- `OPENAI_API_KEY`는 Actions Secret으로만 사용하고 공개 Pages 번들에는 포함하지 않음.
- `BLOG_FACTORY_SEED`를 필수 Actions Variable로 사용. 독자/피할 주제/모델은 선택 Variable.
- 생성 결과를 `ai-cleaner/data/daily-topics.json`에 저장하고 같은 workflow에서 GitHub Pages 배포.
- 일반 `main` push는 API를 호출하지 않고 현재 결과를 포함해 배포만 수행.

## 블로그 팩토리
- 상단에 `오늘 자동 주제` 카드 추가.
- 오늘 날짜의 10개 주제와 TOP 3 우선순위를 표시.
- 각 주제를 `오늘 1편` 프롬프트 빌더로 바로 넘기는 버튼 추가.
- 1.8.7 로컬 자동 준비는 `로컬 프롬프트 자동 준비`로 명칭을 분리.
- provider/AI 열기/외부 앱 전달 기능은 계속 없음.

## 보호
- 글 다듬기/이미지 검사 엔진과 공통 코어는 변경하지 않는다.
- `OPTION/**` 보호 유지.

## 패치 기준
- 연결된 GitHub `junl-im/meta/main`의 현재 배포본 1.8.5를 기준으로 1.8.6/1.8.7 변경까지 포함한 누적 Patch를 제공.
- 1.8.7 전체본 위에 누적 Patch를 덮어도 최종 1.8.8 파일과 동일해야 함.
