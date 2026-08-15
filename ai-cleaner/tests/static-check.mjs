import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),repo=path.resolve(root,'..');
const files={html:path.join(root,'index.html'),app:path.join(root,'js','app.js'),rewrite:path.join(root,'js','rewrite-studio.js'),image:path.join(root,'js','image-analyzer.js'),css:path.join(root,'css','app.css'),version:path.join(root,'version.json'),regression:path.join(root,'tests','regression.js'),e2e:path.join(root,'tests','e2e.spec.mjs'),moduleCheck:path.join(root,'tests','module-check.mjs'),eventBus:path.join(root,'js','core','event-bus.js'),historyStore:path.join(root,'js','core','history-store.js'),workLock:path.join(root,'js','core','work-lock.js'),textUtils:path.join(root,'js','core','text-utils.js'),panelManager:path.join(root,'js','ui','panel-manager.js'),typewriterEngine:path.join(root,'js','features','typewriter-engine.js'),previewPs1:path.join(root,'tests','preview.ps1'),previewCmd:path.join(root,'tests','START-PREVIEW.cmd'),package:path.join(repo,'package.json')};
const failures=[],passes=[];const pass=(n,d='')=>passes.push({n,d}),fail=(n,d='')=>failures.push({n,d});
for(const [n,f] of Object.entries(files))fs.existsSync(f)?pass(`required file: ${n}`,path.relative(root,f)):fail(`required file: ${n}`,`missing ${f}`);
if(!failures.length){
 const html=fs.readFileSync(files.html,'utf8'),app=fs.readFileSync(files.app,'utf8'),rewrite=fs.readFileSync(files.rewrite,'utf8'),image=fs.readFileSync(files.image,'utf8'),css=fs.readFileSync(files.css,'utf8'),eventBus=fs.readFileSync(files.eventBus,'utf8'),historyStore=fs.readFileSync(files.historyStore,'utf8'),workLock=fs.readFileSync(files.workLock,'utf8'),textUtils=fs.readFileSync(files.textUtils,'utf8'),panelManager=fs.readFileSync(files.panelManager,'utf8'),typewriterEngine=fs.readFileSync(files.typewriterEngine,'utf8'),ver=JSON.parse(fs.readFileSync(files.version,'utf8')),e2e=fs.readFileSync(files.e2e,'utf8'),pkg=JSON.parse(fs.readFileSync(files.package,'utf8'));
 const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]),seen=new Set(),dup=[...new Set(ids.filter(id=>seen.has(id)||!seen.add(id)))];dup.length?fail('duplicate HTML ids',dup.join(', ')):pass('duplicate HTML ids',`0 duplicates across ${ids.length} ids`);
 const idSet=new Set(ids),refs=new Set();for(const src of [app,rewrite,image])for(const re of [/(?:\$|q)\(["']#([A-Za-z][\w:-]*)["']\)/g,/getElementById\(["']([A-Za-z][\w:-]*)["']\)/g])for(const m of src.matchAll(re))refs.add(m[1]);const miss=[...refs].filter(x=>!idSet.has(x)).sort();miss.length?fail('JavaScript DOM id references',miss.join(', ')):pass('JavaScript DOM id references',`${refs.size} referenced ids all exist`);
 String(ver.version)===String(pkg.version)&&String(ver.assetVersion)===String(ver.version).replace(/\D/g,'')?pass('version.json source',`${ver.version} / ${ver.assetVersion}`):fail('version.json source',JSON.stringify({ver,pkg:pkg.version}));
 /fetch\(['"]version\.json\?ts=/.test(html)&&/window\.__AI_CLEANER_VERSION__/.test(html)&&/css\/app\.css\?v=/.test(html)&&/js\/app\.js\?v=/.test(html)?pass('version-driven asset boot','version.json drives core CSS/JS'):fail('version-driven asset boot','dynamic boot missing');
 !/loadScript\(['"]js\/image-analyzer\.js/.test(html)&&/ensureImageAnalyzer/.test(app)&&/ensureRewriteStudio/.test(app)?pass('lazy heavy tools','image + rewrite engines load on demand'):fail('lazy heavy tools','eager or missing lazy loader');
 /const APP_VERSION=String\(APP_META\.version/.test(app)&&!/const APP_VERSION=['"]6\.8/.test(app)?pass('no hard-coded app version','APP_VERSION comes from boot metadata'):fail('no hard-coded app version','hard-coded app version found');
 /captureUpdateDraft/.test(app)&&/restoreUpdateDraft/.test(app)&&/sessionStorage/.test(app)?pass('update draft preservation','capture + restore'):fail('update draft preservation','missing');
 /undoHistory/.test(app)&&/redoHistory/.test(app)&&/renderDiff/.test(app)&&/id="undoStep"/.test(html)&&/id="diffPane"/.test(html)?pass('history and diff UI','undo/redo + diff'):fail('history and diff UI','missing');
 /<details class="card detailDiagnostics"/.test(html)&&/id="detailSummary"/.test(html)?pass('progressive diagnostics','details collapsed by default'):fail('progressive diagnostics','missing');
 /extractFactLocks/.test(rewrite)&&/protectFacts/.test(rewrite)&&/validateFacts/.test(rewrite)&&/id="rewriteFactSummary"/.test(html)?pass('Fact Lock rewrite guard','extract + protect + validate'):fail('Fact Lock rewrite guard','missing');
 /data-direct-typing="true"/.test(html)&&/compositionstart/.test(rewrite)&&/compositionend/.test(rewrite)&&/insertFromPaste/.test(rewrite)&&/directTrustedValue/.test(rewrite)?pass('direct typing verifier','IME aware + paste/drop/synthetic insert guarded'):fail('direct typing verifier','missing');
 /EXIF_VERSION\s*=\s*['"]4\.42\.0['"]/.test(image)&&/C2PA_VERSION\s*=\s*['"]0\.13\.4['"]/.test(image)?pass('image dependency pins','ExifReader 4.42.0 + C2PA 0.13.4'):fail('image dependency pins','missing');
 ['0x200C','0x200D','0x2060'].every(t=>app.includes(t))?pass('meaning-sensitive Unicode guard','ZWJ/ZWNJ/WORD JOINER'):fail('meaning-sensitive Unicode guard','missing');
 /trainedAlgorithmicMedia/.test(image)&&/digitalCapture/.test(image)?pass('C2PA source-type distinction','present'):fail('C2PA source-type distinction','missing');
 /@playwright\/test/.test(e2e)&&pkg.devDependencies?.['@playwright/test']==='1.62.1'?pass('Playwright browser pin','1.62.1'):fail('Playwright browser pin','expected 1.62.1');
 /rewriteWidget/.test(e2e)&&/rewriteFactSummary/.test(e2e)&&/undoStep/.test(e2e)&&/visible text/.test(e2e)?pass('browser smoke coverage','rewrite + Fact Lock + history + visible-text typewriter'):fail('browser smoke coverage','missing');
 /keyboardEvent|dispatchEvent\(new KeyboardEvent|execCommand\(['"]insertText/.test(app+'\n'+rewrite)?fail('no synthetic external typing automation','synthetic input found'):pass('no synthetic external typing automation','direct verifier + internal result typewriter only');
 /v6\.8\.1 precision UI polish/.test(css)&&/transform:none!important/.test(css)?pass('precision responsive controls','legacy control alignment guards retained'):fail('precision responsive controls','polish guards missing');
 /queueStats/.test(app)&&/targetChars\(\)/.test(rewrite)&&/queueDirectCompare/.test(rewrite)?pass('long-text UI batching','stats + direct verifier batched/cached'):fail('long-text UI batching','performance batching missing');
 /전화번호/.test(rewrite)&&/해시태그/.test(rewrite)&&/시간/.test(rewrite)?pass('Fact Lock coverage','phone + hashtag + time protected'):fail('Fact Lock coverage','extended locks missing');
 /revealAppliedResult/.test(app)&&/closeAllPanels/.test(app)&&/refreshSuggestionBaseline/.test(app)&&/resultApplied/.test(css)?pass('apply focus flow','close panel + refresh suggestions + reveal result'):fail('apply focus flow','missing focus-flow guards');
 /rewritePanel.*toBeHidden|toBeHidden\(\)/.test(e2e)?pass('browser apply-close coverage','rewrite apply closes panel'):fail('browser apply-close coverage','missing');

 /generatedSourceStamp/.test(rewrite)&&/기준 글이 초안을 만든 뒤 바뀌었습니다/.test(rewrite)&&/ai-cleaner:text-changed/.test(app+rewrite)?pass('stale rewrite guard','source changes lock old draft'):fail('stale rewrite guard','missing');
 /SESSION_KEY='ai-cleaner-rewrite-session-v3'/.test(rewrite)&&/saveSession/.test(rewrite)&&/restoreSession/.test(rewrite)?pass('rewrite session recovery','draft + options survive reload'):fail('rewrite session recovery','missing');
 /FACT_LOCK_LIMIT=240/.test(rewrite)&&/모델\/코드/.test(rewrite)&&/uniqueFactToken/.test(rewrite)?pass('Fact Lock integrity','model codes + collision-safe tokens + cap'):fail('Fact Lock integrity','missing');
 /PANEL_SHEET_BREAKPOINT=980/.test(app)&&/clampPanelToViewport/.test(app)&&/@media\(max-width:980px\)[\s\S]*floatPanel/.test(css)?pass('panel viewport cohesion','tablet sheet + viewport clamp'):fail('panel viewport cohesion','missing');
 /MAX_TEXT_FILE_BYTES=20\*1024\*1024/.test(app)?pass('large text import guard','20MB cap'):fail('large text import guard','missing');
 /revealAppliedResult\(`✓ \${done}개 문장을 결과에 반영했습니다/.test(app)?pass('review apply focus flow','review apply reveals result'):fail('review apply focus flow','missing');
 /원본 직접 쓰기/.test(html)&&/insertFromPaste/.test(rewrite)&&/e\.isTrusted/.test(rewrite)&&/directTrustedValue/.test(rewrite)&&/\['paste','drop','copy','cut'\]/.test(rewrite)&&/원본 직접 작성/.test(rewrite)?pass('original direct-write guard','original-only + clipboard/drop/synthetic input blocked + verified typed result apply'):fail('original direct-write guard','missing');
 /append:piece=>\{out\.setRangeText\(piece/.test(app)&&/commitProgressiveResult/.test(app)&&/createTypewriterEngine/.test(typewriterEngine)&&/splitGraphemesExact/.test(textUtils)&&/sanitizeVisibleTypingSource/.test(textUtils)&&/out\.value===source/.test(app)?pass('internal result typewriter','visible-text sanitizer + modular grapheme writer + exact verification'):fail('internal result typewriter','missing');
 /setRangeText\(piece/.test(app)&&!/dispatchEvent\(new KeyboardEvent/.test(app)&&!/new KeyboardEvent/.test(app)?pass('typewriter safety boundary','internal textarea insertion only; no synthetic keyboard events'):fail('typewriter safety boundary','unsafe or missing typewriter path');
 /data:image\/(png|jpeg|webp);base64,/i.test(html)?fail('embedded base64 image bloat','found'):pass('embedded base64 image bloat','none');

 /const BASE='http:\/\/127\.0\.0\.1:4173\/ai-cleaner\/'/.test(e2e)&&!/page\.goto\(['"]\/ai-cleaner\//.test(e2e)&&/APP_VERSION=String\(versionData\.version\)/.test(e2e)?pass('browser test version/base cohesion','absolute preview URL + runtime version source'):fail('browser test version/base cohesion','stale version or relative URL in e2e');
 !/add\(cat,reason,m\[0\],after,kind,m\.index,m\.index\+m\[0\]\.length\);\s*add\(cat,reason,m\[0\],after,kind,m\.index,m\.index\+m\[0\]\.length\);/.test(app)?pass('issue rule uniqueness','rule matches are registered once'):fail('issue rule uniqueness','duplicate add detected');
 /clearTextAnalysis/.test(app)&&/resetTextWorkspace/.test(app)&&/if\(!input\.trim\(\)\)\{clearTextAnalysis/.test(app)?pass('empty input state reset','old result/diagnostics cleared'):fail('empty input state reset','missing blank-state reset');
 /typewriterDisabledState/.test(app)&&/clearTimeout\(timer\).*syncOriginalMetadata/.test(app)&&/cleanProfile/.test(app)?pass('typewriter conflict lock','pending analysis + conflicting controls guarded'):fail('typewriter conflict lock','missing conflict guard');
 /MAX_IMAGE_FILE_BYTES=50\*1024\*1024/.test(image)&&/MAX_IMAGE_PIXELS=60_000_000/.test(image)&&/nextObjectUrl/.test(image)?pass('image resource guard','file/pixel cap + safe object URL swap'):fail('image resource guard','missing image resource guard');
 /countOccurrences/.test(rewrite)&&/required=Math\.max/.test(rewrite)?pass('Fact Lock multiplicity','repeated facts require repeated preservation'):fail('Fact Lock multiplicity','count-aware validation missing');
 /id="directTarget" disabled/.test(html)&&!/option value="output"/.test(html.match(/<select id="directTarget"[\s\S]*?<\/select>/)?.[0]||'')?pass('direct write target lock','original-only selector is immutable'):fail('direct write target lock','direct verifier target can drift');
 /\\\\u\(-\?\\d\+\)/.test(app)||/\\\\u\(-\?\\d\+/.test(app)?pass('RTF unicode import','RTF unicode escape conversion present'):fail('RTF unicode import','unicode escape conversion missing');
 /v6\.8\.6 UI \/ layout stabilization/.test(css)&&/grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/.test(css)&&/\.bridgeAction\{position:absolute;left:50%;top:52px/.test(css)&&/typingBridgeStatus/.test(html+app)?pass('two-card floating bridge layout','desktop has no reserved bridge column + live bridge status'):fail('two-card floating bridge layout','layout stabilization contract missing');
 /layout bridge floats between two cards/.test(e2e)&&/bridgePosition/.test(e2e)&&/workspaceCenter/.test(e2e)?pass('browser layout regression coverage','desktop floating bridge + tablet inline bridge'):fail('browser layout regression coverage','layout E2E missing');


 const modularBoot=['js/core/event-bus.js','js/core/history-store.js','js/core/work-lock.js','js/core/text-utils.js','js/ui/panel-manager.js','js/features/typewriter-engine.js'].every(x=>html.includes(x));
 modularBoot&&html.indexOf('js/core/event-bus.js')<html.indexOf('js/app.js')?pass('modular boot order','core/ui/feature modules load before app'):fail('modular boot order','module load order missing');
 /createHistoryStore/.test(historyStore)&&/historyStore\.record/.test(app)&&!/let historyState=/.test(app)?pass('history store ownership','history state moved out of app.js'):fail('history store ownership','history still coupled to app');
 /createWorkLock/.test(workLock)&&/workLock\.acquire\('typewriter'\)/.test(app)&&/workLock\.isLocked\('typewriter'\)/.test(app)?pass('work lock ownership','typewriter/update coordination uses shared lock'):fail('work lock ownership','missing shared work lock');
 /createPanelManager/.test(panelManager)&&/panelManager\.open/.test(app)&&/panelManager\.makeDraggable/.test(app)?pass('panel manager ownership','open/close/drag/clamp extracted'):fail('panel manager ownership','panel logic still coupled');
 /createTypewriterEngine/.test(typewriterEngine)&&/typewriterEngine\.start/.test(app)&&/typewriterEngine\.togglePause/.test(app)?pass('typewriter engine ownership','scheduler state extracted from app'):fail('typewriter engine ownership','typewriter scheduler still coupled');
 /createEventBus/.test(eventBus)&&/eventBus\.emit\('text:changed'/.test(app)&&/ai-cleaner:text-changed/.test(app+rewrite)?pass('event bus compatibility bridge','internal bus + DOM compatibility event'):fail('event bus compatibility bridge','event bridge missing');
 /splitGraphemesExact/.test(textUtils)&&!/function splitGraphemesExact\(/.test(app)?pass('shared text utilities','grapheme logic extracted'):fail('shared text utilities','grapheme helper duplicated');
 !/data-resulttab="xray"/.test(html)&&!/id="xrayPane"/.test(html)?pass('X-ray UI removal','diagnostic tab removed; technical info remains'):fail('X-ray UI removal','legacy X-ray UI still present');
 /sanitizeVisibleTypingSource/.test(textUtils)&&/AUTO_REMOVE_HIDDEN/.test(textUtils)&&/SPECIAL_SPACES/.test(textUtils)&&/preservedSensitive/.test(textUtils)?pass('visible-text sanitizer policy','safe hidden removal + space normalization + sensitive preservation'):fail('visible-text sanitizer policy','missing');
 /자동작성 원본 새로쓰기/.test(html+app)?pass('typewriter menu naming','자동작성 원본 새로쓰기'):fail('typewriter menu naming','missing');
 /@media\(max-width:420px\)[\s\S]*floatWidget>span:not\(\.widgetIcon\)\{display:inline/.test(css)?pass('mobile widget labels visible','names stay visible on narrow phones'):fail('mobile widget labels visible','labels still hidden');
 const mobileChecks=[
  ['mobile compact panel CSS exists',css.includes('1.0.0 mobile compact panels')&&css.includes('46dvh')&&css.includes('mobileExpanded')],
  ['mobile panel size controls exist',html.includes('data-panel-size="issuesPanel"')&&html.includes('data-panel-size="rewritePanel"')&&html.includes('aria-expanded="false"')],
  ['mobile panel expand logic exists',app.includes('setMobilePanelExpanded')&&app.includes("$$('[data-panel-size]')")],
  ['mobile compact mode hides secondary text',css.includes('.floatPanel:not(.mobileExpanded) .floatHead .sub')],
  ['floating dock stays switchable above panels',css.includes('floatingDock{position:fixed')&&css.includes('z-index:520')],
  ['e2e hidden typewriter speed setup',e2e.includes("typingPreviewSpeed').evaluate")&&!e2e.includes("typingPreviewSpeed').selectOption")],
  ['e2e panel switch coverage',e2e.includes("issuesPanel')).toBeHidden")],
  ['product semver baseline',String(ver.version)==='1.1.1'&&String(pkg.version)==='1.1.1']
 ];
 for(const [name,ok] of mobileChecks)ok?pass(name):fail(name);

}
for(const p of passes)console.log(`PASS ${p.n}${p.d?` — ${p.d}`:''}`);for(const f of failures)console.error(`FAIL ${f.n}${f.d?` — ${f.d}`:''}`);
console.log(`\nSummary: ${passes.length} passed, ${failures.length} failed`);if(failures.length)process.exit(1);

