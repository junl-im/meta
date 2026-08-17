# AI Cleaner 1.8.1 — AI Writing OS Simple Start & Practical Audit

Date: 2026-08-17

## Simple-start UX
- The default AI Writing OS screen is reduced to one obvious path: `원하는 글 적기 -> AI 고르기 -> 글쓰기 준비`.
- Technical terms such as Task Pack / Control Plane / Portable OS are no longer required to understand the main flow.
- `작업 강도`, routing details, browser-local profile settings, and public OS ZIP are moved under a closed `고급 설정` section.
- After preparation, the primary actions are only `요청문 복사` and `선택 AI 열기`. Full generated Markdown and `.md` download stay under a collapsed detail section.
- ChatGPT remains the default provider, and the primary `글쓰기 준비` button is disabled until a request exists.

## Practical lifecycle fixes
- Changing provider, task, workforce mode, display name, or preferences immediately invalidates/hides an already prepared request so stale provider/profile context is never presented as current.
- Editing those inputs while preparation is still running cancels the in-flight preparation.
- Preparation uses an `AbortController`, participates in the shared Work Lock, and is cancelled when the user leaves AI Writing OS. This prevents automatic update or late completion from crossing newer navigation intent.
- Repeated OS context reads are cached in the loaded page for faster subsequent preparation without changing the public OS files.
- `선택 AI 열기` opens the provider immediately to preserve popup user activation, then attempts clipboard copy. Popup-blocked browsers receive explicit feedback.

## Regression coverage
- Browser E2E expands from 40 to 43 cases with simple-start layout, stale prepared-request invalidation, and leave-during-prepare cancellation / Work Lock release.
- Static architecture checks expand to 215 checks.
- Existing text cleaner, image inspection, Unicode policy, Worker analysis, Typewriter, Rewrite Studio, and result checkpoint behavior are unchanged.
