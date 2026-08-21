(() => {
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const Modules=window.AICleanerModules||{};
const requiredModules=['createEventBus','createHistoryStore','createWorkLock','splitGraphemesExact','sanitizeVisibleTypingSource','classifyTextCodePoint','createTextStateStore','createTextEngine','createDiffEngine','createAnalysisWorkerAdapter','createAnalysisPerformanceGovernor','createAnalysisCoordinator','createFileImportService','createUpdateManager','createPanelManager','createDiffView','createTypewriterEngine','createResultCheckpointStore'];
const missingModules=requiredModules.filter(name=>typeof Modules[name]!=='function');
if(missingModules.length)throw new Error('AI Cleaner core modules missing: '+missingModules.join(', '));
const eventBus=Modules.createEventBus();
const workLock=Modules.createWorkLock();
const splitGraphemesExact=Modules.splitGraphemesExact;
const sanitizeVisibleTypingSource=Modules.sanitizeVisibleTypingSource;
const textStateStore=Modules.createTextStateStore();
const state=textStateStore.state;
const textEngine=Modules.createTextEngine();
const fileImport=Modules.createFileImportService();
let checkpointStorage=null;try{checkpointStorage=window.sessionStorage;}catch(_){}
const checkpointStore=Modules.createResultCheckpointStore({storage:checkpointStorage,limit:8,maxChars:300000,maxTotalChars:600000});
let aiWritingStorage=null;try{aiWritingStorage=window.localStorage;}catch(_){}
let aiWritingController=null,pendingAiWritingRestore=null;
const aiWritingOs={
  get loaded(){return !!aiWritingController;},
  captureState(){return aiWritingController?.captureState?.()??pendingAiWritingRestore??null;},
  restoreState(value){if(!value)return false;if(aiWritingController)return aiWritingController.restoreState(value);pendingAiWritingRestore=value;return true;},
  async activate(){const controller=await ensureAiWritingOsController();return controller.activate();},
  deactivate(){return aiWritingController?.deactivate?.();}
};
let checkpointSourceCache={source:null,stamp:''};
function checkpointCurrentSourceStamp(){const input=$('#input')?.value||'';if(!input||inputDirty||state.original!==input)return'';if(checkpointSourceCache.source===input&&checkpointSourceCache.stamp)return checkpointSourceCache.stamp;const stamp=checkpointStore.stamp(input);checkpointSourceCache={source:input,stamp};return stamp;}

const APP_META=window.__AI_CLEANER_VERSION__||{};
const APP_VERSION=String(APP_META.version||'local');
const APP_NAME=document.documentElement.dataset.appName||'곰같은여우의 AI 놀이터';
const TOOL_TITLES={text:'AI 글 다듬기',image:'AI 이미지 검사',writing:'블로그 팩토리'};
const ASSET_VERSION=encodeURIComponent(String(APP_META.assetVersion||APP_META.version||Date.now()));
const ANALYSIS_WORKER_THRESHOLD=6000;
const analysisWorker=Modules.createAnalysisWorkerAdapter({
  workerUrl:`js/workers/text-analysis-worker.js?v=${ASSET_VERSION}`,
  fallbackExecutor:(text,options)=>textEngine.analyze(text,options),
  minChars:ANALYSIS_WORKER_THRESHOLD,
  jobTimeoutMs:20000,
  failureCooldownMs:15000
});
const analysisPerformance=Modules.createAnalysisPerformanceGovernor();
const analysisCoordinator=Modules.createAnalysisCoordinator({
  executor:(text,options)=>analysisWorker.analyze(text,options),
  syncExecutor:(text,options)=>textEngine.analyze(text,options),
  onCancel:()=>analysisWorker.cancelPending()
});
const lazyScripts=new Map(),LAZY_SCRIPT_TIMEOUT_MS=10000;
function loadLazyScript(src,{timeoutMs=LAZY_SCRIPT_TIMEOUT_MS}={}){
  if(lazyScripts.has(src))return lazyScripts.get(src);
  const p=new Promise((resolve,reject)=>{
    const script=document.createElement('script');let settled=false;
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);script.onload=null;script.onerror=null;if(error){lazyScripts.delete(src);script.remove();reject(error);}else resolve(script);};
    const timer=setTimeout(()=>finish(new Error(`도구 로드 시간 초과 (${Math.round(timeoutMs/1000)}초): ${src}`)),timeoutMs);
    script.src=src;script.async=true;script.onload=()=>finish();script.onerror=()=>finish(new Error('도구 로드 실패: '+src));
    document.body.appendChild(script);
  });
  lazyScripts.set(src,p);return p;
}
async function ensureImageAnalyzer(){if(typeof window.loadImage==='function')return window.loadImage;await loadLazyScript(`js/image-analyzer.js?v=${ASSET_VERSION}`);if(typeof window.loadImage!=='function')throw new Error('이미지 검사 엔진 초기화 실패');return window.loadImage;}
async function ensureRewriteStudio(){if(window.AICleanerRewriteStudio)return window.AICleanerRewriteStudio;await loadLazyScript(`js/rewrite-studio.js?v=${ASSET_VERSION}`);if(!window.AICleanerRewriteStudio)throw new Error('재작성 스튜디오 초기화 실패');return window.AICleanerRewriteStudio;}
async function ensureAiWritingOsController(){if(aiWritingController)return aiWritingController;await loadLazyScript(`js/features/ai-writing-os.js?v=${ASSET_VERSION}`);const factory=window.AICleanerModules?.createAiWritingOsController;if(typeof factory!=='function')throw new Error('블로그 팩토리 모듈 초기화 실패');const controller=factory({storage:aiWritingStorage,workLock,showToast:(message)=>showToast(message)});aiWritingController=controller;if(pendingAiWritingRestore){const pending=pendingAiWritingRestore;pendingAiWritingRestore=null;controller.restoreState(pending);}return controller;}
const historyStore=Modules.createHistoryStore({limit:60,signature:s=>JSON.stringify([s.output,s.manual,s.applied,s.issueBase])});
let manualEditBaseline='';
let inputDirty=false;
let typewriterDisabledState=new Map();
let typewriterRecommendationSuppressed=false;
let typingPreview={source:'',rawSource:'',historyIndex:-1,inputWasReadOnly:false,bridgePct:-1,removedHidden:0,normalizedSpaces:0,preservedSensitive:0,completed:false};
let textImportSeq=0;
function invalidatePendingTextImport(){textImportSeq++;return textImportSeq;}
const REWRITE_SESSION_KEY='ai-cleaner-rewrite-session-v3';
const PANEL_TRIGGER_IDS={typingPreviewPanel:'typingPreviewButton',issuesPanel:'issuesWidget',reviewPanel:'reviewWidget',rewritePanel:'rewriteWidget',checkpointPanel:'checkpointOpen',techPanel:'techWidget'};
let rewriteOpenSeq=0;
function invalidatePendingRewriteOpen(){rewriteOpenSeq++;return rewriteOpenSeq;}

function syncPanelAria(){
  for(const [panelId,triggerId] of Object.entries(PANEL_TRIGGER_IDS)){const panel=$('#'+panelId),trigger=$('#'+triggerId);if(trigger)trigger.setAttribute('aria-expanded',String(!!panel&&!panel.hidden));}
}
function syncCompletionFlowUi(){
  const guide=$('#resultNextStep'),input=$('#input')?.value||'',out=$('#output'),hasSource=!!input.trim(),hasResult=!!(out?.value||'').length;
  if(!guide)return;
  const set=(stateName,text,hidden=false)=>{if(guide.hidden!==hidden)guide.hidden=hidden;if(guide.dataset.state!==stateName)guide.dataset.state=stateName;if(guide.textContent!==text)guide.textContent=text;};
  if(!hasSource){set('empty','',true);return;}
  if(window.__AI_CLEANER_TYPEWRITER_BUSY__){set('writing','자동작성 중 · 결과창에 한 글자씩 새로 쓰고 있습니다.');return;}
  if(out?.readOnly===false){set('editing','직접 수정 중 · 수정을 완료하면 교정 제안과 실행 취소 기록을 현재 결과에 맞춰 다시 정리합니다.');return;}
  if(inputDirty){set('pending','원본 변경됨 · 최신 결과가 준비되면 복사·저장을 사용할 수 있습니다.');return;}
  if(hasResult&&out?.dataset.typewriterVerified==='true'){set('done','자동작성 완료 ✓ · 결과를 복사하거나 TXT로 저장하세요. 필요하면 새 글 재작성도 이어서 사용할 수 있습니다.');return;}
  if(hasResult&&typewriterRecommendationSuppressed){set('custom','결과를 수정했습니다 · 복사하거나 TXT로 저장할 수 있고, 필요한 도구를 계속 사용할 수 있습니다.');return;}
  if(hasResult){set('ready','결과 준비 ✓ · 복사·저장할 수 있습니다. 처음부터 새로 쓰려면 자동작성 원본 새로쓰기를 이용하세요.');return;}
  set('pending','분석 중 · 결과를 준비하고 있습니다.');
}
function invalidateTypewriterVerification({suppressRecommendation=true}={}){
  const out=$('#output');const hadVerified=out?.dataset.typewriterVerified==='true',suppressionChanged=suppressRecommendation&&!typewriterRecommendationSuppressed;
  if(out)delete out.dataset.typewriterVerified;if(suppressRecommendation)typewriterRecommendationSuppressed=true;
  if(hadVerified||suppressionChanged){syncTypewriterRecommendation();syncCompletionFlowUi();}
  return hadVerified||suppressionChanged;
}
function syncResultFreshnessUi(){
  const input=$('#input')?.value||'',out=$('#output'),hasInput=!!input.trim(),hasResult=!!(out?.value||'').length,stale=hasInput&&inputDirty;
  const status=$('#resultFreshness');if(status){status.hidden=!stale;status.textContent=$('#liveScan')?.checked?'원본 변경됨 · 자동 재분석 대기':'원본 변경됨 · 다음 작업에서 자동 갱신';}
  if(out){out.classList.toggle('resultStale',stale&&hasResult);if(stale)out.setAttribute('aria-describedby','resultFreshness');else out.removeAttribute('aria-describedby');}
  const editing=out?.readOnly===false;
  for(const id of ['copy','downloadTxt']){const el=$('#'+id);if(el)el.disabled=stale||!hasResult;}
  const editButton=$('#editResult');if(editButton)editButton.disabled=stale||(!hasResult&&!editing);
  for(const id of ['undoAll','checkpointSave']){const el=$('#'+id);if(el)el.disabled=stale||!hasResult||editing;}
  const diffTab=document.querySelector('[data-resulttab="diff"]');if(diffTab)diffTab.disabled=stale||!hasResult||editing;
  const details=$('#detailDiagnostics');if(details)details.classList.toggle('analysisPending',stale);
  const summary=$('#detailSummary');if(stale&&summary)summary.textContent='원본 변경됨 · 재분석 대기';
  syncCompletionFlowUi();syncCheckpointUi();
}
function setInputDirty(next){inputDirty=!!next;syncResultFreshnessUi();updateHistoryButtons();}
function ensureFreshAnalysis({silent=true}={}){
  const input=$('#input')?.value||'';if(!input.trim())return false;if(!inputDirty&&state.original===input)return true;return !!analyze(silent);
}
function handleSourceMutation({analyzeNow=false,backgroundNow=false,resetPerformance=false,restartTypewriterCue=false}={}){
  if(resultNavigationTimer)cancelResultNavigation();
  typewriterRecommendationSuppressed=false;checkpointSourceCache={source:null,stamp:''};
  const rewriteWidget=$('#rewriteWidget');if(rewriteWidget){clearTimeout(syncWidgets.rewriteReadyTimer);rewriteWidget.classList.remove('rewriteReady');delete rewriteWidget.dataset.seenReady;}
  if(resetPerformance){analysisCoordinator.cancel();analysisPerformance.reset();}
  const out=$('#output');if(out)delete out.dataset.typewriterVerified;
  const input=$('#input');
  if(!input?.value.trim()){
    clearTextAnalysis({keepInput:true});
    notifyTextChanged('original');
    return false;
  }
  setInputDirty(true);queueStats();syncWidgets();notifyTextChanged('original');syncTypewriterRecommendation({restart:restartTypewriterCue});
  if(analyzeNow)return analyze(true);
  queueLiveAnalysis({force:backgroundNow,immediate:backgroundNow});return true;
}
function replaceSourceText(value,{analyzeNow=true,backgroundNow=false,resetPerformance=true}={}){
  const input=$('#input');if(!input)return false;input.value=String(value??'');input.scrollTop=0;return handleSourceMutation({analyzeNow,backgroundNow,resetPerformance,restartTypewriterCue:true});
}

