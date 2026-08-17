# AI Cleaner 1.8.0 — AI Writing OS Static Embed

Date: 2026-08-17

## New top-level tool
- Added a third top-level tab: `AI 글쓰기 OS`, independent from `AI 글 다듬기` and `AI 이미지 검사`.
- Migrated the user-provided `AI_COMPANY_OS_HUB_V1_EMBED 1.0.0` interaction model into the existing AI Cleaner visual system rather than embedding its standalone UI.
- Preserved provider selection for ChatGPT / Claude / Gemini / Grok / Meta AI, free-form task input, workforce mode, task routing, Task Pack preparation, Markdown download, provider launch, Portable OS ZIP fallback, and per-browser preferences.

## Static GitHub Pages adaptation
- The uploaded Hub assumes a Node backend (`/api/*`), authenticated user storage, and Remote MCP. The current product deploys through GitHub Pages, so those server endpoints are not falsely exposed.
- The live static path generates provider-neutral Task Packs directly in the browser from public OS context files and offers `Task Pack -> public OS ZIP` as the actual delivery path.
- `integration-contract.json` is preserved beside the static runtime so a future server/reverse-proxy Hub can implement Remote MCP without changing the user-facing tool concept.

## Public-repository privacy boundary
- The uploaded `01_OWNER_PROFILE.md` was not copied verbatim into the public Pages runtime. A generic `PUBLIC WEB RUNTIME` profile is used instead.
- User display name / preferences are stored only in browser `localStorage` and merged into generated Task Packs. The UI explicitly warns not to store secrets/API keys/tokens.
- A sanitized `AI_COMPANY_OS_V6_1_PUBLIC.zip` is generated for public download with the same public profile boundary.

## UX integration
- Reused the existing orange/cream cards, buttons, responsive header, typography, notices, focus treatment, and mobile density rules.
- Mobile top navigation now supports three equal tool tabs. The AI Writing OS provider buttons and actions collapse responsively without affecting the cleaner result layout.
- The generated Task Pack is visible in a readonly preview so clipboard-denied environments still have a manual copy path.

## Validation
- Static architecture checks expanded from 197 to 211 checks during implementation.
- Module checks include AI Writing OS BLOG/Instagram/quick/enterprise/grand-challenge/language routing.
- Browser E2E configuration expands from 38 to 40 cases, adding Task Pack generation and cross-tool state isolation/mobile top-nav coverage.
- `OPTION/**` remains protected and excluded from both handoff ZIPs.
