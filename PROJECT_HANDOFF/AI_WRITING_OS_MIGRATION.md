# AI Writing OS Migration Notes — 1.8.0

## Source
User-provided package: `AI_COMPANY_OS_HUB_V1_EMBED` V1, containing AI COMPANY OS V6.1.

## Live GitHub Pages mapping
| Uploaded Hub | 1.8.0 static runtime |
|---|---|
| `public/index.html` standalone Hub | `#writingTool` third top-level tool inside existing UI |
| `public/app.js` API client | `js/features/ai-writing-os.js` browser-local controller |
| `src/router.mjs` | browser-local `routeTask()` with same channel/workforce rules |
| `src/task-pack.mjs` | browser-local Task Pack + Markdown generation |
| `adapters/providers.json` | `ai-writing-os/providers.json` |
| `os/current` fast context | public fast context files under `ai-writing-os/os/current/` |
| `/api/prepare`, `/api/context-pack` | local browser generation; no fake API |
| Remote MCP | not live on GitHub Pages; contract retained for future server Hub |
| user JSON store | localStorage preferences only |
| original Portable OS ZIP | sanitized public Portable OS ZIP |

## Privacy decision
The repository is public. Therefore the uploaded personalized owner profile is not published verbatim. The public runtime uses a generic profile, while user-entered preferences stay in localStorage and are inserted only into the generated Task Pack.

## Future Remote MCP activation
A future server/reverse-proxy deployment may implement `ai-cleaner/ai-writing-os/integration-contract.json`. Authentication must come from a trusted server session; browser-supplied arbitrary user IDs must not be trusted. Do not put server secrets or MCP access slugs into this public repository.
