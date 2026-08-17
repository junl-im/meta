# AI 글쓰기 OS — Static Prompt Compiler Runtime

사용자가 제공한 `AI_COMPANY_OS_HUB_V1_EMBED`를 GitHub Pages에서 실제 동작하도록 이식한 공개 런타임입니다.

- 기본 동작: 자연어 요청 → 자동 채널/의도 분류 → 필요한 규칙만 선택 → 강화 실행 프롬프트 생성 → 사용 AI로 전달
- 내 기본 AI: 마지막 선택을 브라우저에 기억하고, 실제 전달 방식과 함께 표시
- 전달: 휴대폰/태블릿 등 Web Share 지원 환경은 시스템 공유창(사용자가 대상 AI 앱 선택), PC는 강화 프롬프트 복사 + 선택 AI 열기, 기타 AI는 복사 fallback
- 연결 정직성: 정적 웹페이지가 임의의 설치 AI 앱을 강제로 지정해 열 수 있다고 표현하지 않음
- 비교: `원문 그대로 보내기`와 `OS로 강화해서 AI에 보내기`를 모두 제공
- Compiler 규칙: `prompt-compiler.json`의 공통 + BLOG/INSTAGRAM/YOUTUBE/PRODUCT/GENERAL + 품질 모드 규칙
- 투명성: 생성된 강화 프롬프트 미리보기/복사/Markdown 저장 가능
- 로컬 설정: 마지막 AI 선택과 사용자 선호를 브라우저 localStorage에만 저장
- 비활성: Remote MCP / 서버 사용자 DB / 서버 API. 현재 저장소는 정적 GitHub Pages이므로 가짜 MCP URL을 만들지 않습니다.
- 공개 배포 안전성: 원본 `01_OWNER_PROFILE.md`는 그대로 공개하지 않고 공개용 기본 프로필로 교체했습니다.
- 서버 Hub로 확장할 때는 `integration-contract.json`을 기준으로 별도 서버/reverse proxy를 연결할 수 있습니다.
