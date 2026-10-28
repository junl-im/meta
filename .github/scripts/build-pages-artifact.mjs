import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, '.pages-site');
const APP = path.join(ROOT, 'ai-cleaner');
const OS = path.join(APP, 'ai-writing-os');
const DALBIT = path.join(ROOT, 'AIPlayground', 'DalbitUnse', 'dist');
const GOMFOX_MUSIC = path.join(ROOT, 'AIPlayground', 'GomFoxMusic');

const rootFiles = ['index.html'];
const optionalSharedPublicFiles = ['OPTION/SS_OPTION.txt'];
const appFiles = ['index.html', 'site.webmanifest', 'version.json', 'sw.js', 'ASSET-LICENSE.md'];
const appDirs = ['css', 'data', 'js', 'vendor'];
const assetFiles = [
  'favicon-v66.png',
  'apple-touch-icon-v66.png',
  'fox-logo.png',
  'music-play.png',
  'typewriter-action.webp',
  'playground-home-v1.webp',
  'home-divider-v1.webp',
  'exit-fox-v1.webp',
  'home-icon-text.webp',
  'home-icon-image.webp',
  'home-icon-writing.webp',
  'home-icon-reach.webp',
  'home-icon-dalbit.webp',
  'home-icon-mastering.webp',
  'home-icon-sorion.webp',
  'home-icon-ranipang.webp',
  'game-garden.webp',
  'game-sixty.webp',
  'game-matgo.webp',
  'game-physics.webp',
  'home-icon-maeum.webp',
  'home-icon-shelf.webp',
  'home-icon-music.webp',
  'home-icon-webtoon.png',
  'studio-picker-worlds.png',
  'icon-v66-192.png',
  'icon-v66-512.png'
];
const osFiles = ['os-manifest.json', 'prompt-compiler.json'];

function inside(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

async function ensureFile(file) {
  const stat = await fs.stat(file).catch(() => null);
  if (!stat?.isFile()) throw new Error(`Pages runtime file missing: ${path.relative(ROOT, file)}`);
}

async function ensureDir(dir) {
  const stat = await fs.stat(dir).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`Pages runtime directory missing: ${path.relative(ROOT, dir)}`);
}

async function copyFileRelative(sourceRoot, relative, destRoot) {
  const source = path.join(sourceRoot, relative);
  const dest = path.join(destRoot, relative);
  await ensureFile(source);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(source, dest);
}

async function copyOptionalFileRelative(sourceRoot, relative, destRoot) {
  const source = path.join(sourceRoot, relative);
  const stat = await fs.stat(source).catch(() => null);
  if (!stat?.isFile()) {
    console.log(`Optional shared public file not present; skipped: ${relative}`);
    return false;
  }
  const dest = path.join(destRoot, relative);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(source, dest);
  return true;
}

async function copyDirRelative(sourceRoot, relative, destRoot) {
  const source = path.join(sourceRoot, relative);
  const dest = path.join(destRoot, relative);
  await ensureDir(source);
  await fs.cp(source, dest, {
    recursive: true,
    force: true,
    filter: (src) => {
      const parts = path.relative(source, src).split(path.sep);
      return !parts.includes('OPTION') && !parts.includes('.git') && !parts.includes('tests');
    }
  });
}

async function portableOsZip() {
  const manifestPath = path.join(OS, 'os-manifest.json');
  await ensureFile(manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const name = path.basename(String(manifest?.portableZip || ''));
  if (!name || name !== manifest?.portableZip) throw new Error('OS manifest portableZip must be a plain filename.');
  return path.join('os', 'releases', name);
}

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!inside(OUT, full)) throw new Error('Pages artifact path escaped staging root.');
    if (entry.isDirectory()) await walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