function syncDocumentTitle(tool='text'){
  const label=TOOL_TITLES[tool]||TOOL_TITLES.text;
  document.title=`${label} | ${APP_NAME}${APP_VERSION==='local'?'':` v${APP_VERSION}`}`;
}
function applyVersionUi(){
  const badge=$('#versionBadge'),footer=$('#footerVersion');
  if(badge)badge.textContent=APP_VERSION==='local'?'local':'v'+APP_VERSION;
  if(footer)footer.textContent=APP_VERSION==='local'?'local':'v'+APP_VERSION;
  syncDocumentTitle(document.querySelector('[data-tool].active')?.dataset.tool||'text');
}

function captureUpdateDraftData(targetVersion){
  try{window.AICleanerRewriteStudio?.saveSession?.();}catch(_){}
  return {
    savedAt:Date.now(),targetVersion,
    input:$('#input')?.value||'',output:$('#output')?.value||'',
    outputReadOnly:$('#output')?.readOnly!==false,
    analysisFresh:!inputDirty&&state.original===($('#input')?.value||''),
    outputBasis:state.original||'',
    typewriterRecommendationSuppressed,
    typewriterVerified:!inputDirty&&$('#output')?.dataset.typewriterVerified==='true',
    settings:{profile:$('#cleanProfile')?.value||'standard',norm:!!$('#norm')?.checked,repeat:!!$('#repeat')?.checked,length:!!$('#length')?.checked,liveScan:!!$('#liveScan')?.checked},
    aiWritingOs:aiWritingOs.captureState(),
    activeTool:document.querySelector('[data-tool].active')?.dataset.tool||'text',
    resultTab:document.querySelector('[data-resulttab].active')?.dataset.resulttab||'cleaned'
  };
}

const updateManager=Modules.createUpdateManager({
  currentVersion:APP_VERSION,
  isBlocked:()=>workLock.isLocked()||analysisCoordinator.pending||!!resultNavigationTimer||!!($('#directTyped')?.value||''),
  captureDraft:captureUpdateDraftData,
  restoreDraft:restoreUpdateDraftData
});

const sample = 'AI가\u200B 쓴 글에는\u200E 보이지 않는 문자가 섞일 수 있어요.\u00A0\n\n결론적으로 이번 제품은 생각보다 사용감이 좋았습니다.\n정말 정말 좋은 제품이라서 적극 추천드립니다.\n정말 좋은 선택이고 정말 좋은 경험이며 정말 좋은 결과입니다.\n정말 좋은 문장이라 정말 좋은 표현을 반복해서 정말 좋은 예시를 만듭니다.\n\n자주 묻는 질문 (FAQ)';
const PANEL_SHEET_BREAKPOINT=980;
const ISSUE_RENDER_LIMIT=120;
function notifyTextChanged(kind){textStateStore.touch();const detail={kind,revision:textStateStore.revision};eventBus.emit('text:changed',detail);try{document.dispatchEvent(new CustomEvent('ai-cleaner:text-changed',{detail}));}catch(_){}}


function historySnapshot(label=''){
  return {label,output:$('#output')?.value||state.working||'',manual:!!state.manual,applied:[...state.applied],issueBase:state.issueBase||state.base||''};
}
function updateHistoryButtons(){
  const editing=$('#output')?.readOnly===false,u=$('#undoStep'),r=$('#redoStep');if(u)u.disabled=inputDirty||editing||!historyStore.canUndo;if(r)r.disabled=inputDirty||editing||!historyStore.canRedo;
}
function resetHistory(label='분석 결과'){historyStore.reset(historySnapshot(label));updateHistoryButtons();}
function recordHistory(label){historyStore.record(historySnapshot(label));updateHistoryButtons();}
function restoreHistoryIndex(nextIndex,{announce=true,suppressTypewriterRecommendation=true}={}){
  const snap=historyStore.beginRestore(nextIndex);if(!snap)return;
  try{
    invalidateTypewriterVerification({suppressRecommendation:suppressTypewriterRecommendation});
    state.issueBase=typeof snap.issueBase==='string'&&snap.issueBase?snap.issueBase:state.base;state.issues=issues(state.issueBase);state.reviews=[];state.focusCycles=Object.create(null);
    state.applied=new Set(snap.applied||[]);state.manual=!!snap.manual;state.working=snap.output||'';
    $('#output').readOnly=true;$('#editResult').textContent='✎ 직접 수정';
    renderAll();$('#output').value=snap.output||state.working;state.working=$('#output').value;
    updateHistoryButtons();renderCompare();renderDiff();notifyTextChanged('output');flashOutput();
    if(announce)showToast(snap.label?`${snap.label} 상태로 이동했습니다.`:'이전 상태로 이동했습니다.');
  }finally{historyStore.endRestore();updateHistoryButtons();}
}
function undoHistory(){if(inputDirty)return;restoreHistoryIndex(historyStore.index-1);}
function redoHistory(){if(inputDirty)return;restoreHistoryIndex(historyStore.index+1);}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const diffEngine=Modules.createDiffEngine({splitGraphemes:splitGraphemesExact});
const diffView=Modules.createDiffView({engine:diffEngine,escapeHtml:esc});
function renderDiff(){return diffView.render(state.base||'', $('#output')?.value||state.working||'');}

function restoreUpdateDraftData(draft){
  if(!draft)return false;
  const s=draft.settings||{};if($('#cleanProfile'))$('#cleanProfile').value=s.profile||'standard';if($('#norm'))$('#norm').checked=!!s.norm;if($('#repeat'))$('#repeat').checked=s.repeat!==false;if($('#length'))$('#length').checked=s.length!==false;if($('#liveScan'))$('#liveScan').checked=s.liveScan!==false;
  let discardedStaleOutput=false;
  if((draft.input||'').trim()){
    replaceSourceText(draft.input||'',{analyzeNow:true,resetPerformance:true});
    const outputWasCurrent=draft.analysisFresh!==false&&(!draft.outputBasis||draft.outputBasis===draft.input);
    if(outputWasCurrent&&typeof draft.output==='string'&&draft.output!==$('#output').value){$('#output').value=draft.output;refreshSuggestionBaseline(draft.output,{unread:false});renderAll({preserveOutput:true});}
    else if(!outputWasCurrent&&typeof draft.output==='string'&&draft.output!==$('#output').value)discardedStaleOutput=true;
    if(outputWasCurrent&&draft.outputReadOnly===false&&typeof draft.output==='string'){
      manualEditBaseline=draft.output;state.manual=true;$('#output').readOnly=false;$('#editResult').textContent='✓ 수정 완료';
    }
    const verifiedRestored=outputWasCurrent&&draft.typewriterVerified===true&&typeof draft.output==='string'&&draft.output===sanitizeVisibleTypingSource(draft.input||'').text;
    if(verifiedRestored)$('#output').dataset.typewriterVerified='true';else delete $('#output').dataset.typewriterVerified;
    typewriterRecommendationSuppressed=!verifiedRestored&&outputWasCurrent&&!!draft.typewriterRecommendationSuppressed;syncTypewriterRecommendation();syncCompletionFlowUi();
    resetHistory('업데이트 복원');
  }else if($('#input')){$('#input').value='';clearTextAnalysis({keepInput:true});}
  if(draft.aiWritingOs)aiWritingOs.restoreState(draft.aiWritingOs);
  if(draft.resultTab)activateResultTab(draft.resultTab);
  if(draft.activeTool){const b=document.querySelector(`[data-tool="${draft.activeTool}"]`);if(b)b.click();}
  showToast(discardedStaleOutput?'새 버전을 적용했습니다. 원본 변경 중이던 이전 결과는 버리고 최신 원본으로 다시 다듬었습니다.':'새 버전을 적용하고 작성 중이던 내용을 복원했습니다.');return true;
}

function configureEditors(root=document){
  root.querySelectorAll('textarea').forEach(el=>{
    el.spellcheck=false;
    el.setAttribute('spellcheck','false');
    el.setAttribute('autocorrect','off');
    el.setAttribute('autocapitalize','off');
    el.setAttribute('autocomplete','off');
    el.setAttribute('data-gramm','false');
    el.setAttribute('data-gramm_editor','false');
    el.setAttribute('data-enable-grammarly','false');
  });
}

const scan=text=>textEngine.scan(text,{profile:$('#cleanProfile').value});
const homoglyphs=text=>textEngine.homoglyphs(text);
const sentences=text=>textEngine.sentences(text);
const issues=text=>textEngine.issues(text,{repeat:$('#repeat').checked});
const sentenceSignals=text=>textEngine.sentenceSignals(text);
const hygiene=(text,all,hom)=>textEngine.hygiene(text,all,hom);
const codePointLength=text=>textEngine.codePointLength(text);
const reviewSuggestion=text=>textEngine.reviewSuggestion(text);
const countIssuesLight=text=>textEngine.countIssuesLight(text,{repeat:$('#repeat').checked});

function clearTextAnalysis({keepInput=true,clearRewrite=false,announce=false}={}){
  cancelResultNavigation();typewriterRecommendationSuppressed=false;
  if(window.__AI_CLEANER_TYPEWRITER_BUSY__)stopTypingPreview({restore:false,silent:true});
  analysisCoordinator.cancel();analysisPerformance.reset();inputDirty=false;textStateStore.reset();manualEditBaseline='';checkpointSourceCache={source:null,stamp:''};
  if(!keepInput)$('#input').value='';$('#input').readOnly=false;$('#input').scrollTop=0;$('#output').value='';$('#output').scrollTop=0;$('#output').readOnly=true;$('#editResult').textContent='✎ 직접 수정';delete $('#output').dataset.typewriterVerified;const details=$('#detailDiagnostics');if(details)details.open=false;
  const previewPanel=$('#typingPreviewPanel');if(previewPanel)previewPanel.classList.remove('typewriterComplete');typingPreview.completed=false;
  $('#resultCard')?.classList.remove('resultDestinationPulse','typewriterDestinationActive');clearTimeout(pulseResultDestination.timer);clearTimeout(scrollToResultDestination.resultAppliedTimer);
  closeAllPanels();activateResultTab('cleaned');renderAll({preserveOutput:true});renderDiff();$('#textPerf').textContent='대기';resetHistory('빈 상태');
  if(clearRewrite){try{sessionStorage.removeItem(REWRITE_SESSION_KEY);}catch(_){}try{window.AICleanerRewriteStudio?.resetSession?.();}catch(_){}}
  syncTypewriterRecommendation();if(announce)showToast('글 작업을 초기화했습니다.');
}
function resetTextWorkspace(){invalidatePendingTextImport();clearTextAnalysis({keepInput:false,clearRewrite:true,announce:true});queueStats();notifyTextChanged('original');}

