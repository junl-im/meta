# v1.14.0

## Text Forensics
- Added a compact `텍스트 포렌식` diagnostic widget to the existing one-click right-side dock.
- Scans the original text without mutating it for zero-width characters, bidi controls, non-standard spaces, soft hyphen, variation selectors, private-use characters, control characters, common mojibake/encoding traces, replacement characters, and existing homoglyph findings.
- Clicking a forensic row locates the corresponding position in the original textarea.
- The panel explicitly does not claim AI authorship or proprietary watermark detection.

## Auto Typewriter Contract
- Corrected the panel help copy to match the established exact-source contract: hidden characters, special spaces, and line breaks are preserved by the auto typewriter.
- No rewrite, normalization, deletion, or content expansion was added to the auto typewriter.

## Compatibility
- Existing issue/review/technical widgets remain intact.
- Forensics is diagnostic-only and does not change the source or auto-typewriter output.
