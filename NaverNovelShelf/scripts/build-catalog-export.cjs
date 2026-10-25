#!/usr/bin/env node
"use strict";

/* Deterministic public metadata export for the separate AI Playground.
   This reads the site's own verified catalog. No chapter text is included. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "dist/catalog.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(source, context, { filename: "catalog.js", timeout: 2000 });
const works = context.window.NOVEL_CATALOG;
if (!Array.isArray(works) || works.some(w =>
  !/^\d+$/.test(w.id) || !["best", "challenge"].includes(w.league) ||
  !/^https:\/\/novel-phinf\.pstatic\.net\//.test(w.image) ||
  w.url !== `https://m.novel.naver.com/${w.league}/list?novelId=${w.id}`
)) throw new Error("Invalid public catalog record");

const output = {
  schema_version: 1,
  app_id: "gomfox-naver-novel-shelf",
  source_site: "https://gomfox-naver-novels.glassyroot13.chatgpt.site",
  catalog_last_verified: context.window.NOVEL_CATALOG_LAST_CHECK,
  copyright_policy: "metadata-and-links-only",
  navigation_mode: "open-official-naver-novel-url",
  works: works.map(w => ({
    id: w.id,
    title: w.title,
    author_search_identity: w.author,
    league: w.league,
    genre: w.genre,
    official_url: w.url,
    cover_thumbnail_url: w.image
  }))
};
if (new Set(works.map(w => w.league + ":" + w.id)).size !== works.length)
  throw new Error("Duplicate official Naver IDs");
const dir = path.join(root, "dist/integration");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "catalog.v1.json"), JSON.stringify(output, null, 2) + "\n");
console.log(`Exported ${works.length} public Naver works`);