function analysisOptions(){return{profile:$('#cleanProfile').value,nfkc:$('#norm').checked,repeat:$('#repeat').checked,length:$('#length').checked};}
function applyAnalysisResult(input,result,{silent=true,durationMs=0}={}){
  if(String($('#input').value)!==String(input))return false;
  inputDirty=false;
  const prevIssueCount=state.issues.length,prevReviewCount=Number(state.reviewCount)||0,prevTechCount=state.allChars.length+state.homoglyphs.length,hadOriginal=!!state.original;
  const sc=result.scan,base=result.base,hom=result.homoglyphs,foundIssues=result.issues,review=result.reviewMeta||textEngine.reviewMeta(base,{length:$('#length').checked});
  textStateStore.replace({
    original:input,base,issueBase:base,working:base,chars:sc.auto,allChars:sc.all,issues:foundIssues,applied:new Set(),manual:false,
    homoglyphs:hom,reviews:[],reviewCount:review.candidateCount,reviewVisibleCount:review.visibleCandidateCount,reviewTotalSentences:review.totalSentences,reviewsDirty:true,score:result.score,focusCycles:Object.create(null),
    issueUnread:foundIssues.length>0&&(!hadOriginal||foundIssues.length!==prevIssueCount),reviewUnread:false,
    techUnread:(sc.all.length+hom.length)>0&&(!hadOriginal||(sc.all.length+hom.length)!==prevTechCount),analyzeMs:durationMs,reviewOverflow:review.overflow
  });
  $('#output').readOnly=true;$('#editResult').textContent='✎ 직접 수정';renderAll({deferHeavy:true});syncResultFreshnessUi();
  const reviewCount=Number(state.reviewCount)||0;state.reviewUnread=reviewCount>0&&(!hadOriginal||reviewCount!==prevReviewCount);
  analysisPerformance.noteCompleted(durationMs);$('#textPerf').textContent=`${durationMs.toFixed(durationMs<10?1:0)}ms`;syncWidgets();notifyTextChanged('output');if(!historyStore.restoring)resetHistory('분석 결과');
  eventBus.emit('analysis:completed',{revision:textStateStore.revision,durationMs,silent});return true;
}
function analyze(silent=false){
  const input=$('#input').value;if(!input.trim()){clearTextAnalysis({keepInput:true});if(!silent)showToast('먼저 글을 입력해 주세요.');return false;}
  try{
    const run=analysisCoordinator.runNow(input,analysisOptions());return applyAnalysisResult(input,run.result,{silent,durationMs:run.durationMs});
  }catch(error){
    console.error('[AI Cleaner] analysis failed',error);setInputDirty(true);$('#textPerf').textContent='오류';syncResultFreshnessUi();showToast('분석 중 오류가 발생했습니다. 원본은 유지했습니다. 다시 시도해 주세요.');return false;
  }
}
function queueLiveAnalysis({force=false,immediate=false}={}){
  const input=$('#input').value;if(!input.trim()||(!force&&!$('#liveScan').checked))return analysisCoordinator.cancel();
  const adaptiveDelay=analysisPerformance.noteInput(input.length),delay=immediate?0:adaptiveDelay,options=analysisOptions();eventBus.emit('analysis:scheduled',{revision:textStateStore.revision,delay,forced:!!force});
  analysisCoordinator.schedule(input,options,{delay,idleTimeout:Math.max(250,delay),onResult:(result,meta)=>applyAnalysisResult(input,result,{silent:true,durationMs:meta.durationMs}),onError:(error)=>{console.error(error);$('#textPerf').textContent='오류';}});
}

function rebuild(){
  let text=state.issueBase||state.base;
  for(const x of state.issues.filter(x=>state.applied.has(x.id)&&x.applicable&&x.start>=0).sort((a,b)=>b.start-a.start)){
    text=text.slice(0,x.start)+x.after+text.slice(x.end);
  }
  if(!state.manual)state.working=text;
  $('#output').value=state.working;
}

function refreshSuggestionBaseline(text,{unread=true}={}){
  const next=String(text||'');
  state.issueBase=next;state.working=next;state.manual=false;state.applied=new Set();state.issues=issues(next);state.reviews=[];state.focusCycles=Object.create(null);
  const review=textEngine.reviewMeta(next,{length:$('#length').checked});state.reviewCount=review.candidateCount;state.reviewVisibleCount=review.visibleCandidateCount;state.reviewTotalSentences=review.totalSentences;state.reviewOverflow=review.overflow;state.reviewsDirty=true;
  state.issueUnread=unread&&state.issues.length>0;state.reviewUnread=unread&&state.reviewCount>0;
  notifyTextChanged('output');
}

function renderAll({preserveOutput=false,deferHeavy=false}={}){
  if(!preserveOutput)rebuild();
  if(!deferHeavy||!$('#reviewPanel').hidden)buildReviews();
  if(!deferHeavy||!$('#issuesPanel').hidden)renderIssues();
  if(!deferHeavy||!$('#techPanel').hidden)renderTech();
  renderDiag();if(deferHeavy){queueStats();if($('#detailDiagnostics').open)queueCompare();}else{renderStats();renderCompare();}syncWidgets();configureEditors();
  if(!$('#diffPane').classList.contains('hidden'))renderDiff();
}

function renderDiag(){
  const spaces=state.allChars.filter(x=>x.type==='특수 공백').length;
  $('#diagHidden').textContent=state.allChars.length-spaces;
  $('#diagSpace').textContent=spaces;
  $('#diagLanguage').textContent=state.issues.filter(x=>x.kind==='style').length;
  $('#diagFormat').textContent=state.issues.filter(x=>x.kind==='format').length;
  $('#diagRead').textContent=state.issues.filter(x=>x.kind==='read').length;
  $('#diagAuto').textContent=state.chars.length;
  const reviewCount=Number(state.reviewCount)||0;
  $('#diagStatus').textContent=`기술 ${state.allChars.length+state.homoglyphs.length} · 교정 ${state.issues.length} · 문장 검토 ${reviewCount}`;
  const ds=$('#detailSummary');if(ds)ds.textContent=state.original?`교정 ${state.issues.length} · 기술 ${state.allChars.length+state.homoglyphs.length}`:'분석 전';
}

function syncIssueBulkUi(){
  const bar=$('#issueBulkBar'),button=$('#applyAllIssues'),countEl=$('#issueBulkCount'),status=$('#issuesPanelStatus');
  if(!bar||!button||!countEl)return;
  const pending=state.issues.filter(x=>x.applicable&&!state.applied.has(x.id)).length;
  const confirm=state.issues.filter(x=>!x.applicable).length;
  bar.hidden=pending===0;button.disabled=pending===0;countEl.textContent=`바로 반영 ${pending}개`;
  if(status){
    if(pending>0)status.textContent=confirm>0?`바로 반영 ${pending}개 · 직접 확인 ${confirm}개`:`바로 반영 가능한 제안 ${pending}개`;
    else if(confirm>0)status.textContent=`직접 확인이 필요한 항목 ${confirm}개`;
    else if(state.issues.length)status.textContent='반영 가능한 제안을 모두 적용했습니다.';
    else status.textContent='교정 제안이 없습니다.';
  }
}

function issueRangesOverlap(a,b){return !!a&&!!b&&a.start>=0&&b.start>=0&&a.start<b.end&&b.start<a.end;}
function issueOverlapsApplied(issue){return state.issues.some(other=>other.id!==issue.id&&state.applied.has(other.id)&&other.applicable&&issueRangesOverlap(issue,other));}
function nonOverlappingApplicableIssues(list){
  const sorted=[...list].filter(x=>x.applicable&&x.start>=0&&x.end>=x.start).sort((a,b)=>a.start-b.start||b.end-a.end);
  const batch=[];let end=-1;
  for(const x of sorted){if(x.start<end)continue;batch.push(x);end=x.end;}
  return batch;
}

function applyIssueBatch(text,batch){
  let next=String(text||'');
  for(const x of [...batch].sort((a,b)=>b.start-a.start))next=next.slice(0,x.start)+x.after+next.slice(x.end);
  return next;
}

function applyAllIssues(){
  if(inputDirty||!state.original)return;
  if($('#output')?.readOnly===false){showToast('직접 수정을 먼저 완료해 주세요.');return;}
  let text=$('#output').value||state.working||state.issueBase||state.base||'';
  let appliedCount=0;
  for(let pass=0;pass<8;pass++){
    const candidates=issues(text).filter(x=>x.applicable&&x.start>=0);
    if(!candidates.length)break;
    const batch=nonOverlappingApplicableIssues(candidates);
    if(!batch.length)break;
    const next=applyIssueBatch(text,batch);
    if(next===text)break;
    appliedCount+=batch.length;text=next;
  }
  if(!appliedCount){showToast('한 번에 반영할 수 있는 교정 제안이 없습니다.');return;}
  invalidateTypewriterVerification();
  const out=$('#output');out.readOnly=true;out.value=text;$('#editResult').textContent='✎ 직접 수정';
  refreshSuggestionBaseline(text,{unread:false});renderAll();flashOutput();recordHistory('교정 일괄 반영');
  revealAppliedResult(`✓ 교정 제안 ${appliedCount}개를 한 번에 반영했습니다. 직접 확인 항목은 그대로 두었습니다.`);
}

function renderIssues(){
  const box=$('#issues');
  syncIssueBulkUi();
  if(!state.issues.length){box.innerHTML='<div class="empty">교정 제안이 없습니다. 🦊</div>';return;}
  const visible=state.issues.slice(0,ISSUE_RENDER_LIMIT),overflow=Math.max(0,state.issues.length-visible.length);
  box.innerHTML=visible.map(x=>{
    const locateTarget=x.word||((x.start>=0&&x.before)?x.before:null);
    const locate=locateTarget?`<button class="mini locate" type="button" data-locate="${x.id}" title="결과에서 위치 찾기">🔍 위치 보기</button><span class="locateStatus" id="loc-${x.id}"></span>`:'';
    const applied=state.applied.has(x.id),overlap=!applied&&x.applicable&&issueOverlapsApplied(x);
    const apply=x.applicable?(applied?`<button class="mini undo" type="button" data-undo="${x.id}">↶ 되돌리기</button>`:overlap?'<span class="mini passive issueOverlap" title="이미 반영한 제안과 범위가 겹칩니다. 위의 안전 일괄 반영으로 이어서 처리할 수 있습니다.">겹침 · 일괄</span>':`<button class="mini apply" type="button" data-apply="${x.id}">반영</button>`):'<span class="mini passive">확인 항목</span>';
    return `<div class="item"><div class="itemtop"><span class="tag ${x.kind==='format'?'blue':''}">${esc(x.cat)}</span><span class="sub">${esc(x.before||'')}</span></div><p>${esc(x.reason)}</p><div class="itemactions">${apply}${locate}</div></div>`;
  }).join('')+(overflow?`<div class="issueOverflow" role="note">제안이 많아 ${ISSUE_RENDER_LIMIT.toLocaleString()}개까지만 목록에 표시합니다. <b>안전 일괄 반영</b>은 표시되지 않은 제안도 함께 처리합니다.</div>`:'');
  $$('[data-apply]').forEach(b=>b.onclick=()=>{const issue=state.issues.find(x=>x.id===b.dataset.apply);if(!issue||!issue.applicable)return;if(issueOverlapsApplied(issue)){showToast('겹치는 제안은 위의 안전 일괄 반영으로 처리해 주세요.');renderIssues();return;}invalidateTypewriterVerification();state.applied.add(issue.id);state.manual=false;renderAll();notifyTextChanged('output');flashOutput();recordHistory('교정 반영');});
  $$('[data-undo]').forEach(b=>b.onclick=()=>{invalidateTypewriterVerification();state.applied.delete(b.dataset.undo);state.manual=false;renderAll();notifyTextChanged('output');flashOutput();recordHistory('교정 되돌리기');});
  $$('[data-locate]').forEach(b=>b.onclick=()=>locateIssue(b.dataset.locate));
  syncIssueBulkUi();
}

function activateResultTab(name){
  const next=name==='diff'&&!inputDirty&&$('#output')?.readOnly!==false?'diff':'cleaned';
  $$('[data-resulttab]').forEach(x=>{const active=x.dataset.resulttab===next;x.classList.toggle('active',active);x.setAttribute('aria-selected',String(active));x.tabIndex=active?0:-1;});
  ['cleaned','diff'].forEach(n=>$('#'+n+'Pane').classList.toggle('hidden',next!==n));
  if(next==='diff')renderDiff();
}

