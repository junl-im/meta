import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const files = {
  html: path.join(root, 'index.html'),
  app: path.join(root, 'js', 'app.js'),
  image: path.join(root, 'js', 'image-analyzer.js'),
  css: path.join(root, 'css', 'app.css'),
  version: path.join(root, 'version.json'),
  regression: path.join(root, 'tests', 'regression.js'),
  previewPs1: path.join(root, 'tests', 'preview.ps1'),
  previewCmd: path.join(root, 'tests', 'START-PREVIEW.cmd')
};

const failures = [];
const passes = [];
const pass = (name, detail = '') => passes.push({ name, detail });
const fail = (name, detail = '') => failures.push({ name, detail });

for (const [name, file] of Object.entries(files)) {
  if (fs.existsSync(file)) pass(`required file: ${name}`, path.relative(root, file));
  else fail(`required file: ${name}`, `missing ${path.relative(root, file)}`);
}

if (failures.length === 0) {
  const html = fs.readFileSync(files.html, 'utf8');
  const app = fs.readFileSync(files.app, 'utf8');
  const image = fs.readFileSync(files.image, 'utf8');
  const css = fs.readFileSync(files.css, 'utf8');
  const previewPs1 = fs.readFileSync(files.previewPs1, 'utf8');
  const versionData = JSON.parse(fs.readFileSync(files.version, 'utf8'));

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set();
  const dup = [...new Set(ids.filter((id) => seen.has(id) || !seen.add(id)))];
  dup.length ? fail('duplicate HTML ids', dup.join(', ')) : pass('duplicate HTML ids', `0 duplicates across ${ids.length} ids`);

  const idSet = new Set(ids);
  const refs = new Set();
  const selectorPatterns = [
    /(?:\$|q)\(["']#([A-Za-z][\w:-]*)["']\)/g,
    /getElementById\(["']([A-Za-z][\w:-]*)["']\)/g
  ];
  for (const source of [app, image]) {
    for (const re of selectorPatterns) for (const m of source.matchAll(re)) refs.add(m[1]);
  }
  const missingRefs = [...refs].filter((id) => !idSet.has(id)).sort();
  missingRefs.length ? fail('JavaScript DOM id references', missingRefs.join(', ')) : pass('JavaScript DOM id references', `${refs.size} referenced ids all exist`);

  const exifVersion = /EXIF_VERSION\s*=\s*['"]4\.42\.0['"]/.test(image);
  const exifLazyUrl = /exifreader@\$\{EXIF_VERSION\}\/dist\/exif-reader\.js/.test(image) && /document\.createElement\(['"]script['"]\)/.test(image);
  exifVersion && exifLazyUrl ? pass('ExifReader lazy-load pin', '4.42.0') : fail('ExifReader lazy-load pin', 'expected EXIF_VERSION 4.42.0 and lazy script loader');

  const c2paPin = /C2PA_VERSION\s*=\s*['"]0\.13\.4['"]/.test(image);
  c2paPin ? pass('c2pa-web version pin', '0.13.4') : fail('c2pa-web version pin', 'expected C2PA_VERSION = 0.13.4');

  const appPos = html.indexOf('js/app.js');
  const imagePos = html.indexOf('js/image-analyzer.js');
  appPos >= 0 && imagePos > appPos ? pass('script load order', 'app.js → image-analyzer.js; ExifReader is lazy-loaded') : fail('script load order', `positions app=${appPos}, image=${imagePos}`);

  const protectedUnicode = ['0x200C', '0x200D', '0x2060'];
  const unicodeOk = protectedUnicode.every((token) => app.includes(token));
  unicodeOk ? pass('meaning-sensitive Unicode guard', protectedUnicode.join(', ')) : fail('meaning-sensitive Unicode guard', 'ZWJ/ZWNJ/WORD JOINER guard missing');

  /trainedAlgorithmicMedia/.test(image) && /digitalCapture/.test(image)
    ? pass('C2PA source-type distinction', 'AI-trained-media and digital-capture tokens present')
    : fail('C2PA source-type distinction', 'source-type tokens missing');

  const requiredCss = ['.xray', '.v62review', '.signalgrid', '.provenanceGrid', '.floatPanel'];
  const missingCss = requiredCss.filter((token) => !css.includes(token));
  missingCss.length ? fail('required UI styles', missingCss.join(', ')) : pass('required UI styles', requiredCss.join(', '));

  /data:image\/(png|jpeg|webp);base64,/i.test(html)
    ? fail('embedded base64 image bloat', 'data:image base64 found in index.html')
    : pass('embedded base64 image bloat', 'none in index.html');

  const previewLocalOnly = /IPAddress\]::Loopback/.test(previewPs1) && /Resolve-Path \(Join-Path \$PSScriptRoot '\.\.'\)/.test(previewPs1);
  previewLocalOnly ? pass('local preview scope', 'loopback + ai-cleaner root') : fail('local preview scope', 'preview server must remain loopback-only and rooted at ai-cleaner');

  const metaVersion = html.match(/<meta\s+name=["']app-version["']\s+content=["']([^"']+)["']/i)?.[1] || '';
  const appVersion = app.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/)?.[1] || '';
  const jsonVersion = String(versionData.version || '');
  if (metaVersion && metaVersion === appVersion && appVersion === jsonVersion) pass('app version markers', jsonVersion);
  else fail('app version markers', `html=${metaVersion || '-'}, app=${appVersion || '-'}, json=${jsonVersion || '-'}`);

  const updateGuard = /fetch\(`version\.json\?ts=\$\{Date\.now\(\)\}`/.test(app) && /cache:\s*['"]no-store['"]/.test(app) && /location\.replace\(/.test(app);
  updateGuard ? pass('automatic cache refresh guard', 'version.json + no-store + cache-busting navigation') : fail('automatic cache refresh guard', 'automatic version refresh guard missing');
}

for (const p of passes) console.log(`PASS ${p.name}${p.detail ? ` — ${p.detail}` : ''}`);
for (const f of failures) console.error(`FAIL ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
console.log(`\nSummary: ${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
