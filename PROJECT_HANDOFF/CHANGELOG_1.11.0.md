# AI Cleaner 1.11.0

## UI structure / accessibility
- Converted the top-level tool switcher into a complete ARIA tab interface.
- Added roving `tabindex`, synchronized `aria-selected`, and Arrow/Home/End keyboard navigation.
- Added matching `tabpanel` semantics to Text, Image, and Blog Factory sections.

## Responsive cleanup
- Consolidated 13 separate reduced-motion media blocks into one final accessibility contract.
- Merged mobile runtime CSS variables into the canonical root token block.
- Kept Blog Factory mode presets at two columns on ~390px mobile widths and only collapse to one column at 340px and below.
- Added narrow-screen overflow wrapping for Daily Topic and compiler copy.
- Raised mobile disclosure hit areas while preserving compact secondary controls.
- Added extra mobile bottom breathing room so fixed action widgets do not cover the final content edge.

## Regression coverage
- Added browser coverage for keyboard tool-tab navigation.
- Added 390px/320px Blog Factory preset, disclosure-target, and horizontal-overflow checks.
- Static checks now enforce a single reduced-motion block and the explicit narrow responsive contract.

## Protected path
- `OPTION/**` is not included in this patch or full handoff.
- Existing `/OPTION/SS_OPTION.txt` Pages public bridge behavior is unchanged.