function scrollTextareaToRange(el,start,end){
  const value=el.value||'';
  start=Math.max(0,Math.min(value.length,start));end=Math.max(start,Math.min(value.length,end));
  const cs=getComputedStyle(el), mirror=document.createElement('div');
  mirror.style.position='fixed';mirror.style.left='-100000px';mirror.style.top='0';mirror.style.visibility='hidden';
  mirror.style.boxSizing='border-box';mirror.style.width=el.offsetWidth+'px';mirror.style.padding=cs.padding;mirror.style.border=cs.border;
  mirror.style.fontFamily=cs.fontFamily;mirror.style.fontSize=cs.fontSize;mirror.style.fontWeight=cs.fontWeight;mirror.style.fontStyle=cs.fontStyle;
  mirror.style.letterSpacing=cs.letterSpacing;mirror.style.lineHeight=cs.lineHeight;mirror.style.whiteSpace='pre-wrap';mirror.style.wordBreak='break-word';mirror.style.overflowWrap='break-word';
  mirror.textContent=value.slice(0,start);
  const marker=document.createElement('span');marker.textContent=value.slice(start,Math.max(start+1,end))||'\u200b';mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const targetY=marker.offsetTop;
  mirror.remove();
  el.focus({preventScroll:true});
  el.setSelectionRange(start,end);
  const lineHeight=parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.6||20;
  el.scrollTop=Math.max(0,targetY-el.clientHeight*.42+lineHeight*2);
  const r=el.getBoundingClientRect();
  if(r.top<70||r.bottom>innerHeight-20)el.scrollIntoView({behavior:'smooth',block:'center'});
}

function locateIssue(id){
  const issue=state.issues.find(x=>x.id===id);if(!issue)return;
  activateResultTab('cleaned');
  const out=$('#output'),text=out.value,needle=issue.word||issue.before;if(!needle)return;
  const starts=[];let from=0;
  while(from<=text.length){const idx=text.indexOf(needle,from);if(idx<0)break;starts.push(idx);from=idx+Math.max(1,needle.length);if(starts.length>=500)break;}
  const status=$('#loc-'+id);
  if(!starts.length){if(status)status.textContent='현재 결과에서 찾지 못함';return;}
  const next=(state.focusCycles[id]||0)%starts.length;state.focusCycles[id]=next+1;
  const pos=starts[next];if(status)status.textContent=`${next+1}/${starts.length}`;
  requestAnimationFrame(()=>scrollTextareaToRange(out,pos,pos+needle.length));
}

function locateOriginalPosition(pos,len=1){
  const input=$('#input');
  requestAnimationFrame(()=>scrollTextareaToRange(input,pos,pos+Math.max(1,len)));
}

function flashOutput(){
  const out=$('#output');clearTimeout(flashOutput.timer);out.classList.remove('resultFlash');void out.offsetWidth;out.classList.add('resultFlash');
  flashOutput.timer=setTimeout(()=>out.classList.remove('resultFlash'),800);
}

function textHygieneAudit(){
  const originalAudit=sanitizeVisibleTypingSource(state.original||''),resultAudit=sanitizeVisibleTypingSource($('#output')?.value||state.working||'');
  return{
    policyVersion:originalAudit.policyVersion||Modules.TEXT_HYGIENE_POLICY_VERSION||'unknown',
    originalFound:originalAudit.found.length,
    autoCleaned:originalAudit.removed.length+originalAudit.normalizedSpaces.length,
    removed:originalAudit.removed.length,
    normalizedSpaces:originalAudit.normalizedSpaces.length,
    preserved:originalAudit.preservedSensitive.length,
    resultResidue:resultAudit.removed.length+resultAudit.normalizedSpaces.length
  };
}
function renderTech(){
  const rows=[];
  for(const x of state.allChars.slice(0,500))rows.push(`<tr><td>${x.pos}</td><td><b>${x.code}</b><div class="sub">${esc(x.name||'')}</div></td><td>${esc(x.type)}</td><td>${esc(x.action)}</td><td>${x.auto?'자동 정리':(x.legacyV6?'보존 · v6 사전':'보존')}</td></tr>`);
  for(const x of state.homoglyphs.slice(0,100))rows.push(`<tr><td>${x.pos}</td><td><b>${x.code}</b><div class="sub">${esc(x.name||'')}</div></td><td>유사문자</td><td>확인</td><td>보존</td></tr>`);
  $('#removalTable').innerHTML=rows.length?rows.join(''):'<tr><td colspan="5" class="empty">기술 정보가 없습니다.</td></tr>';
  const audit=textHygieneAudit();
  $('#techSummary').innerHTML=[`<span class="techChip">원본 발견 <b>${audit.originalFound}</b></span>`,`<span class="techChip">자동 정리 <b>${audit.autoCleaned}</b></span>`,`<span class="techChip">의미상 보존 <b>${audit.preserved}</b></span>`,`<span class="techChip ${audit.resultResidue?'warn':'good'}">결과 잔여 <b>${audit.resultResidue}</b></span>`].join('');
  const status=$('#techPanelStatus');if(status)status.textContent=state.original?`원본과 결과를 분리해서 표시합니다 · ${audit.policyVersion}`:'숨은 문자와 보존 항목을 확인합니다.';
}

let statsFrame=0,statsTimer=0;
function queueStats(){
  const len=($('#input').value||'').length;
  if(statsFrame){cancelAnimationFrame(statsFrame);statsFrame=0;}
  clearTimeout(statsTimer);
  if(len<12000){statsFrame=requestAnimationFrame(()=>{statsFrame=0;renderStats();});}
  else{statsTimer=setTimeout(renderStats,len>100000?180:100);}
}
function renderStats(){
  const t=$('#input').value||'',words=(t.match(/[가-힣A-Za-z0-9]{2,}/g)||[]).length,lines=t?t.split(/\r?\n/).length:0;
  $('#textStats').innerHTML=`<span class="statpill">문자 <b>${codePointLength(t)}</b></span><span class="statpill">단어 <b>${words}</b></span><span class="statpill">줄 <b>${lines}</b></span>`;
  const analyzed=!!t&&state.original===t&&!inputDirty;$('#cleanScore').textContent=analyzed?`텍스트 위생 ${state.score}`:(t?'텍스트 위생 재분석 대기':'텍스트 위생 --');
}

function buildReviews(){
  const source=$('#output').value||state.working||state.base||'';
  const previous=new Map((state.reviews||[]).map(r=>[`${r.start}:${r.text}`,r]));
  const all=sentences(source),limit=400,meta=textEngine.reviewMeta(source,{length:$('#length').checked,limit});state.reviewOverflow=meta.overflow;
  state.reviewCount=meta.candidateCount;state.reviewVisibleCount=meta.visibleCandidateCount;state.reviewTotalSentences=meta.totalSentences;
  state.reviews=all.slice(0,limit).map((x,i)=>{
    let score=0,reasons=[];
    if($('#length').checked){if(x.text.length>100){score+=2;reasons.push('100자 초과 긴 문장');}else if(x.text.length>72){score++;reasons.push('조금 긴 문장');}}
    const sig=sentenceSignals(x.text);if(sig.length){score+=Math.min(2,sig.length);reasons.push(...sig.slice(0,2));}
    const prev=previous.get(`${x.start}:${x.text}`),suggestion=reviewSuggestion(x.text);
    return {id:'s'+i,...x,score,reasons:[...new Set(reasons)],suggestion,edit:prev?prev.edit:x.text,selected:prev?prev.selected:false};
  });
  state.reviewsDirty=false;const box=$('#v62ReviewList'),candidates=state.reviews.filter(r=>r.score>=1);
  $('#reviewPanelStatus').textContent=state.reviewOverflow?`전체 후보 ${state.reviewCount}개 · 현재 ${candidates.length}개 표시 · 뒤 ${state.reviewOverflow}문장 생략`:`검토 후보 ${state.reviewCount}개`;
  box.innerHTML=candidates.length?candidates.map(r=>`<div class="v62review ${r.score>=1.5?'attn':''}" data-review-card="${r.id}"><div class="itemtop"><label class="check"><input type="checkbox" data-rsel="${r.id}" ${r.selected?'checked':''}> 반영 선택</label><span class="tag blue">편집 체크 ${r.score.toFixed(1)}</span><span class="v62small">${r.text.length}자</span></div><div class="src">${esc(r.text)}</div><textarea spellcheck="false" autocorrect="off" autocapitalize="off" autocomplete="off" data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false" data-redit="${r.id}">${esc(r.edit)}</textarea><div class="v62reason">${r.reasons.length?'확인: '+esc(r.reasons.join(' · ')):'특별한 편집 신호 없음'}</div><div class="itemactions">${r.suggestion?`<button class="mini suggest" type="button" data-rsuggest="${r.id}">추천안 채우기</button>`:''}<button class="mini locate" type="button" data-rlocate="${r.id}">🔍 결과에서 보기</button></div></div>`).join(''):'<div class="empty">따로 검토할 문장이 없습니다.</div>';
  $$('[data-rsel]').forEach(e=>e.onchange=()=>{const r=state.reviews.find(x=>x.id===e.dataset.rsel);if(r)r.selected=e.checked;updateReviewApplyState();});
  $$('[data-redit]').forEach(e=>e.oninput=()=>{const r=state.reviews.find(x=>x.id===e.dataset.redit);if(r){r.edit=e.value;const card=e.closest('[data-review-card]');if(card)card.classList.toggle('reviewChanged',r.edit!==r.text);}updateReviewApplyState();});
  $$('[data-rsuggest]').forEach(b=>b.onclick=()=>{const r=state.reviews.find(x=>x.id===b.dataset.rsuggest);if(!r||!r.suggestion)return;const area=box.querySelector(`[data-redit="${r.id}"]`);if(area){area.value=r.suggestion;area.dispatchEvent(new Event('input',{bubbles:true}));}const check=box.querySelector(`[data-rsel="${r.id}"]`);if(check){check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));}});
  $$('[data-rlocate]').forEach(b=>b.onclick=()=>{const r=state.reviews.find(x=>x.id===b.dataset.rlocate);if(r)locateInTextarea($('#output'),r.text,0,'');});
  configureEditors(box);updateReviewApplyState();
}

function updateReviewApplyState(){
  const changed=state.reviews.filter(r=>r.selected&&r.edit!==r.text).length;
  const badge=$('#reviewEditCount'),button=$('#v62ApplyReviews');
  if(badge){badge.textContent=`수정됨 ${changed}개`;badge.classList.toggle('ready',changed>0);}
  if(button)button.disabled=changed===0;
}

function renderCompare(){
  if(!state.original){$('#v62HygBefore').textContent='—';$('#v62HygAfter').textContent='—';$('#v62HygDelta').textContent='분석 전';$('#v62IssueDelta').textContent='분석 전';return;}
  const current=$('#output').value||state.working,sc=scan(current),after=hygiene(current,sc.all,homoglyphs(sc.clean));
  $('#v62HygBefore').textContent=state.score+'/100';$('#v62HygAfter').textContent=after+'/100';
  $('#v62HygDelta').textContent=`기술 흔적 ${state.allChars.length} → ${sc.all.length}`;$('#v62IssueDelta').textContent=`편집 체크 ${state.issues.length} → ${countIssuesLight(sc.clean)}`;
}
function queueCompare(){clearTimeout(compareTimer);compareTimer=setTimeout(renderCompare,180);}

function applyReviews(){
  let text=$('#output').value||state.working,done=0;
  const selected=state.reviews.filter(r=>r.selected);
  const changed=selected.filter(r=>r.edit!==r.text);
  if(!changed.length){
    showToast(selected.length?'체크만으로는 문장이 바뀌지 않습니다. 문장을 수정하거나 추천안 채우기를 눌러주세요.':'수정할 문장을 먼저 선택해 주세요.');
    return;
  }
  for(const r of changed.sort((a,b)=>b.start-a.start)){
    let idx=-1;if(text.slice(r.start,r.end)===r.text)idx=r.start;if(idx<0)idx=text.indexOf(r.text,Math.max(0,r.start-100));if(idx<0)idx=text.indexOf(r.text);
    if(idx>=0){text=text.slice(0,idx)+r.edit+text.slice(idx+r.text.length);done++;}
  }
  if(!done)return showToast('현재 결과에서 수정 대상 문장을 찾지 못했습니다. 다시 분석한 뒤 시도해 주세요.');
  invalidateTypewriterVerification();$('#output').value=text;refreshSuggestionBaseline(text,{unread:false});renderAll();flashOutput();recordHistory('문장 검토 반영');revealAppliedResult(`✓ ${done}개 문장을 결과에 반영했습니다.`);
}

