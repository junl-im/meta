# v1.15.2 — GomFox Reach stability integration

- Added GomFox Reach 2.0 as the fourth top-level tool tab.
- URL intake first attempts a normal browser fetch, then falls back to Jina Reader for public pages when CORS/site delivery blocks the browser request.
- Manual source paste remains the guaranteed fallback and the pasted source is never automatically rewritten.
- Added exact source copy, local keyword frequency analysis, search-query expansion, headline/hook candidates, reuse guidance, full-result copy, and TXT export.
- Added URL scheme validation, localhost/private-network blocking, request timeouts, stale-request cancellation, and analysis length cap without mutating the source textarea.
- Existing text cleaner/typewriter, image analyzer, Blog Factory, forensic widgets, PWA and OPTION protections remain separate.
