# 1.13.4

## Browser-smoke Escape cancellation race fix

- Fixed the remaining dirty-input typewriter cancellation race without changing the original-text typing contract.
- `focusOpenedPanel()` now focuses a newly opened floating panel synchronously and re-asserts focus on the next animation frame.
- This prevents the clicked `자동작성 원본 새로쓰기` button from becoming disabled while it still owns focus, which could cause Chromium/Playwright to drop an immediately-following Escape key before any window/document handler received it.
- The existing window capture Escape cancellation remains as a second layer of protection.
- E2E now explicitly verifies that the typewriter panel owns focus before sending Escape, making the intended keyboard-accessibility contract observable and deterministic.
- No source normalization, rewriting, augmentation, paste simulation, or typewriter output semantics were changed.