function checkpointLabel(){
  const out=$('#output'),current=historyStore.entries[historyStore.index];
  if(out?.dataset.typewriterVerified==='true')return'자동작성 완료';
  if(state.manual)return'직접 수정';
  const label=String(current?.label||'').trim();return label&&!["분석 결과","빈 상태"].includes(label)?label:'현재 결과';
}
function checkpointTime(ms){try{return new Intl.DateTimeFormat('ko-KR',{hour:'2-digit',minute:'2-digit'}).format(new Date(ms));}catch(_){return'';}}
function checkpointPreview(text){return String(text||'').replace(/\s+/g,' ').trim().slice(0,150);}
function checkpointMatchesCurrent(entry,currentStamp=checkpointCurrentSourceStamp()){return !!currentStamp&&entry?.sourceStamp===currentStamp;}
function syncCheckpointUi(){
  const count=checkpointStore.size,out=$('#output'),editing=out?.readOnly===false,hasResult=!!out?.value&&!inputDirty,bar=$('#checkpointQuickBar'),save=$('#checkpointSave'),open=$('#checkpointOpen'),badge=$('#checkpointCount'),status=$('#checkpointQuickStatus');
  if(bar)bar.hidden=!hasResult&&count===0;if(save)save.disabled=!hasResult||editing||!!window.__AI_CLEANER_TYPEWRITER_BUSY__;if(open)open.disabled=count===0||editing;if(badge)badge.textContent=String(count);
  if(status)status.textContent=checkpointStore.persistenceAvailable?`이 탭에서 ${count}/${checkpointStore.limit}개 보관`:`메모리에서 ${count}/${checkpointStore.limit}개 · 새로고침 시 사라질 수 있음`;
  if(!$('#checkpointPanel')?.hidden)renderCheckpointPanel();
}
function renderCheckpointPanel(){
  const list=checkpointStore.list(),box=$('#checkpointList'),status=$('#checkpointPanelStatus'),clear=$('#checkpointClear'),currentStamp=checkpointCurrentSourceStamp();if(!box)return;
  if(status)status.textContent=checkpointStore.persistenceAvailable?`현재 브라우저 탭에서 최대 ${checkpointStore.limit}개를 보관합니다.`:'브라우저 저장소를 사용할 수 없어 현재 메모리에만 보관합니다.';
  if(clear)clear.disabled=list.length===0;
  if(!list.length){box.innerHTML='<div class="empty">보관한 결과가 없습니다. 결과 아래의 “현재 결과 보관”을 눌러 추가하세요.</div>';return;}
  box.innerHTML=list.map((entry,index)=>{const match=checkpointMatchesCurrent(entry,currentStamp),preview=checkpointPreview(entry.text),time=checkpointTime(entry.savedAt);return `<article class="checkpointItem ${match?'':'sourceMismatch'}" data-checkpoint-id="${esc(entry.id)}"><div class="checkpointItemHead"><div><b>${esc(entry.label||'보관한 결과')}</b><span class="sub">${time?esc(time)+' · ':''}${entry.text.length.toLocaleString()}자${index===0?' · 최근':''}</span></div><span class="tag ${match?'green':'blue'}">${match?'현재 원본':'다른 원본'}</span></div><p>${esc(preview||'내용 없음')}${entry.text.length>150?'…':''}</p><div class="checkpointActions"><button class="mini primary" type="button" data-checkpoint-action="restore" ${match?'':'disabled title="원본이 달라 복원할 수 없습니다."'}>결과로 복원</button><button class="mini" type="button" data-checkpoint-action="copy">복사</button><button class="mini danger" type="button" data-checkpoint-action="remove">삭제</button></div></article>`;}).join('');
}
function saveResultCheckpoint(){
  if(!ensureFreshAnalysis()||!$('#output')?.value)return;
  const text=$('#output').value,input=$('#input').value;if(text.length>checkpointStore.maxChars)return showToast(`결과가 ${Math.round(checkpointStore.maxChars/10000)}만 자를 넘어 보관함에는 넣지 않았습니다. TXT 저장을 이용해 주세요.`);
  const sourceStamp=checkpointCurrentSourceStamp();if(!sourceStamp)return showToast('최신 원본 분석이 끝난 뒤 보관할 수 있습니다.');const result=checkpointStore.add({text,label:checkpointLabel(),sourceStamp,sourceChars:input.length});
  if(!result.ok)return;
  syncCheckpointUi();renderCheckpointPanel();showToast(result.persisted?(result.created?'현재 결과를 보관함에 저장했습니다.':'같은 결과의 보관 시간을 갱신했습니다.'):'현재 메모리에만 보관했습니다. 새로고침하면 사라질 수 있습니다.');
}
async function copyResultCheckpoint(id){const entry=checkpointStore.get(id);if(!entry)return;showToast(await clipboardWrite(entry.text)?'보관한 결과를 복사했습니다.':'자동 복사가 차단됐습니다. 결과를 열어 직접 복사해 주세요.');}
function restoreResultCheckpoint(id){
  const entry=checkpointStore.get(id);if(!entry)return;const sourceStamp=checkpointCurrentSourceStamp();if(!checkpointMatchesCurrent(entry,sourceStamp))return showToast('현재 원본과 다른 결과라 복원하지 않았습니다. 복사는 사용할 수 있습니다.');
  if(!ensureFreshAnalysis())return;
  invalidateTypewriterVerification();const out=$('#output');out.readOnly=true;out.value=entry.text;$('#editResult').textContent='✎ 직접 수정';refreshSuggestionBaseline(entry.text,{unread:false});renderAll();recordHistory(`보관함 복원 · ${entry.label}`);revealAppliedResult('✓ 보관한 결과를 현재 결과로 복원했습니다.');renderCheckpointPanel();
}
function removeResultCheckpoint(id){if(!checkpointStore.remove(id))return;syncCheckpointUi();renderCheckpointPanel();showToast('보관함에서 삭제했습니다.');}
function clearResultCheckpoints(){if(!checkpointStore.clear())return;syncCheckpointUi();renderCheckpointPanel();showToast('결과 보관함을 비웠습니다.');}

function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.appendChild(a);try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}}
function syncWidgets(){
  const textVisible=!$('#textTool').classList.contains('hidden'),out=$('#output'),resultEditing=out?.readOnly===false,issueCount=inputDirty||resultEditing?0:state.issues.length,reviewCount=inputDirty||resultEditing?0:(Number(state.reviewCount)||0),techCount=inputDirty?0:state.allChars.length+state.homoglyphs.length;
  const iw=$('#issuesWidget'),rw=$('#reviewWidget'),tw=$('#techWidget'),ww=$('#rewriteWidget');
  const hasText=!!((state.original||$('#input')?.value||'').trim()),hasFreshResult=hasText&&!inputDirty&&!!out?.value&&state.original===($('#input')?.value||''),typewriterIsNext=hasText&&!window.__AI_CLEANER_TYPEWRITER_BUSY__&&out?.dataset.typewriterVerified!=='true'&&!typewriterRecommendationSuppressed;
  iw.hidden=!textVisible||issueCount===0;rw.hidden=!textVisible||reviewCount===0;tw.hidden=!textVisible||techCount===0;if(ww)ww.hidden=!textVisible||!hasText||resultEditing;
  $('#issueCount').textContent=issueCount;$('#reviewCount').textContent=reviewCount;$('#techCount').textContent=techCount;
  iw.classList.toggle('attention',state.issueUnread&&issueCount>0);rw.classList.toggle('attention',state.reviewUnread&&reviewCount>0);tw.classList.toggle('attention',state.techUnread&&techCount>0);
  if(ww&&hasFreshResult&&!typewriterIsNext&&!ww.dataset.seenReady){clearTimeout(syncWidgets.rewriteReadyTimer);ww.classList.add('rewriteReady');ww.dataset.seenReady='1';syncWidgets.rewriteReadyTimer=setTimeout(()=>ww.classList.remove('rewriteReady'),3600);}
  if(ww&&typewriterIsNext)ww.classList.remove('rewriteReady');
  if(inputDirty||resultEditing){$('#issuesPanel').hidden=true;$('#reviewPanel').hidden=true;if(inputDirty)$('#techPanel').hidden=true;if(resultEditing){$('#rewritePanel').hidden=true;$('#checkpointPanel').hidden=true;window.AICleanerRewriteStudio?.cancelGeneration?.({status:'직접 수정 중이라 재작성 작업을 닫았습니다.'});}}
  if(!textVisible){$('#issuesPanel').hidden=true;$('#reviewPanel').hidden=true;$('#rewritePanel').hidden=true;$('#checkpointPanel').hidden=true;$('#techPanel').hidden=true;}
  syncResultFreshnessUi();syncPanelAria();
}

