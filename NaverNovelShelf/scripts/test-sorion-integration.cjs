const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const html = read('site/listen.html');
const js = read('site/listen.js');
const css = read('site/listen.css');
const manifest = JSON.parse(read('extension/sorion-naver-reader/manifest.json'));
const capture = read('extension/sorion-naver-reader/naver-capture.js');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

for (const m of js.matchAll(/\$\('([^']+)'\)/g)) assert(ids.has(m[1]), 'missing element #' + m[1]);
for (const m of html.matchAll(/<script\s+src="([^"]+)"/g)) {
  if (m[1] === './catalog.js') continue; // meta 원본 빌드 파일이 따로 있음
  assert(fs.existsSync(path.join(root, 'site', m[1])), 'missing script ' + m[1]);
}
assert(html.includes('sorion-naver-reader-v0.3.0.zip'), 'new canonical ZIP missing from link');
assert(fs.existsSync(path.join(root, 'site/downloads/sorion-naver-reader-v0.3.0.zip')));
assert(manifest.host_permissions.includes('https://meta-deee1.web.app/NaverNovelShelf/site/*'));
assert(manifest.content_scripts.some((item) => item.matches.includes('https://meta-deee1.web.app/NaverNovelShelf/site/*')));
assert(read('extension/sorion-naver-reader/background.js').includes("new URL('listen.html', SHELF + '/')"));
assert(read('extension/sorion-naver-reader/shelf-bridge.js').includes('NaverNovelShelf'));
assert(js.includes('refreshPublicWorks') && js.includes('acceptExtensionChapter'));
assert(js.includes("engine_id: 'cosyvoice3'"), 'real SoriON engine must be selected');
assert(capture.includes("'1250781'") && capture.includes("'1250566'"), '29 works need both newest IDs');
assert(!/<svg|\.svg/i.test(html + js + css + capture), 'banned SVG detected');
console.log('Canonical meta SoriON integration static contracts: OK');
