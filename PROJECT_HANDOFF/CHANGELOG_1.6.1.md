# AI Cleaner 1.6.1 — Mobile UI/UX Exception Audit

Date: 2026-08-16

## Baseline
- Patch baseline: the actually delivered `AI_Cleaner_1_6_0_FULL_PROJECT_HANDOFF.zip`.
- User confirmed the 1.6.0 GitHub Actions `browser-smoke` run is green.
- `OPTION/**` remains protected and excluded from delivery ZIPs.

## Mobile viewport / safe-area fixes
- `viewport-fit=cover` is enabled and the main wrapper, sticky header, floating panels, dock, and toast respect safe-area insets. This covers notch/home-indicator and landscape left/right insets.
- `visualViewport.height` is synchronized into `--app-visual-height`. Mobile panel height now has a real visible-viewport cap in addition to `dvh`, reducing keyboard/address-bar overlap differences across mobile browsers.
- A keyboard-visible state is detected only at near-1x scale and gives floating panels more of the remaining visible viewport instead of shrinking compact mode to an unusably small sheet.
- On mobile viewport changes, a focused input/textarea/select inside an open floating panel is scrolled back into the panel body when necessary.

## Orientation / breakpoint cohesion
- `panel-manager.js` tracks mobile/desktop breakpoint crossings. A stale `mobileExpanded` class is cleared when crossing the breakpoint so landscape/desktop transitions do not carry the old mobile expansion state back into portrait.
- Opening a panel on mobile no longer marks its desktop default position as resolved when no desktop position was actually calculated. If the visible panel later crosses to desktop, its default anchor position can be established and then clamped.

## Result navigation user intent
- The 1.6.0 delayed mobile Typewriter result landing is still kept. However, any explicit pointer/touch-equivalent pointer gesture, wheel gesture, keyboard action, or opening another panel cancels the pending delayed jump.
- This prevents the app from pulling the page to the result card after the user has already chosen to inspect something else.
- Page suspension also clears pending result-navigation and visual feedback timers.

## Browser coverage
- E2E count increases from 14 to 17. New cases cover: delayed result-navigation cancellation by user gesture, visible-viewport panel bounds after mobile height change, and mobile-expanded state reset across the 980px breakpoint.

## Local validation
- Static/architecture checks: 153 passed / 0 failed.
- Module/integration checks: PASS, including a direct panel-manager breakpoint transition unit check.
- JavaScript/MJS syntax: PASS.
- GitHub Actions workflow YAML: PASS.
- Local Playwright Chromium: NOT RUN. The single `npm install --ignore-scripts --no-audit --no-fund` attempt hit the 120-second execution limit and was not retried. Partial `node_modules` / `package-lock.json` / test artifacts were removed. GitHub Actions `browser-smoke` remains the final browser verification.