const FLOAT_PANEL_IDS=['typingPreviewPanel','issuesPanel','reviewPanel','rewritePanel','checkpointPanel','techPanel'];
const panelManager=Modules.createPanelManager({
  ids:FLOAT_PANEL_IDS,breakpoint:PANEL_SHEET_BREAKPOINT,anchor:()=>$('#input'),
  offsets:{typingPreviewPanel:[76,46],issuesPanel:[14,12],reviewPanel:[34,30],rewritePanel:[22,16],checkpointPanel:[44,40],techPanel:[54,48]}
});
let viewportFrame=0;
function viewportSnapshot(){
  const vv=window.visualViewport;return{width:vv?.width||innerWidth,height:vv?.height||innerHeight,offsetTop:vv?.offsetTop||0,offsetLeft:vv?.offsetLeft||0,scale:vv?.scale||1};
}
function keepFocusedPanelControlVisible(){
  const active=document.activeElement,panel=active?.closest?.('.floatPanel');if(!active||!panel||panel.hidden||innerWidth>PANEL_SHEET_BREAKPOINT)return;
  const body=active.closest('.floatBody');if(!body)return;const ar=active.getBoundingClientRect(),br=body.getBoundingClientRect(),pad=10;
  if(ar.bottom>br.bottom-pad)body.scrollTop+=ar.bottom-(br.bottom-pad);else if(ar.top<br.top+pad)body.scrollTop-=br.top+pad-ar.top;
}
function syncViewportMetrics(){
  const v=viewportSnapshot(),root=document.documentElement,gap=Math.max(0,innerHeight-v.height-v.offsetTop),keyboard=innerWidth<=PANEL_SHEET_BREAKPOINT&&v.scale<=1.05&&gap>140;
  root.style.setProperty('--app-visual-height',Math.max(1,Math.round(v.height))+'px');root.style.setProperty('--app-visual-offset-top',Math.max(0,Math.round(v.offsetTop))+'px');
  root.classList.toggle('mobile-keyboard-visible',keyboard);panelManager.handleResize();if(innerWidth<=PANEL_SHEET_BREAKPOINT)requestAnimationFrame(keepFocusedPanelControlVisible);
}
function queueViewportSync(){if(viewportFrame)cancelAnimationFrame(viewportFrame);viewportFrame=requestAnimationFrame(()=>{viewportFrame=0;syncViewportMetrics();});}
function dismissMobileKeyboard(){
  if(innerWidth>PANEL_SHEET_BREAKPOINT)return;const active=document.activeElement;if(active&&/^(TEXTAREA|INPUT|SELECT)$/.test(active.tagName))try{active.blur();}catch(_){}
}
function setMobilePanelExpanded(panel,expanded){panelManager.setMobileExpanded(panel,expanded);}
const panelReturnFocus=new Map();
function rememberPanelReturnFocus(id){
  const active=document.activeElement;if(!active||active===document.body||active.closest?.('.floatPanel'))return;
  panelReturnFocus.set(id,active);
}
function focusOpenedPanel(panel){
  if(!panel)return;requestAnimationFrame(()=>{if(panel.hidden)return;try{panel.focus({preventScroll:true});}catch(_){try{panel.focus();}catch(__){}}});
}
function restorePanelReturnFocus(id){
  const target=panelReturnFocus.get(id);panelReturnFocus.delete(id);if(!target||!target.isConnected||target.disabled)return;
  requestAnimationFrame(()=>{try{target.focus({preventScroll:true});}catch(_){try{target.focus();}catch(__){}}});
}
function closeAllPanels(except=''){if(except!=='rewritePanel')invalidatePendingRewriteOpen();if(except!=='rewritePanel'&&!$('#rewritePanel').hidden)window.AICleanerRewriteStudio?.cancelGeneration?.({status:'패널을 닫아 생성 작업을 취소했습니다.'});panelManager.closeAll(except);syncPanelAria();}
function openPanel(id){
  rememberPanelReturnFocus(id);
  if(innerWidth<=PANEL_SHEET_BREAKPOINT)dismissMobileKeyboard();
  cancelResultNavigation();
  if(id!=='rewritePanel')invalidatePendingRewriteOpen();
  if(id!=='rewritePanel'&&!$('#rewritePanel').hidden)window.AICleanerRewriteStudio?.cancelGeneration?.({status:'다른 도구로 이동해 생성 작업을 취소했습니다.'});
  if(id==='issuesPanel')renderIssues();
  if(id==='reviewPanel'&&(state.reviewsDirty||!state.reviews.length))buildReviews();
  if(id==='checkpointPanel')renderCheckpointPanel();
  if(id==='techPanel')renderTech();
  const panel=panelManager.open(id);if(!panel)return null;syncPanelAria();focusOpenedPanel(panel);
  if(id==='issuesPanel'){state.issueUnread=false;$('#issuesWidget').classList.remove('attention');}
  if(id==='reviewPanel'){state.reviewUnread=false;$('#reviewWidget').classList.remove('attention');}
  if(id==='techPanel'){state.techUnread=false;$('#techWidget').classList.remove('attention');}
  return panel;
}
function clampPanelToViewport(panel){panelManager.clamp(panel);}
let resultNavigationTimer=0;
function cancelResultNavigation(){if(!resultNavigationTimer)return false;clearTimeout(resultNavigationTimer);resultNavigationTimer=0;return true;}
function preferredScrollBehavior(){try{return matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';}catch(_){return'auto';}}
function pulseResultDestination(){
  const card=$('#resultCard');if(!card)return;clearTimeout(pulseResultDestination.timer);card.classList.remove('resultDestinationPulse');void card.offsetWidth;card.classList.add('resultDestinationPulse');pulseResultDestination.timer=setTimeout(()=>card.classList.remove('resultDestinationPulse'),1500);
}
function scrollToResultDestination({focusOutput=false,emphasize=true}={}){
  const textButton=document.querySelector('[data-tool="text"]');if(textButton&&!textButton.classList.contains('active'))textButton.click();
  activateResultTab('cleaned');
  const out=$('#output'),mobile=innerWidth<=PANEL_SHEET_BREAKPOINT,target=mobile?($('#resultCard')||out):out;if(mobile)dismissMobileKeyboard();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const behavior=preferredScrollBehavior();
    if(mobile){const headerHeight=document.querySelector('.top')?.getBoundingClientRect().height||0,targetY=scrollY+target.getBoundingClientRect().top-headerHeight-10;scrollTo({top:Math.max(0,targetY),behavior});}
    else target.scrollIntoView({behavior,block:'center',inline:'nearest'});
    if(emphasize){
      pulseResultDestination();
      clearTimeout(scrollToResultDestination.resultAppliedTimer);out.classList.remove('resultApplied');void out.offsetWidth;out.classList.add('resultApplied');
      scrollToResultDestination.resultAppliedTimer=setTimeout(()=>out.classList.remove('resultApplied'),1300);
    }
    if(focusOutput&&!mobile){out.focus({preventScroll:true});try{out.setSelectionRange(0,0);}catch(_){}}
  }));
}
function revealAppliedResult(message='결과에 적용했습니다.',{closePanelsFirst=true,scroll=true,focusOutput=true}={}){
  if(closePanelsFirst)closeAllPanels();
  if(scroll)scrollToResultDestination({focusOutput});
  showToast(message);
}
function navigateTypewriterResult({announce=false}={}){
  cancelResultNavigation();
  const panel=$('#typingPreviewPanel');panel.hidden=true;panel.classList.remove('typewriterComplete');setMobilePanelExpanded(panel,false);syncPanelAria();
  $('#typingPreviewPause').textContent='일시정지';$('#typingPreviewPause').removeAttribute('title');$('#typingPreviewPause').setAttribute('aria-label','자동작성 일시정지');typewriterBridgeStatus();
  typingPreview.completed=false;scrollToResultDestination({focusOutput:false});
  if(announce)showToast('자동작성 완료 · 결과 위치로 이동했습니다.');
}
function makeDraggable(panel){panelManager.makeDraggable(panel);}

function showToast(message){
  const t=$('#appToast');clearTimeout(showToast.timer);clearTimeout(showToast.hideTimer);t.textContent=message;t.hidden=false;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');
  showToast.timer=setTimeout(()=>{t.classList.remove('show');showToast.hideTimer=setTimeout(()=>{if(!t.classList.contains('show'))t.hidden=true;},180);},1800);
}

function hideContextMenu(){$('#textContextMenu').hidden=true;contextTarget=null;}
function showContextMenu(x,y,target){
  const menu=$('#textContextMenu');contextTarget=target;menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
  requestAnimationFrame(()=>{const w=menu.offsetWidth,h=menu.offsetHeight;menu.style.left=Math.max(8,Math.min(innerWidth-w-8,x))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-h-8,y))+'px';});
  const directOnly=target.dataset&&target.dataset.directTyping==='true';menu.querySelectorAll('[data-context-action="copy"],[data-context-action="paste"],[data-context-action="append"]').forEach(b=>b.disabled=directOnly||((b.dataset.contextAction!=='copy')&&(!!target.readOnly||target.disabled)));
}
function legacyClipboardWrite(text){
  let area=null;const previous=document.activeElement;try{if(!document?.body||typeof document.execCommand!=='function')return false;area=document.createElement('textarea');area.value=String(text??'');area.setAttribute('readonly','');area.setAttribute('aria-hidden','true');area.style.position='fixed';area.style.opacity='0';area.style.pointerEvents='none';area.style.left='-9999px';document.body.appendChild(area);area.focus();area.select();return document.execCommand('copy')===true;}catch(_){return false;}finally{try{area?.remove();}catch(_){}try{if(previous&&typeof previous.focus==='function')previous.focus({preventScroll:true});}catch(_){try{previous?.focus?.();}catch(__){}}}
}
async function clipboardWrite(text){try{if(typeof navigator.clipboard?.writeText==='function'){await navigator.clipboard.writeText(String(text??''));return true;}}catch(_){}return legacyClipboardWrite(text);}
async function clipboardRead(){try{return await navigator.clipboard.readText();}catch(_){showToast('클립보드 읽기가 차단됐습니다. 입력창에서 Ctrl+V를 사용하세요.');return null;}}
async function contextAction(action){
  const el=contextTarget;if(!el)return hideContextMenu();
  if(action==='selectAll'){el.focus();el.select();}
  else if(action==='copy'){const text=el.value.slice(el.selectionStart||0,el.selectionEnd||0)||el.value;showToast(await clipboardWrite(text)?'복사했습니다.':'자동 복사가 차단됐습니다. Ctrl+C를 사용해 주세요.');}
  else if(action==='paste'&&!el.readOnly){const text=await clipboardRead();if(text!=null){el.focus();el.setRangeText(text,el.selectionStart,el.selectionEnd,'end');el.dispatchEvent(new Event('input',{bubbles:true}));}}
  else if(action==='append'&&!el.readOnly){const text=await clipboardRead();if(text!=null){el.focus();const pos=el.selectionEnd;el.setRangeText(text,pos,pos,'end');el.dispatchEvent(new Event('input',{bubbles:true}));}}
  hideContextMenu();
}

function prefersNativeTouchContextMenu(){try{return Number(navigator.maxTouchPoints||0)>0||matchMedia('(pointer: coarse)').matches;}catch(_){return false;}}
document.addEventListener('contextmenu',(e)=>{
  const editor=e.target.closest&&e.target.closest('textarea,input[type="text"],input[type="search"],input[type="url"],input[type="email"]');
  if(!editor){hideContextMenu();return;}
  if(prefersNativeTouchContextMenu()){hideContextMenu();return;}
  e.preventDefault();showContextMenu(e.clientX,e.clientY,editor);
});
document.addEventListener('pointerdown',(e)=>{if(resultNavigationTimer)cancelResultNavigation();if(!e.target.closest('#textContextMenu'))hideContextMenu();});
document.addEventListener('wheel',()=>{if(resultNavigationTimer)cancelResultNavigation();},{passive:true});
$('#textContextMenu').addEventListener('click',(e)=>{const b=e.target.closest('[data-context-action]');if(b&&!b.disabled)contextAction(b.dataset.contextAction);});

document.addEventListener('keydown',(e)=>{
  if(resultNavigationTimer)cancelResultNavigation();
  if(e.key!=='Escape')return;
  hideContextMenu();
  if(!$('#typingPreviewPanel').hidden){stopTypingPreview();return;}
  const closed=panelManager.closeTop();if(closed){if(closed.id==='typingPreviewPanel'&&typewriterEngine.running)stopTypingPreview({restore:true,silent:true});else restorePanelReturnFocus(closed.id);if(closed.id==='rewritePanel')window.AICleanerRewriteStudio?.cancelGeneration?.({status:'패널을 닫아 생성 작업을 취소했습니다.'});syncPanelAria();e.preventDefault();}
});
window.addEventListener('resize',queueViewportSync);window.addEventListener('orientationchange',queueViewportSync);
if(window.visualViewport){window.visualViewport.addEventListener('resize',queueViewportSync);window.visualViewport.addEventListener('scroll',queueViewportSync);}
queueViewportSync();
$('#detailDiagnostics').addEventListener('toggle',()=>{if($('#detailDiagnostics').open){renderStats();renderCompare();}});