async function main() {
  // Validate this checkout before replacing the generated staging directory.
  const pkg=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8'));
  if(pkg.name!=='ai-cleaner-browser-checks'||!inside(ROOT,OUT)||path.basename(OUT)!=='.pages-site')throw new Error('Run the Pages builder from the meta repository root.');
  await ensureFile(path.join(APP,'version.json'));
  for (const relative of ['index.html', 'app.js', 'experience.js', 'style.css', 'art.css', 'integration.css', 'byeolha-connector.js', 'sw.js', 'manifest.webmanifest', 'data/tarot-artwork.json', 'data/saju-knowledge.json']) await ensureFile(path.join(DALBIT, relative));
  await fs.rm(OUT, { recursive: true, force: true });
  const appOut = path.join(OUT, 'ai-cleaner');
  const osOut = path.join(appOut, 'ai-writing-os');
  const assetOut = path.join(appOut, 'assets');
  await fs.mkdir(appOut, { recursive: true });

  for (const file of rootFiles) await copyFileRelative(ROOT, file, OUT);
  for (const file of optionalSharedPublicFiles) await copyOptionalFileRelative(ROOT, file, OUT);
  for (const file of appFiles) await copyFileRelative(APP, file, appOut);
  for (const dir of appDirs) await copyDirRelative(APP, dir, appOut);
  // Publish the existing fortune app at its own path. Its relative assets and SW remain scoped there.
  await copyDirRelative(ROOT, 'AIPlayground/DalbitUnse/dist', OUT);
  await copyDirRelative(ROOT, 'AIPlayground/MaeumDogam', OUT);
  await copyDirRelative(ROOT, 'NaverNovelShelf/site', OUT);
  await copyDirRelative(ROOT, 'AIPlayground/GomFoxMusic', OUT);
  await copyDirRelative(ROOT, 'AIPlayground/WebtoonStudio', OUT);
  // Publish configuration booleans only; credentials never enter the public artifact.
  if (['true','false'].includes(process.env.DAILY_HAS_KEY) && ['true','false'].includes(process.env.DAILY_HAS_SEED)) {
    const configured=process.env.DAILY_HAS_KEY==='true'&&process.env.DAILY_HAS_SEED==='true';
    await fs.writeFile(path.join(appOut,'data','daily-engine-status.json'),JSON.stringify({schemaVersion:1,status:configured?'configured':'not_configured',checkedAt:new Date().toISOString()},null,2)+'\n');
  }
  for (const file of assetFiles) await copyFileRelative(path.join(APP, 'assets'), file, assetOut);
  for (const file of osFiles) await copyFileRelative(OS, file, osOut);
  await copyFileRelative(OS, await portableOsZip(), osOut);

  const files = await walk(OUT);
  const relativeFiles = files.map(file => path.relative(OUT, file).split(path.sep).join('/'));
  const forbidden = relativeFiles.filter(rel =>
    rel === 'package.json' ||
    rel.startsWith('.github/') ||
    rel.startsWith('PROJECT_HANDOFF/') ||
    (rel.startsWith('OPTION/') && rel !== 'OPTION/SS_OPTION.txt') ||
    rel.includes('/OPTION/') ||
    rel.startsWith('ai-cleaner/tests/') ||
    rel === 'ai-cleaner/MIGRATION.md' ||
    rel.startsWith('ai-cleaner/ai-writing-os/os/current/') ||
    rel === 'ai-cleaner/ai-writing-os/README.md' ||
    rel === 'ai-cleaner/ai-writing-os/integration-contract.json'
  );
  if (forbidden.length) throw new Error(`Forbidden Pages artifact content: ${forbidden.join(', ')}`);

  const totalBytes = (await Promise.all(files.map(async file => (await fs.stat(file)).size))).reduce((a, b) => a + b, 0);
  console.log(`Pages artifact ready: ${relativeFiles.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
  console.log('Only explicit public runtime files were staged. OPTION is excluded except the owner-managed public bridge OPTION/SS_OPTION.txt when present.');
}

main().catch(error => {
  console.error(`Pages artifact build failed: ${error?.message || error}`);
  process.exitCode = 1;
});
