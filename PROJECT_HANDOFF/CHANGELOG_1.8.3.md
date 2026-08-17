# AI Cleaner 1.8.3 — AI Writing OS Linkage & Clarity UX

Date: 2026-08-18
Baseline: actually delivered `AI_Cleaner_1_8_2_FULL_PROJECT_HANDOFF.zip`

## Scope boundary
- Existing **AI 글 다듬기** and **AI 이미지 검사** engines are preserved.
- This update targets the new **AI 글쓰기 OS** corner plus version/handoff/test metadata.
- `OPTION/**` remains protected/excluded.

## Clearer product explanation
- Reworded the hero around the user's goal: natural language is converted into an execution prompt containing only the needed rules, format, and review criteria.
- Demoted `Prompt Compiler` jargon from the main explanation; technical details remain under advanced settings.
- Added a simple three-part explanation: `작업 파악 / 규칙 보강 / 안전 검수`.

## Stronger AI linkage UX
- Renamed the provider concept to **`내 기본 AI`** and kept last-choice browser memory.
- Added a visible `현재 연결 방식` card that changes with device/provider.
- Desktop: provider-aware CTA such as `OS로 강화해서 ChatGPT 열기`; the app opens the provider and attempts clipboard copy.
- Mobile/touch with Web Share: CTA becomes `OS로 강화해서 공유하기`; wording explicitly states that the browser cannot force-open a specific third-party AI app and the user selects it in the OS share sheet.
- `기타 AI`: provider-neutral copy flow.
- Raw send remains as a lower-priority comparison action.

## Result clarity
- Added four applied-rule chips after compilation (detected channel, factuality protection, result-first contract, selected quality mode).
- Added actual handoff result text and next-step guidance for share, share cancel, copy+open, open-only, copy-only, and blocked cases.
- Provider fallback button becomes provider-specific (`ChatGPT 다시 열기`, etc.) and hides for provider-neutral `기타 AI`.

## Safety / honesty
- No API key required.
- No fake MCP/API connection.
- No external synthetic typing or third-party DOM injection.
- Mobile share limitations are stated directly in the UI.

## Validation target
- Static/architecture checks extended for delivery-plan visibility, mobile handoff honesty, dynamic CTA, and result guidance.
- Browser E2E extended with a mocked native-share path.
