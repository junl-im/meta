(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createDiffView=function createDiffView({engine,escapeHtml,documentObj=document}={}){
  if(!engine||typeof engine.build!=='function')throw new Error('diff-view requires diff engine');
  if(typeof escapeHtml!=='function')throw new Error('diff-view requires escapeHtml');
  const markup=part=>escapeHtml(part.prefix)+(part.change?`<mark class="diffChange">${escapeHtml(part.change)}</mark>`:'')+escapeHtml(part.suffix);
  function render(before,after){
    const list=documentObj.querySelector('#diffList'),count=documentObj.querySelector('#diffCount');if(!list||!count)return null;
    const model=engine.build(before,after);count.textContent=`변경 ${model.count}곳`;
    if(model.mode==='empty'){list.innerHTML='<div class="empty">분석 후 변경된 부분을 확인할 수 있습니다.</div>';return model;}
    if(model.mode==='same'){list.innerHTML='<div class="empty">자동 정리 결과에서 추가로 달라진 내용이 없습니다.</div>';return model;}
    list.innerHTML=model.displayHunks.map((h,i)=>`<div class="diffItem"><div class="diffLabel">변경 ${i+1} · ${h.line}줄 근처</div><div class="diffRow before"><span class="diffSide">이전</span><div class="diffText">${markup(h.parts.before)||'<span class="sub">없음</span>'}</div></div><div class="diffRow after"><span class="diffSide">현재</span><div class="diffText">${markup(h.parts.after)||'<span class="sub">없음</span>'}</div></div></div>`).join('')+(model.truncated?`<div class="empty">변경이 많아 앞의 ${engine.limits.maxHunks}곳만 표시했습니다.</div>`:'');
    return model;
  }
  return{render};
};
})();
