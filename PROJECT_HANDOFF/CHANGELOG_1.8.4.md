# AI Cleaner 1.8.4 — AI Writing OS Copy-First Delivery Safety

Date: 2026-08-18
Baseline: actually delivered `AI_Cleaner_1_8_3_FULL_PROJECT_HANDOFF.zip`

## Scope boundary
- Existing **AI 글 다듬기** and **AI 이미지 검사** engines remain unchanged.
- This patch changes only the new **AI 글쓰기 OS** delivery bridge plus version/handoff/test metadata.
- `OPTION/**` remains protected/excluded.

## Root cause found
- In 1.8.3, the non-share fallback executed provider launch before clipboard copy: `openWindow(provider) -> navigator.clipboard.writeText(prompt)`.
- In restrictive in-app browsers such as KakaoTalk WebView, opening/navigating a provider can consume or change the user-gesture context needed by clipboard APIs. The visible symptom is exactly: **ChatGPT opens, but there is nothing useful to paste**.

## Delivery fix
- Delivery is now **copy-first**. The provider is opened only after a copy path reports success.
- Added a user-gesture synchronous clipboard fallback using a temporary readonly textarea + `document.execCommand('copy')` for WebViews where Async Clipboard is unavailable/blocked.
- Async `navigator.clipboard.writeText()` remains as the modern fallback.
- Known restricted in-app browser signatures (including KakaoTalk-style WebViews) skip the native-share assumption and show an explicit `인앱 브라우저 안전 연결` plan.
- If every clipboard path fails, the app **does not open the AI provider**. It keeps the generated prompt on screen, selects it for manual copy, and tells the user what to do next.
- The secondary provider button is now an **AI-only open** recovery action; it no longer attempts another hidden copy.

## UX wording
- Desktop/in-app copy language now says **복사 확인 후 AI 열기** rather than implying simultaneous guaranteed copy+open.
- Advanced help text states that a blocked clipboard stops provider launch.

## Regression coverage
- Static architecture guard verifies `writeClipboard(...)` occurs before `openWindow(...)` in the delivery function.
- Static guard verifies legacy in-app clipboard fallback and fail-closed behavior.
- New browser E2E case records delivery events and requires `['copy', 'open']` in a KakaoTalk-style environment.
- New browser E2E case blocks both clipboard paths and requires provider open count to remain `0`.
- Local static/architecture: **227 passed / 0 failed**.
- Module checks: PASS.
- GitHub Actions `browser-smoke` remains the final real-browser gate after push.