function syncTypewriterRecommendation({restart=false}={}){
  const button=$('#typingPreviewButton'),status=$('#typingBridgeStatus'),input=$('#input'),out=$('#output');if(!button||!status||!input)return;
  const hasSource=!!input.value.trim(),busy=!!window.__AI_CLEANER_TYPEWRITER_BUSY__,verified=out?.dataset.typewriterVerified==='true'&&!inputDirty;
  const recommend=hasSource&&!busy&&!verified&&!typewriterRecommendationSuppressed;button.disabled=!hasSource||busy;
  if(restart&&recommend){button.classList.remove('typewriterRecommended');void button.offsetWidth;}
  button.classList.toggle('typewriterRecommended',recommend);
  button.setAttribute('aria-label',!hasSource?'자동작성 원본 새로쓰기 · 원본 입력 후 사용':recommend?'자동작성 원본 새로쓰기 · 다음 단계, 눌러서 새로쓰기':typewriterRecommendationSuppressed?'자동작성 원본 새로쓰기 · 필요할 때 다시 사용':'자동작성 원본 새로쓰기');
  if(busy)return;
  status.textContent=!hasSource?'원본 입력 후 사용':verified?'다시 새로쓰기':typewriterRecommendationSuppressed?'필요할 때 새로쓰기':'다음 단계 · 눌러서 새로쓰기';
}
const typewriterEngine=Modules.createTypewriterEngine({split:splitGraphemesExact});
function setTypewriterBusy(busy){
  window.__AI_CLEANER_TYPEWRITER_BUSY__=!!busy;if(busy)workLock.acquire('typewriter');else workLock.release('typewriter');
  const controls=[...new Set([
    ...['copy','downloadTxt','editResult','undoStep','redoStep','undoAll','checkpointSave','checkpointOpen','sample','reset','textFileInput','cleanProfile','norm','repeat','length','liveScan','openImage','imageInput'].map(id=>$('#'+id)).filter(Boolean),
    ...$$('[data-tool]'),...$$('[data-resulttab]'),...$$('.floatWidget')
  ])];
  if(busy){typewriterDisabledState=new Map();for(const el of controls){typewriterDisabledState.set(el,!!el.disabled);el.disabled=true;}}
  else{for(const [el,wasDisabled] of typewriterDisabledState){if(el&&el.isConnected)el.disabled=wasDisabled;}typewriterDisabledState.clear();updateHistoryButtons();syncWidgets();}
  $('#typingPreviewButton').classList.toggle('typewriterRunning',!!busy);$('#typingPreviewButton').classList.remove('typewriterRecommended');
  $('#resultCard')?.classList.toggle('typewriterDestinationActive',!!busy);
  $('#output').classList.toggle('typewriterActive',!!busy);$('#output').setAttribute('aria-busy',busy?'true':'false');
  if(busy)$('#typingPreviewButton').disabled=true;else syncTypewriterRecommendation();
  syncCompletionFlowUi();
}
function typewriterStatus(text){const el=$('#typingPreviewText');if(el)el.textContent=text;}
function typewriterBridgeStatus(text){const el=$('#typingBridgeStatus');if(!el)return;if(typeof text==='string')el.textContent=text;else syncTypewriterRecommendation();}
function stopTypingPreview({restore=true,silent=false}={}){
  cancelResultNavigation();
  const snap=typewriterEngine.snapshot(),wasRunning=snap.running&&!snap.completed;typewriterEngine.stop();
  const panel=$('#typingPreviewPanel');panel.hidden=true;panel.classList.remove('typewriterComplete');setMobilePanelExpanded(panel,false);syncPanelAria();$('#typingPreviewPause').textContent='일시정지';$('#typingPreviewPause').removeAttribute('title');$('#typingPreviewPause').setAttribute('aria-label','자동작성 일시정지');typewriterBridgeStatus();
  typingPreview.completed=false;$('#input').readOnly=typingPreview.inputWasReadOnly;setTypewriterBusy(false);
  if(restore&&wasRunning&&typingPreview.historyIndex>=0){restoreHistoryIndex(typingPreview.historyIndex,{announce:false,suppressTypewriterRecommendation:false});if(!silent)showToast('자동 작성을 중지하고 이전 결과로 복원했습니다.');}
  restorePanelReturnFocus('typingPreviewPanel');
}
function finishTypingPreview(snapshot){
  const out=$('#output'),source=snapshot.source,exact=out.value===source;$('#input').readOnly=typingPreview.inputWasReadOnly;setTypewriterBusy(false);
  if(!exact){typewriterStatus(`일치 검증 실패 · 원본 ${source.length} UTF-16 / 결과 ${out.value.length} UTF-16`);$('#typingPreviewPause').textContent='오류';if(typingPreview.historyIndex>=0)restoreHistoryIndex(typingPreview.historyIndex,{announce:false,suppressTypewriterRecommendation:false});const panel=$('#typingPreviewPanel');panel.hidden=true;setMobilePanelExpanded(panel,false);syncPanelAria();typewriterBridgeStatus();showToast('자동 작성 검증에 실패해 이전 결과로 복원했습니다.');return;}
  const cleaned=typingPreview.removedHidden+typingPreview.normalizedSpaces;
  const resultAudit=sanitizeVisibleTypingSource(out.value),safeResidue=resultAudit.removed.length+resultAudit.normalizedSpaces.length;
  if(safeResidue){typewriterStatus(`결과 재검사 실패 · 안전 제거 대상 ${safeResidue}개가 남았습니다.`);if(typingPreview.historyIndex>=0)restoreHistoryIndex(typingPreview.historyIndex,{announce:false,suppressTypewriterRecommendation:false});const panel=$('#typingPreviewPanel');panel.hidden=true;setMobilePanelExpanded(panel,false);syncPanelAria();typewriterBridgeStatus();showToast('결과 재검사에서 숨은 표식이 남아 이전 결과로 복원했습니다.');return;}
  typewriterStatus(`100% 작성 확인 ✓ · ${snapshot.chars.length.toLocaleString()} 글자 단위 · 결과 안전 제거 대상 0개${cleaned?` · 원본에서 숨은/특수 문자 ${cleaned}개 정리`:''}${typingPreview.preservedSensitive?` · 의미 민감 ${typingPreview.preservedSensitive}개 보존`:''}`);
  const panel=$('#typingPreviewPanel');typingPreview.completed=true;panel.classList.add('typewriterComplete');
  $('#typingPreviewProgress').textContent='100%';$('#typingPreviewPause').textContent='완료 · 결과 보기';$('#typingPreviewPause').setAttribute('aria-label','자동작성 완료, 결과 보기');$('#typingPreviewPause').title='팝업을 닫고 결과 위치로 이동합니다.';typewriterBridgeStatus('완료');out.dataset.typewriterVerified='true';$('#typingPreviewButton').classList.remove('typewriterRecommended');
  if(window.AICleanerApp.commitProgressiveResult(source,'자동작성 원본 새로쓰기')){if(innerWidth<=PANEL_SHEET_BREAKPOINT)resultNavigationTimer=setTimeout(()=>navigateTypewriterResult({announce:false}),1100);else navigateTypewriterResult({announce:false});}
}
function startTypingPreview(){
  if(typewriterEngine.running)return;invalidatePendingTextImport();typewriterRecommendationSuppressed=false;
  const rawSource=$('#input').value;if(!rawSource)return showToast('먼저 원본 글을 입력해 주세요.');
  const prepared=sanitizeVisibleTypingSource(rawSource),source=prepared.text;
  if(!source)return showToast('새로 쓸 수 있는 보이는 글씨가 없습니다.');
  analysisCoordinator.cancel();if(!$('#output').readOnly)$('#editResult').click();if(inputDirty||state.original!==rawSource){if(!analyze(true))return;}if(historyStore.index<0)resetHistory('자동 작성 전');
  closeAllPanels();activateResultTab('cleaned');
  typingPreview={source,rawSource,historyIndex:historyStore.index,inputWasReadOnly:$('#input').readOnly,bridgePct:-1,removedHidden:prepared.removed.length,normalizedSpaces:prepared.normalizedSpaces.length,preservedSensitive:prepared.preservedSensitive.length,completed:false};
  const out=$('#output');delete out.dataset.typewriterVerified;out.readOnly=true;out.value='';out.scrollTop=0;$('#input').readOnly=true;openPanel('typingPreviewPanel');
  cancelResultNavigation();$('#typingPreviewPanel').classList.remove('typewriterComplete');$('#typingPreviewPause').textContent='일시정지';$('#typingPreviewPause').removeAttribute('title');$('#typingPreviewPause').setAttribute('aria-label','자동작성 일시정지');$('#typingPreviewProgress').textContent='0%';typewriterBridgeStatus('0%');setTypewriterBusy(true);
  scrollToResultDestination({focusOutput:false,emphasize:false});showToast('자동작성 시작 · 결과 화면에서 새로 쓰는 과정을 확인하세요.');
  typewriterEngine.start(source,{
    getDelay:()=>Math.max(0,Number($('#typingPreviewSpeed').value)||0),
    append:piece=>{out.setRangeText(piece,out.value.length,out.value.length,'end');out.scrollTop=out.scrollHeight;},
    onStart:snap=>typewriterStatus(`보이는 글씨 ${snap.chars.length.toLocaleString()} 글자 단위를 결과창에 순서대로 작성합니다.${typingPreview.removedHidden?` 숨은 문자 ${typingPreview.removedHidden}개 제거.`:''}${typingPreview.normalizedSpaces?` 특수 공백 ${typingPreview.normalizedSpaces}개 일반 공백으로 정리.`:''}`),
    onProgress:({index,total,pct})=>{
      $('#typingPreviewProgress').textContent=pct+'%';if(pct!==typingPreview.bridgePct){typingPreview.bridgePct=pct;typewriterBridgeStatus(pct+'%');}
      if(index===1||index%50===0||index===total)typewriterStatus(`작성 중 · ${index.toLocaleString()} / ${total.toLocaleString()} 글자 단위 · ${pct}%`);
    },
    onComplete:finishTypingPreview
  });
}
$('#typingPreviewButton').onclick=startTypingPreview;
$('#typingPreviewClose').onclick=()=>stopTypingPreview({restore:true});
$('#typingPreviewPause').onclick=()=>{
  if(!typewriterEngine.running){if(typingPreview.completed)navigateTypewriterResult({announce:true});return;}const paused=typewriterEngine.togglePause(),snap=typewriterEngine.snapshot(),pct=Math.round((snap.index/Math.max(1,snap.chars.length))*100);
  $('#typingPreviewPause').textContent=paused?'계속':'일시정지';typewriterBridgeStatus(paused?'일시정지':pct+'%');typewriterStatus(paused?`일시정지 · ${snap.index.toLocaleString()} / ${snap.chars.length.toLocaleString()}`:`작성 계속 · ${snap.index.toLocaleString()} / ${snap.chars.length.toLocaleString()}`);
};

$('#input').addEventListener('input',()=>{invalidatePendingTextImport();handleSourceMutation({analyzeNow:false,resetPerformance:false});});
$('#sample').addEventListener('click',()=>{invalidatePendingTextImport();if(replaceSourceText(sample,{analyzeNow:true,resetPerformance:true}))showToast('샘플을 불러오고 바로 다듬었습니다.');});
$('#reset').addEventListener('click',resetTextWorkspace);
['norm','repeat','length','liveScan','cleanProfile'].forEach(id=>$('#'+id).addEventListener('change',()=>{if(!$('#input').value.trim())return;if(id==='liveScan'){if($('#liveScan').checked)queueLiveAnalysis();else{analysisCoordinator.cancel();analysisPerformance.reset();syncResultFreshnessUi();}return;}analyze(true);}));

$('#copy').onclick=async()=>{if(!ensureFreshAnalysis()||!$('#output').value)return;const copied=await clipboardWrite($('#output').value);if(!copied){try{$('#output').focus();$('#output').select();}catch(_){} }showToast(copied?'결과를 복사했습니다.':'자동 복사가 차단됐습니다. 결과가 선택되어 있으니 직접 복사해 주세요.');};
$('#downloadTxt').onclick=()=>{if(ensureFreshAnalysis()&&$('#output').value){download(`cleaned-v${APP_VERSION}.txt`,$('#output').value,'text/plain;charset=utf-8');showToast('TXT 파일 저장을 시작했습니다.');}};
$('#downloadJson').onclick=()=>{if(!ensureFreshAnalysis()||!state.original)return;const audit=textHygieneAudit();download(`ai-clean-report-v${APP_VERSION}.json`,JSON.stringify({version:APP_VERSION,profile:$('#cleanProfile').value,hygieneScore:state.score,analysisMs:state.analyzeMs,textHygieneAudit:audit,policy:Modules.getTextHygienePolicy?.(),autoProcessed:state.chars,preserved:state.allChars.filter(x=>!x.auto),homoglyphs:state.homoglyphs,suggestions:state.issues},null,2),'application/json;charset=utf-8');};
$('#undoAll').onclick=()=>{if(inputDirty||!state.original)return;invalidateTypewriterVerification();state.issueBase=state.base;state.issues=issues(state.base);state.reviews=[];state.applied.clear();state.manual=false;state.working=state.base;renderAll();notifyTextChanged('output');flashOutput();recordHistory('처음 결과');};
$('#undoStep').onclick=undoHistory;$('#redoStep').onclick=redoHistory;
$('#editResult').onclick=()=>{if(!ensureFreshAnalysis()||!state.original)return;const out=$('#output');if(out.readOnly){manualEditBaseline=out.value;out.readOnly=false;out.focus();$('#editResult').textContent='✓ 수정 완료';syncWidgets();updateHistoryButtons();syncCompletionFlowUi();}else{out.readOnly=true;const edited=out.value;$('#editResult').textContent='✎ 직접 수정';if(edited!==manualEditBaseline){refreshSuggestionBaseline(edited,{unread:false});renderAll();flashOutput();recordHistory('직접 수정');}else{state.working=edited;state.manual=false;syncWidgets();updateHistoryButtons();}manualEditBaseline='';syncCompletionFlowUi();}};
$('#output').addEventListener('input',()=>{if(!$('#output').readOnly){invalidateTypewriterVerification();state.working=$('#output').value;state.manual=true;queueCompare();syncResultFreshnessUi();}});
$('#v62ApplyReviews').onclick=applyReviews;if($('#applyAllIssues'))$('#applyAllIssues').onclick=applyAllIssues;

