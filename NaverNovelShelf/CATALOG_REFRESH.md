# Public Naver web-novel catalog maintenance

This public Site is a link-only reading directory. Never copy, store, or
re-host chapter text. Never add SVG assets or inline vector markup.

## Source of truth

- Naver Web Novel public author-search results, matching each pen name exactly:
  - `[곰같은여우]`
  - `[여우같은곰]`
  - `고양이와사비`
  - `[ZERO]` (uppercase; lowercase `[zero]` returns different search results)
  - `닥터X`
- Source search pattern: `https://m.novel.naver.com/search?keyword=<encoded_author>&section=<best|challenge>&target=author`.
- Include all public pages of each Best League and Challenge League search result, not merely the three preview items in the all-results tab.
- On each search result, collect exact pen name, work title, `novelId`, league, publicly served `novel-phinf.pstatic.net` image URL, and genre if present.
- Only exact-author matches and official `/best/list?novelId=` or `/challenge/list?novelId=` links are allowed. Deduplicate by `league:novelId`.
- Do not use private endpoints, logins, CAPTCHA bypass, anti-bot evasion, or broad crawling. If Naver prevents access, retain the last verified catalog.

## Update procedure

1. Read `site/catalog.js`, `site/app.js`, `site/index.html`, and the current hosting manifest.
2. Re-check all five pen names and both leagues from the official public search pages.
3. Compare with `window.NOVEL_CATALOG`. If there are additions, removals, title changes, cover changes, or league changes, update only the catalog records, preserving the 6-field tuple format and existing site design.
4. When catalog records change, update `window.NOVEL_CATALOG_LAST_CHECK` with the date of successful verification. If nothing changed, do not modify source just to record the check date. Retain records if any source check was incomplete.
5. Validate that all `id` values are numeric, `author` is one of the 5 names, `league` is `best` or `challenge`, images use HTTPS `novel-phinf.pstatic.net`, and no records are duplicated.
6. Preserve public site access, all hand-painted WebP assets, SVG prohibition, and the distinct Best League and Challenge League presentation. The visible Korean labels are `베스트리그` and `챌린지리그`; never relabel Challenge League as General League. Mobile cards must remain in 3 columns.
   Preserve full-bleed official 5:4 thumbnails (no oversized dark mat around
   a smaller image) and keep each work's genre visibly labeled on desktop and mobile.
7. Push the verified source and deploy GitHub Pages only when verified catalog records changed. Do not redeploy solely to update a successful-check date.
8. Do not invent results. On lookup failure, retain the prior published data and try again on the next scheduled run.

## Site refresh architecture

- `.github/workflows/novel-shelf-refresh.yml` schedules the public search collector at seven-hour intervals across the week. GitHub may start a scheduled run late. This is a GitHub Actions site job, not a Codex automation.
- The collector updates `site/catalog.js`, `site/catalog-feed.json`, and `integration/catalog.v1.json` together only when verified records change. A failed or incomplete search leaves all three untouched.
- GitHub Pages is rebuilt and deployed only after a changed catalog is committed. The static Firebase and GitHub Pages sites request the public GitHub Pages `catalog-feed.json` on entry and every seven hours while open. If that request fails, the bundled catalog remains visible.
- Direct browser requests to Naver's search pages are blocked by cross-origin policy. The site reads its own published metadata feed; it never stores chapter text.

## Popularity spotlight

- `site/popularity.js` stores a *dated* verified snapshot of works appearing in
  Naver's public Best League daily Top 100, not a fabricated ranking of all works.
- The public website intentionally does **not** show a ranking spotlight or
  a "랭킹에 올랐던 이야기" section. Keep this metadata internal only. Do not
  re-add that UI during automated updates.
- On scheduled checks, inspect the official public
  `https://m.novel.naver.com/best/ranking` page. Match entries by novelId and league,
  and read the displayed ranking basis date. Update the snapshot only if its
  source date is newer; never insert a work without a confirmed current rank.
- If a newer complete top-100 snapshot includes none of our works, use an empty
  `entries` array so the spotlight is hidden. Do not republish older rankings
  as today's or invent an order among unranked works.

The public website is https://gomfox-naver-novels.glassyroot13.chatgpt.site .
