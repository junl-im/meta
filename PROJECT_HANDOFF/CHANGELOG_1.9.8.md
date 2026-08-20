# AI Cleaner 1.9.8

## OPTION Pages public bridge hotfix
- Restores the legacy GitHub Pages URL `/OPTION/SS_OPTION.txt` for the separate option-setting program.
- Does **not** modify `OPTION/SS_OPTION.txt`; Pages packaging only copies the owner-managed repository file verbatim when it exists.
- Keeps every other `OPTION/**` path excluded from Pages and keeps all `OPTION/**` content excluded from AI Cleaner FULL/Patch delivery ZIPs.
- Adds `OPTION/SS_OPTION.txt` to the main push trigger so owner updates publish without the former protected-path CI rejection.
- Source-only handoff bundles remain buildable because the shared file is optional when absent.
