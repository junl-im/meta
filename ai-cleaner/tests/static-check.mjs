import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '..');
const files = {
  html: path.join(root, 'index.html'),
  app: path.join(root, 'js', 'app.js'),
  image: path.join(root, 'js', 'image-analyzer.js'),
  css: path.join(root, 'css', 'app.css')
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

  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set();
  const dup = [...new Set(ids.filter((id) => seen.has(id) || !seen.add(id)))];
  if (dup.length) fail('duplicate HTML ids', dup.join(', '));
  else pass('duplicate HTML ids', `0 duplicates across ${ids.length} ids`);

  const idSet = new Set(ids);
  const refs = new Set();
  const selectorPatterns = [
    /(?:\$|q)\(["']#([A-Za-z][\w:-]*)["']\)/g,
    /getElementById\(["']([A-Za-z][\w:-]*)["']\)/g
  ];
  for (const source of [app, image]) {
    for (const re of selectorPatterns) {
      for (const m of source.matchAll(re)) refs.add(m[1]);
    }
  }
  const missingRefs = [...refs].filter((id) => !idSet.has(id)).sort();
  if (missingRefs.length) fail('JavaScript DOM id references', missingRefs.join(', '));
  else pass('JavaScript DOM id references', `${refs.size} referenced ids all exist`);

  const exifPin = /exifreader@4\.42\.0\/dist\/exif-reader\.js/.test(html);
  exifPin ? pass('ExifReader version pin', '4.42.0') : fail('ExifReader version pin', 'expected 4.42.0 script URL');

  const c2paPin = /C2PA_VERSION\s*=\s*['"]0\.13\.4['"]/.test(image);
  c2paPin ? pass('c2pa-web version pin', '0.13.4') : fail('c2pa-web version pin', 'expected C2PA_VERSION = 0.13.4');

  const exifPos = html.indexOf('exifreader@4.42.0');
  const appPos = html.indexOf('js/app.js');
  const imagePos = html.indexOf('js/image-analyzer.js');
  if (exifPos >= 0 && appPos > exifPos && imagePos > appPos) pass('script load order', 'ExifReader → app.js → image-analyzer.js');
  else fail('script load order', `positions exif=${exifPos}, app=${appPos}, image=${imagePos}`);

  const protectedUnicode = ['0x200C', '0x200D', '0x2060'];
  const unicodeOk = protectedUnicode.every((token) => app.includes(token));
  unicodeOk ? pass('meaning-sensitive Unicode guard', protectedUnicode.join(', ')) : fail('meaning-sensitive Unicode guard', 'ZWJ/ZWNJ/WORD JOINER guard missing');

  if (/trainedAlgorithmicMedia/.test(image) && /digitalCapture/.test(image)) pass('C2PA source-type distinction', 'AI-trained-media and digital-capture tokens present');
  else fail('C2PA source-type distinction', 'source-type tokens missing');

  const requiredCss = ['.xray', '.v62review', '.signalgrid', '.provenanceGrid'];
  const missingCss = requiredCss.filter((token) => !css.includes(token));
  missingCss.length ? fail('required UI styles', missingCss.join(', ')) : pass('required UI styles', requiredCss.join(', '));

  const forbiddenHtml = /data:image\/(png|jpeg|webp);base64,/i.test(html);
  forbiddenHtml ? fail('embedded base64 image bloat', 'data:image base64 found in index.html') : pass('embedded base64 image bloat', 'none in index.html');
}

for (const p of passes) console.log(`PASS ${p.name}${p.detail ? ` — ${p.detail}` : ''}`);
for (const f of failures) console.error(`FAIL ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
console.log(`\nSummary: ${passes.length} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
