# v6.8.4 Internal Result Typewriter

- `▶ 원본 자동 작성`: original textarea -> result textarea, one grapheme at a time
- Uses `setRangeText()` incremental insertion; no clipboard and no synthetic keyboard/input events
- Strict final source/result equality verification before state/history commit
- Pause/resume/speed controls; cancel restores pre-run result
- Locks conflicting controls and pauses auto-update while writing
- Keeps `⌨ 원본 직접 쓰기` as a separate physical-keyboard verification mode
- Compact controller so the actual result textarea remains visible while characters appear
