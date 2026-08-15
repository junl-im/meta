# v6.8.6 UI / Layout Stabilization

- Removed the dedicated 92px desktop bridge column.
- Restored a true equal-width two-card workspace with a compact floating `자동 작성` bridge.
- Bridge status now reflects Typewriter progress, pause and completion.
- Tablet/mobile keeps the bridge in normal document flow between source and result cards.
- Stabilized card header/body alignment, long-label wrapping and scrollbar gutter behavior.
- Added browser geometry regression checks for 1280px desktop and 820px tablet layouts.
- Declared this layout as the UI contract to preserve through v6.9 modularization.
