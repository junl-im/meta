# AI Cleaner 1.8.2 — AI Writing OS Prompt Compiler & Adaptive Delivery

Date: 2026-08-18
Baseline: actually delivered `AI_Cleaner_1_8_1_FULL_PROJECT_HANDOFF.zip`

## Scope boundary
- Existing **글 다듬기** and **이미지 검사** tool behavior is preserved. This patch upgrades only the new **AI 글쓰기 OS** corner plus shared version/handoff/test metadata.
- `OPTION/**` remains protected/excluded.
- No external synthetic typing or third-party DOM injection was added.

## Prompt Compiler
- Added `ai-writing-os/prompt-compiler.json` as the declarative rule registry.
- Default generation no longer concatenates the full `00_OPEN_FIRST` / owner / router / state files into every request.
- The compiler now selects only:
  1. common truth/control rules,
  2. the detected channel module (BLOG / INSTAGRAM / YOUTUBE / PRODUCT / GENERAL),
  3. the selected quality/effort rule,
  4. optional local user preferences,
  5. a compact output contract.
- Generated prompt schema is now `schemaVersion: 2` and uses `# AI CLEANER OS — EXECUTION PROMPT`.
- Instagram narrow requests such as `릴스 자막만` now compile only the requested deliverable instead of always forcing the three-part set.

## Simpler delivery
- Replaced the visible `글쓰기 준비 -> 요청문 복사 -> 선택 AI 열기` default path with a primary **`OS로 강화해서 AI에 보내기`** action.
- Added **`원문 그대로 보내기`** as a comparison/control path so users can directly compare OS-assisted vs raw prompting.
- Mobile/touch environments use `navigator.share()` when available; the OS share sheet lets the user choose an installed/available target app.
- Desktop falls back to opening the selected AI while copying the enhanced prompt to the clipboard.
- `기타 AI` is now a visible sixth provider-neutral choice.
- The last selected AI is saved locally (`ai-writing-os-provider-v1`). No API key is required.

## UX
- Hero now explains the product as a local Prompt Compiler rather than a technical Context Pack workflow.
- Result card shows original character count -> enhanced prompt character count, rule count, and detected channel.
- Advanced settings retain quality strength, route diagnostics, local preferences, and public Portable OS ZIP.
- Generated Markdown remains visible/downloadable for transparency and fallback use.

## Safety / honesty
- GitHub Pages remains a static deployment. No fake MCP/API endpoint was introduced.
- Prompt rules explicitly forbid invented purchases, visits, family reactions, effects, and unsupported factual claims.
- Quality modes describe internal review perspectives without claiming that multiple real agents or people executed the task.

## Validation target
- Module checks: PASS.
- Static/architecture checks: 219 / 0 before final version/package audit.
- Browser E2E coverage updated for compact compilation, mobile one-action UX, stale prompt invalidation, provider memory, and top-level tool isolation.
