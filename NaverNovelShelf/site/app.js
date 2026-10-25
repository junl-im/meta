(() => {
  "use strict";
  const AUTHORS = ["[곰같은여우]","[여우같은곰]","고양이와사비","[ZERO]"];
  const LAST_KEY = "gomfox_recent_naver_novel_v2";
  const escapeHTML = value => String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const byId = id => document.getElementById(id);
  const works = (Array.isArray(window.NOVEL_CATALOG)?window.NOVEL_CATALOG:[])
    .filter(w=>AUTHORS.includes(w.author) && /^\d+$/.test(w.id) && ["best","challenge"].includes(w.league))
    .filter(w=>w.url === "https://m.novel.naver.com/"+w.league+"/list?novelId="+w.id)
    .sort((a,b)=>Number(b.id)-Number(a.id));
  const ranking=window.NOVEL_RANKING_SNAPSHOT;
  let selectedLeague="all";
  let lastReadId=null;
  let toastTimer=null;
  try { lastReadId=localStorage.getItem(LAST_KEY); } catch {}
  const findLast = () => works.find(w=>w.id===lastReadId);
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
            <div class="novel-meta"><span>${w.league==="best"?"베스트리그":"챌린지리그"}</span><span class="genre-tiny">${escapeHTML(w.genre)}</span></div>
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
  function renderRanking() {
    const host=byId("ranking-spotlight");
    if(!ranking||!/^\d{4}-\d{2}-\d{2}$/.test(ranking.date)||!Array.isArray(ranking.entries))return;
    const ageDays=Math.floor((Date.now()-new Date(ranking.date+"T00:00:00+09:00").getTime())/86400000);
    if(!Number.isFinite(ageDays)||ageDays<0||ageDays>14)return;
    const found=ranking.entries.filter(entry=>
      Number.isInteger(entry.rank)&&entry.rank>=1&&entry.rank<=100&&works.some(w=>w.id===entry.id&&w.league===entry.league)
    ).sort((a,b)=>a.rank-b.rank);
    if(!found.length)return;
    byId("ranking-caption").textContent=ranking.date.replaceAll("-",".")+" 확인 · 당시 베스트리그 일간 TOP 100";
    byId("ranking-links").innerHTML=found.slice(0,3).map(entry=>{
      const work=works.find(w=>w.id===entry.id&&w.league===entry.league);
      return `<a href="${escapeHTML(work.url)}" target="_blank" rel="noopener noreferrer" data-open-novel="${escapeHTML(work.id)}"><b>${entry.rank}위</b><span>${escapeHTML(work.title)}</span><span aria-hidden="true">↗</span></a>`;
    }).join("");
    host.hidden=false;
    host.querySelectorAll("[data-open-novel]").forEach(el=>el.addEventListener("click",()=>{
      lastReadId=el.dataset.openNovel;
      try{localStorage.setItem(LAST_KEY,lastReadId);}catch{}
      renderResumeButtons();
      renderWorks();
    }));
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
  renderWorks();renderResumeButtons();renderRanking();
})();