$('#textFileInput').addEventListener('change',async e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;const request=++textImportSeq,lockName=`text-import-${request}`;workLock.acquire(lockName,{name:f.name||'text'});
  try{
    const imported=await fileImport.read(f);if(request!==textImportSeq)return;
    const large=imported.text.length>=ANALYSIS_WORKER_THRESHOLD,ok=replaceSourceText(imported.text,{analyzeNow:!large,backgroundNow:large,resetPerformance:true});if(!ok)return;
    const encodingNote=imported.encoding==='euc-kr'?' · EUC-KR/CP949 감지':imported.encoding&&imported.encoding.startsWith('utf-16')?` · ${imported.encoding.toUpperCase()} 감지`:'';
    showToast((large?`${imported.name} 파일을 열었습니다. 큰 문서는 백그라운드에서 분석합니다.`:`${imported.name} 파일을 열고 바로 다듬었습니다.`)+encodingNote);
  }
  catch(err){if(request!==textImportSeq)return;if(err?.code==='FILE_TOO_LARGE')showToast('20MB가 넘는 텍스트 파일은 브라우저가 느려질 수 있어 열지 않았습니다. 파일을 나눠서 사용해 주세요.');else if(err?.code==='BINARY_TEXT')showToast('바이너리 데이터가 많은 파일이라 텍스트로 열지 않았습니다.');else showToast('파일을 읽지 못했습니다. 텍스트 기반 파일인지 확인해 주세요.');}
  finally{workLock.release(lockName);e.target.value='';}
});

$$('[data-resulttab]').forEach(t=>{t.onclick=()=>activateResultTab(t.dataset.resulttab);t.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=$$('[data-resulttab]').filter(x=>!x.disabled);if(!tabs.length)return;const current=tabs.indexOf(t),dir=e.key==='ArrowLeft'?-1:1;let next=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs[(current+dir+tabs.length)%tabs.length];if(!next)return;e.preventDefault();activateResultTab(next.dataset.resulttab);next.focus();});});

const TOOL_SECTION_IDS={text:'textTool',image:'imageTool',writing:'writingTool'};
const toolTabs=$$('[data-tool]');
function activateToolTab(b){
  if(!b)return;const nextTool=b.dataset.tool;
  if(nextTool!=='text'){invalidatePendingRewriteOpen();try{window.AICleanerRewriteStudio?.saveSession?.();}catch(_){}window.AICleanerRewriteStudio?.cancelGeneration?.({status:'다른 도구로 이동해 생성 작업을 취소했습니다.'});closeAllPanels();}
  if(nextTool!=='image'){invalidatePendingImageRun({status:'다른 도구로 이동해 이미지 분석을 중지했습니다.'});window.cancelImageAnalysis?.({status:'다른 도구로 이동해 이미지 분석을 중지했습니다.'});}
  if(nextTool==='writing')void aiWritingOs.activate().catch(err=>{console.error(err);showToast('블로그 팩토리를 초기화하지 못했습니다. 새로고침 후 다시 시도해 주세요.');});else aiWritingOs.deactivate();
  toolTabs.forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-selected',active?'true':'false');x.tabIndex=active?0:-1;});
  for(const [tool,id] of Object.entries(TOOL_SECTION_IDS))$('#'+id)?.classList.toggle('hidden',tool!==nextTool);syncDocumentTitle(nextTool);syncWidgets();
}
toolTabs.forEach(b=>{
  b.onclick=()=>activateToolTab(b);
  b.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
    const current=toolTabs.indexOf(b),dir=e.key==='ArrowLeft'?-1:1;
    const next=e.key==='Home'?toolTabs[0]:e.key==='End'?toolTabs.at(-1):toolTabs[(current+dir+toolTabs.length)%toolTabs.length];
    if(!next)return;e.preventDefault();activateToolTab(next);next.focus();
  });
});

window.AICleanerApp={
  version:APP_VERSION,assetVersion:ASSET_VERSION,showToast,configureEditors,eventBus,workLock,historyStore,textStateStore,textEngine,diffEngine,diffView,analysisWorker,analysisPerformance,analysisCoordinator,fileImport,checkpointStore,aiWritingOs,updateManager,panelManager,typewriterEngine,
  analyzeNow(silent=false){return analyze(!!silent);},
  getText(kind='output'){if(kind==='original')return $('#input').value||'';if($('#input').value.trim()&&(inputDirty||!$('#output').value||state.original!==$('#input').value))analyze(true);return $('#output').value||state.working||'';},
  commitProgressiveResult(text,label='자동작성 원본 새로쓰기'){
    const next=String(text??''),out=$('#output');if(out.value!==next)return false;
    out.readOnly=true;$('#editResult').textContent='✎ 직접 수정';refreshSuggestionBaseline(next,{unread:false});renderAll({preserveOutput:true});recordHistory(label);notifyTextChanged('output');revealAppliedResult(`✓ 보이는 글씨를 한 글자씩 새로 썼습니다.${typingPreview.removedHidden?` 숨은 문자 ${typingPreview.removedHidden}개 제거.`:''}`,{closePanelsFirst:false,scroll:false,focusOutput:false});return true;
  },
  applyRewrite(text,label='새 글 재작성'){
    const next=String(text||'');if(!next.trim())return false;
    invalidateTypewriterVerification();const ww=$('#rewriteWidget');if(ww){ww.dataset.seenReady='1';ww.classList.remove('rewriteReady');}
    $('#output').readOnly=true;$('#output').value=next;$('#editResult').textContent='✎ 직접 수정';
    refreshSuggestionBaseline(next,{unread:false});renderAll();recordHistory(label);revealAppliedResult('✓ 새 글을 결과에 적용했습니다.');return true;
  },
  openPanel,closeAllPanels,revealAppliedResult
};
$('#rewriteWidget').onclick=async()=>{const request=++rewriteOpenSeq;try{showToast('재작성 스튜디오를 여는 중…');const studio=await ensureRewriteStudio();if(request!==rewriteOpenSeq||!document.querySelector('[data-tool="text"]')?.classList.contains('active'))return;openPanel('rewritePanel');if(request!==rewriteOpenSeq)return;studio.open();}catch(err){if(request!==rewriteOpenSeq)return;console.error(err);showToast('재작성 도구를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');}};
$('#issuesWidget').onclick=()=>openPanel('issuesPanel');$('#reviewWidget').onclick=()=>openPanel('reviewPanel');$('#checkpointOpen').onclick=()=>openPanel('checkpointPanel');$('#checkpointSave').onclick=saveResultCheckpoint;$('#checkpointClear').onclick=clearResultCheckpoints;$('#checkpointList').addEventListener('click',e=>{const b=e.target.closest('[data-checkpoint-action]'),item=e.target.closest('[data-checkpoint-id]');if(!b||!item||b.disabled)return;const id=item.dataset.checkpointId;if(b.dataset.checkpointAction==='restore')restoreResultCheckpoint(id);else if(b.dataset.checkpointAction==='copy')void copyResultCheckpoint(id);else if(b.dataset.checkpointAction==='remove')removeResultCheckpoint(id);});$('#techWidget').onclick=()=>openPanel('techPanel');
$$('[data-close-panel]').forEach(b=>b.onclick=()=>{const p=$('#'+b.dataset.closePanel);if(!p)return;if(p.id==='rewritePanel')window.AICleanerRewriteStudio?.cancelGeneration?.({status:'패널을 닫아 생성 작업을 취소했습니다.'});p.hidden=true;setMobilePanelExpanded(p,false);syncPanelAria();restorePanelReturnFocus(p.id);});
$$('[data-panel-size]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();const p=$('#'+b.dataset.panelSize);if(!p||innerWidth>PANEL_SHEET_BREAKPOINT)return;setMobilePanelExpanded(p,!p.classList.contains('mobileExpanded'));requestAnimationFrame(()=>p.querySelector('.floatBody')?.scrollTo({top:0,behavior:preferredScrollBehavior()}));});
makeDraggable($('#typingPreviewPanel'));makeDraggable($('#issuesPanel'));makeDraggable($('#reviewPanel'));makeDraggable($('#rewritePanel'));makeDraggable($('#checkpointPanel'));makeDraggable($('#techPanel'));

const dz=$('#dropzone'),fi=$('#imageInput');let imageRunSeq=0;
function invalidatePendingImageRun({status='이미지를 선택하면 검사를 시작합니다.'}={}){imageRunSeq++;const el=$('#imageLoadStatus');if(el?.textContent==='이미지 검사 엔진 준비 중…')el.textContent=status;return imageRunSeq;}
const runImage=async(f)=>{
  if(!f)return false;const run=++imageRunSeq,lockName=`image-analysis-${run}`;workLock.acquire(lockName,{name:f.name||'image'});
  try{$('#imageLoadStatus').textContent='이미지 검사 엔진 준비 중…';const loadImage=await ensureImageAnalyzer();if(run!==imageRunSeq||!document.querySelector('[data-tool="image"]')?.classList.contains('active'))return false;return await loadImage(f);}
  catch(err){if(run!==imageRunSeq)return false;console.error(err);$('#imageLoadStatus').textContent='이미지 검사 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.';showToast('이미지 검사 중 오류가 발생했습니다.');return false;}
  finally{workLock.release(lockName);}
};
$('#openImage').onclick=()=>fi.click();dz.onclick=e=>{if(!e.target.closest('#openImage'))fi.click();};fi.onchange=()=>{const f=fi.files&&fi.files[0];if(f)runImage(f);fi.value='';};
['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag');}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag');}));
dz.addEventListener('drop',e=>{const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f)runImage(f);});

function suspendPageWork(){
  aiWritingOs.deactivate();
  invalidatePendingTextImport();invalidatePendingRewriteOpen();invalidatePendingImageRun({status:'페이지 이동으로 이미지 분석을 중지했습니다.'});
  try{window.AICleanerRewriteStudio?.cancelGeneration?.({status:'페이지 이동으로 생성 작업을 중지했습니다.'});window.AICleanerRewriteStudio?.saveSession?.();}catch(_){}
  try{window.cancelImageAnalysis?.({status:'페이지 이동으로 이미지 분석을 중지했습니다.'});}catch(_){}
  analysisCoordinator.cancel();analysisWorker.terminate();updateManager.stop();cancelResultNavigation();clearTimeout(pulseResultDestination.timer);clearTimeout(showToast.timer);clearTimeout(showToast.hideTimer);clearTimeout(flashOutput.timer);clearTimeout(scrollToResultDestination.resultAppliedTimer);clearTimeout(syncWidgets.rewriteReadyTimer);
  const toast=$('#appToast');if(toast){toast.classList.remove('show');toast.hidden=true;}const resultCard=$('#resultCard');if(resultCard)resultCard.classList.remove('resultDestinationPulse');const out=$('#output');if(out)out.classList.remove('resultFlash','resultApplied');$('#rewriteWidget')?.classList.remove('rewriteReady');
  if(viewportFrame){cancelAnimationFrame(viewportFrame);viewportFrame=0;}
  if(typewriterEngine.running||window.__AI_CLEANER_TYPEWRITER_BUSY__)stopTypingPreview({restore:true,silent:true});
  if(statsFrame){cancelAnimationFrame(statsFrame);statsFrame=0;}clearTimeout(statsTimer);statsTimer=0;clearTimeout(compareTimer);
}
function resumePageWork(event){
  if(!event?.persisted)return;queueViewportSync();configureEditors();syncWidgets();
  if(document.querySelector('[data-tool="writing"]')?.classList.contains('active'))void aiWritingOs.activate().catch(()=>{});
  updateManager.start({initialDelay:1200,interval:120000});
  if(inputDirty&&$('#input').value.trim()&&$('#liveScan').checked)queueLiveAnalysis();else{queueStats();if($('#detailDiagnostics').open)queueCompare();}
}

applyVersionUi();configureEditors();renderStats();syncWidgets();syncCheckpointUi();updateManager.restorePending();syncResultFreshnessUi();syncPanelAria();syncTypewriterRecommendation();
updateManager.start({initialDelay:5000,interval:120000});
window.addEventListener('pagehide',suspendPageWork);window.addEventListener('pageshow',resumePageWork);
})();
