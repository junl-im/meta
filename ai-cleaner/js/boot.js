(() => {
  'use strict';
  window.__AI_CLEANER_APP_READY__=false;
  document.documentElement.classList.add('app-booting');
  const domReady = document.readyState === 'loading' ? new Promise(r => document.addEventListener('DOMContentLoaded', r, {once:true})) : Promise.resolve();
  const VERSION_FETCH_TIMEOUT_MS=3500, SCRIPT_LOAD_TIMEOUT_MS=10000;
  const addLink = (rel, href, attrs={}) => { const l=document.createElement('link'); l.rel=rel; l.href=href; Object.entries(attrs).forEach(([k,v])=>l.setAttribute(k,v)); document.head.appendChild(l); return l; };
  const loadScript = (src,timeoutMs=SCRIPT_LOAD_TIMEOUT_MS) => new Promise((resolve,reject) => {
    const s=document.createElement('script');let settled=false;
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);s.onload=null;s.onerror=null;if(error){s.remove();reject(error);}else resolve(s);};
    const timer=setTimeout(()=>finish(new Error(`스크립트 로드 시간 초과 (${Math.round(timeoutMs/1000)}초): ${src}`)),timeoutMs);
    s.src=src;s.async=false;s.onload=()=>finish();s.onerror=()=>finish(new Error('스크립트 로드 실패: '+src));document.body.appendChild(s);
  });
  const showBootFailure = (err) => {
    if(!document.body)return;
    document.body.inert=false;
    document.body.setAttribute('aria-busy','false');
    let overlay=document.getElementById('bootErrorOverlay');
    if(!overlay){
      overlay=document.createElement('section');
      overlay.id='bootErrorOverlay';
      overlay.className='bootFailureOverlay';
      overlay.setAttribute('role','alert');
      overlay.setAttribute('aria-live','assertive');
      const card=document.createElement('div');card.className='bootFailureCard';
      const title=document.createElement('h1');title.textContent='앱을 불러오지 못했습니다.';
      const help=document.createElement('p');help.textContent='네트워크 또는 캐시 문제일 수 있습니다. 다시 불러온 뒤에도 계속되면 아래 오류 내용을 확인해 주세요.';
      const detail=document.createElement('pre');detail.id='bootErrorDetail';detail.className='bootError';
      const retry=document.createElement('button');retry.id='bootRetry';retry.className='btn primary';retry.type='button';retry.textContent='다시 불러오기';retry.addEventListener('click',()=>location.reload());
      card.append(title,help,detail,retry);overlay.appendChild(card);document.body.appendChild(overlay);
    }
    const detail=document.getElementById('bootErrorDetail');if(detail)detail.textContent=String(err?.message||err||'알 수 없는 초기화 오류');
    requestAnimationFrame(()=>document.getElementById('bootRetry')?.focus({preventScroll:true}));
  };
  async function boot(){
    let config={version:'local',assetVersion:String(Date.now()),channel:'local'};
    try{
      const controller=typeof AbortController!=='undefined'?new AbortController():null;
      const timer=setTimeout(()=>controller?.abort(),VERSION_FETCH_TIMEOUT_MS);
      try{const options={cache:'no-store'};if(controller)options.signal=controller.signal;const r=await fetch('version.json?ts='+Date.now(),options);if(r.ok)config={...config,...await r.json()};}
      finally{clearTimeout(timer);}
    }catch(_){}
    window.__AI_CLEANER_VERSION__=config;
    const av=encodeURIComponent(String(config.assetVersion||config.version||Date.now()));
    addLink('icon','assets/favicon-v66.png?v='+av,{'type':'image/png','sizes':'32x32'});
    addLink('apple-touch-icon','assets/apple-touch-icon-v66.png?v='+av,{'sizes':'180x180'});
    addLink('manifest','site.webmanifest?v='+av);
    const versionedCssHref='css/app.css?v='+av;
    let css=document.getElementById('appStylesheet');
    if(!css)css=addLink('stylesheet',versionedCssHref,{id:'appStylesheet'});
    if(css.getAttribute('href')!==versionedCssHref){
      const cssSettled=new Promise(r=>{css.onload=r;css.onerror=r;});
      css.href=versionedCssHref;
      await Promise.race([cssSettled,new Promise(r=>setTimeout(r,1800))]);
    }else if(!css.sheet){
      await Promise.race([new Promise(r=>{css.onload=r;css.onerror=r;}),new Promise(r=>setTimeout(r,1800))]);
    }
    await domReady;
    const version=String(config.version||'').trim();
    const badge=document.getElementById('versionBadge'); if(badge)badge.textContent=version?'v'+version:'version';
    const footer=document.getElementById('footerVersion'); if(footer)footer.textContent=version?'v'+version:'';
    if(version)document.title='곰같은여우의 AI 흔적 지우개 v'+version;
    if(document.body){document.body.inert=true;document.body.setAttribute('aria-busy','true');}
    document.documentElement.classList.add('boot-ready');
    const coreScripts=[
      'js/core/event-bus.js','js/core/history-store.js','js/core/work-lock.js','js/core/text-utils.js',
      'js/core/state-store.js','js/core/text-engine.js','js/core/diff-engine.js','js/services/analysis-worker-adapter.js','js/services/analysis-performance-governor.js','js/services/analysis-coordinator.js','js/services/update-manager.js',
      'js/ui/panel-manager.js','js/ui/diff-view.js','js/features/file-import.js','js/features/typewriter-engine.js','js/features/result-checkpoint-store.js'
    ];
    let bundled=false;
    try{await loadScript('vendor/app-core.bundle.js?v='+av,6500);bundled=!!window.AICleanerApp;}
    catch(err){console.warn('초기 런타임 bundle을 사용할 수 없어 개별 소스로 전환합니다.',err);}
    if(!bundled){for(const src of coreScripts)await loadScript(src+'?v='+av);await loadScript('js/app.js?v='+av);}
    if(!window.AICleanerApp)throw new Error('앱 초기화 완료 객체가 없습니다.');
    window.AICleanerApp.ready=true;
    window.__AI_CLEANER_APP_READY__=true;
    document.documentElement.classList.remove('app-booting');
    document.documentElement.classList.add('app-ready');
    if(document.body){document.body.inert=false;document.body.setAttribute('aria-busy','false');}
    document.dispatchEvent(new CustomEvent('ai-cleaner:ready',{detail:{version:String(config.version||'local'),assetVersion:String(config.assetVersion||'')}}));
    if('serviceWorker' in navigator&&location.protocol!=='file:'){
      navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(err=>console.warn('오프라인 캐시 등록 실패',err));
    }
  }
  boot().catch(err=>{
    console.error(err);window.__AI_CLEANER_APP_READY__=false;document.documentElement.classList.remove('app-booting');document.documentElement.classList.add('boot-ready','app-boot-failed');
    showBootFailure(err);
  });
})();
