(() => {
  "use strict";
  const AUTHORS = ["[곰같은여우]","[여우같은곰]","고양이와사비","[ZERO]","닥터X"];
  const LAST_KEY = "gomfox_recent_naver_novel_v2";
  const REFRESH_MS = 7*60*60*1000;
  const FEED_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? "./catalog-feed.json"
    : "https://junl-im.github.io/meta/NaverNovelShelf/site/catalog-feed.json";
  const escapeHTML = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const byId = id => document.getElementById(id);
  let works = (Array.isArray(window.NOVEL_CATALOG)?window.NOVEL_CATALOG:[])
    .filter(w=>AUTHORS.includes(w.author) && /^\d+$/.test(w.id) && ["best","challenge"].includes(w.league))
    .filter(w=>w.url === "https://m.novel.naver.com/"+w.league+"/list?novelId="+w.id)
    .sort((a,b)=>Number(b.id)-Number(a.id));
  let selectedLeague="all";
  let lastReadId=null;
  let toastTimer=null;
  let lastFeedFetch=0;
  try { lastReadId=localStorage.getItem(LAST_KEY); } catch {}
  const findLast = () => works.find(w=>w.id===lastReadId);
  async function refreshCatalog() {
    lastFeedFetch=Date.now();
    try {
      const response=await fetch(FEED_URL,{cache:"no-store"});
      if(!response.ok) return;
      const feed=await response.json();
      if(feed.schema_version!==1||!Array.isArray(feed.works)||!/^\d{4}-\d{2}-\d{2}$/.test(feed.catalog_last_verified||""))return;
      if(feed.catalog_last_verified<(window.NOVEL_CATALOG_LAST_CHECK||""))return;
      const next=feed.works.map(row=>({
        title:row.title,author:row.author_search_identity,id:String(row.id),
        league:row.league,image:row.cover_thumbnail_url,genre:row.genre,url:row.official_url
      }));
      const ids=new Set();
      if(next.some(row=>{
        const key=row.league+":"+row.id;
        if(ids.has(key))return true;ids.add(key);
        return !AUTHORS.includes(row.author)||!/^\d+$/.test(row.id)||
          !["best","challenge"].includes(row.league)||!row.title||!row.genre||
          !safeCover(row.image)||row.url!=="https://m.novel.naver.com/"+row.league+"/list?novelId="+row.id;
      }))return;
      next.sort((a,b)=>Number(b.id)-Number(a.id));
      if(JSON.stringify(next)!==JSON.stringify(works)){
        works=next;
        renderWorks();renderResumeButtons();
      }
    } catch { /* Keep the verified bundled catalog when the feed is unavailable. */ }
  }
  function toast(message) {
    const el=byId("toast");
    el.textContent=message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>el.classList.remove("show"),2900);
  }
  function safeCover(url) {
    try { const u=new URL(url);return u.protocol==="https:"&&u.hostname==="novel-phinf.pstatic.net"?u.href:""; }
    catch { return ""; }
  }
  function filterWorks() {
    const query=byId("search-input").value.trim().normalize("NFKC").toLocaleLowerCase();
    return works.filter(w=>
      (selectedLeague==="all"||w.league===selectedLeague) &&
      (!query||[w.title,w.genre].join(" ").normalize("NFKC").toLocaleLowerCase().includes(query))
    );
  }
  function renderWorks() {
    const rows=filterWorks();
    byId("work-count").textContent=rows.length.toLocaleString("ko-KR");
    byId("hero-total").textContent=works.length.toLocaleString("ko-KR");
    byId("result-description").textContent="총 "+rows.length+"편의 이야기";
    byId("empty-books").hidden=rows.length!==0;
    const makeCard=w=>{
      const isLast=w.id===lastReadId;
      const cover=safeCover(w.image);
      return `<a class="novel-card" href="${escapeHTML(w.url)}" target="_blank" rel="noopener noreferrer" data-open-novel="${escapeHTML(w.id)}" aria-label="${escapeHTML(w.title)} 네이버 회차 목록 열기" title="${escapeHTML(w.title)}">
          <div class="novel-cover">
            <span class="cover-placeholder asset-icon asset-book" aria-hidden="true"></span>
            ${cover?`<img src="${escapeHTML(cover)}" alt="${escapeHTML(w.title)} 표지" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="280" height="224">`:""}
            ${isLast?'<span class="recent-tag">최근 열어봄</span>':""}
          </div>
          <div class="novel-info">
            <div class="novel-meta"><span class="genre-label">${escapeHTML(w.genre)}</span></div>
            <h3>${escapeHTML(w.title)}</h3>
            <div class="novel-card-bottom"><span>회차 목록 보기</span><span aria-hidden="true">↗</span></div>
          </div>
        </a>`;
    };
    const leagues=[{value:"best",label:"베스트리그",caption:"NAVER BEST LEAGUE",icon:"asset-best"},{value:"challenge",label:"챌린지리그",caption:"NAVER CHALLENGE LEAGUE",icon:"asset-quill"}];
    byId("league-groups").innerHTML=leagues.filter(league=>selectedLeague==="all"||league.value===selectedLeague).map(league=>{
      const groupRows=rows.filter(w=>w.league===league.value);
      if(!groupRows.length)return "";
      return `<section class="league-section" aria-label="${league.label}">
        <div class="league-section-heading"><span class="asset-icon ${league.icon}" aria-hidden="true"></span>
          <div><small>${league.caption}</small><h3>${league.label} <span class="count-pill">${groupRows.length}</span></h3></div>
        </div>
        <div class="novel-grid">${groupRows.map(makeCard).join("")}</div>
      </section>`;
    }).join("");
    byId("league-groups").querySelectorAll("[data-open-novel]").forEach(el=>el.addEventListener("click",()=>{
      lastReadId=el.dataset.openNovel;
      try{localStorage.setItem(LAST_KEY,lastReadId);}catch{}
      renderResumeButtons();
      byId("league-groups").querySelectorAll(".recent-tag").forEach(tag=>tag.remove());
      el.querySelector(".novel-cover")?.insertAdjacentHTML("beforeend",'<span class="recent-tag">최근 열어봄</span>');
    }));
    byId("league-groups").querySelectorAll("img").forEach(img=>img.addEventListener("error",()=>{
      img.hidden=true;
      img.closest(".novel-cover")?.classList.add("cover-failed");
    },{once:true}));
  }
  function renderResumeButtons() {
    const work=findLast();
    byId("resume-button").hidden=!work;
    byId("reopen-last").hidden=!work;
    byId("copy-recent-link").hidden=!work;
    if(work)byId("resume-button").textContent="최근 열어본 ‘"+work.title+"’ 다시 보기 ↗";
  }
  function openLast() {
    const work=findLast();if(!work)return;
    const link=document.createElement("a");
    link.href=work.url;link.target="_blank";link.rel="noopener noreferrer";
    document.body.appendChild(link);link.click();link.remove();
  }
  async function copyLast() {
    const work=findLast();if(!work)return;
    try {
      if(navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(work.url);
      } else {
        const input=document.createElement("textarea");
        input.value=work.url;input.setAttribute("readonly","");input.style.cssText="position:fixed;left:-9999px;top:-9999px";
        document.body.appendChild(input);input.select();
        const copied=document.execCommand("copy");input.remove();
        if(!copied)throw new Error("copy-not-available");
      }
      toast("네이버 작품 주소를 복사했어요.");
    } catch { toast("주소 복사가 제한되어 있어요. 작품 카드를 길게 눌러 링크를 복사해 주세요."); }
  }
  byId("search-input").addEventListener("input",renderWorks);
  document.querySelectorAll("[data-league]").forEach(btn=>btn.addEventListener("click",()=>{
    selectedLeague=btn.dataset.league;
    document.querySelectorAll("[data-league]").forEach(b=>{
      b.classList.toggle("active",b===btn);
      b.setAttribute("aria-pressed",String(b===btn));
    });
    renderWorks();
  }));
  byId("resume-button").addEventListener("click",openLast);
  byId("reopen-last").addEventListener("click",openLast);
  byId("copy-recent-link").addEventListener("click",copyLast);
  renderWorks();renderResumeButtons();
  refreshCatalog();
  setInterval(refreshCatalog,REFRESH_MS);
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden&&Date.now()-lastFeedFetch>=REFRESH_MS)refreshCatalog();
  });
})();
