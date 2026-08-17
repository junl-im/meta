# AI 글쓰기 OS — Static Embed Runtime

사용자가 제공한 `AI_COMPANY_OS_HUB_V1_EMBED`를 GitHub Pages에서 실제 동작하도록 이식한 공개 런타임입니다.

- 동작: provider 선택, task routing, Task Pack 생성/복사/MD 다운로드, 선택 AI 열기, 공개용 Portable OS ZIP, 브라우저 로컬 선호
- 비활성: Remote MCP / 서버 사용자 DB / 서버 API. 현재 저장소는 정적 GitHub Pages이므로 가짜 MCP URL을 만들지 않습니다.
- 공개 배포 안전성: 원본 `01_OWNER_PROFILE.md`는 그대로 공개하지 않고 공개용 기본 프로필로 교체했습니다. 개인 선호는 브라우저 localStorage에만 저장됩니다.
- 서버 Hub로 확장할 때는 `integration-contract.json`을 기준으로 별도 서버/reverse proxy를 연결할 수 있습니다.
