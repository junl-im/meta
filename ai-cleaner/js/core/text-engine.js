(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};
if(typeof ns.classifyTextCodePoint!=='function')throw new Error('text-engine requires text-utils classifier');
const LOOKALIKE={'а':'Cyrillic a','е':'Cyrillic e','о':'Cyrillic o','р':'Cyrillic er','с':'Cyrillic es','х':'Cyrillic ha','у':'Cyrillic u','і':'Cyrillic i'};
const hex=cp=>'U+'+cp.toString(16).toUpperCase().padStart(4,'0');
ns.createTextEngine=function createTextEngine(){
  function charInfo(ch,pos,profile='standard'){
    const info=ns.classifyTextCodePoint(ch);if(!info)return null;
    const standard=profile==='standard',inspect=profile==='inspect';
    const auto=!inspect&&(info.policy==='remove'||(standard&&info.policy==='space'));
    const replace=info.policy==='space'?' ':info.policy==='remove'?'':ch;
    let action='보존';if(auto)action=info.policy==='space'?'일반 공백':'삭제';
    return{pos,code:info.code,name:info.name,type:info.type,auto,action,replace,policy:info.policy,legacyV6:!!info.legacyV6,risk:info.policy==='preserve'?info.reason:undefined};
  }
  function scan(text,{profile='standard'}={}){
    let clean='',all=[],auto=[],i=0;
    for(const ch of String(text??'')){
      const x=charInfo(ch,i,profile);
      if(x){all.push({...x,char:ch});if(x.auto){auto.push({...x,char:ch});clean+=x.replace;}else clean+=ch;}else clean+=ch;
      i+=ch.length;
    }
    return{clean,all,auto,policyVersion:ns.TEXT_HYGIENE_POLICY_VERSION||'unknown'};
  }
  function homoglyphs(text){let out=[],i=0;for(const ch of String(text??'')){if(LOOKALIKE[ch])out.push({pos:i,char:ch,code:hex(ch.codePointAt(0)),name:LOOKALIKE[ch]});i+=ch.length;}return out;}
  function sentences(text){
    text=String(text??'');let out=[],start=0,buf='';
    for(let i=0;i<text.length;i++){buf+=text[i];if(/[.!?。！？]/.test(text[i])||text[i]==='\n'){const t=buf.trim();if(t.length>=4){const lead=buf.indexOf(t);out.push({start:start+Math.max(0,lead),end:start+Math.max(0,lead)+t.length,text:t});}start=i+1;buf='';}}
    const t=buf.trim();if(t.length>=4){const lead=buf.indexOf(t);out.push({start:start+Math.max(0,lead),end:start+Math.max(0,lead)+t.length,text:t});}return out;
  }
  function issues(text,{repeat=true}={}){
    text=String(text??'');let out=[],id=0;const add=(cat,reason,before,after=null,kind='read',start=-1,end=-1,extra={})=>out.push({id:'i'+(++id),cat,reason,before,after,kind,start,end,applicable:typeof after==='string',...extra});
    const rules=[
      [/자주 묻는 질문\s*\(FAQ\)/g,'정형 템플릿','의도한 구성인지 확인하세요.','자주 물어보시더라고요','style'],
      [/결론적으로|요약하자면|정리하자면|마무리하자면/g,'정형 전환어','문맥상 꼭 필요한 연결어인지 확인하세요.','그래서','style'],
      [/\*\*([^*\n]+)\*\*/g,'마크다운 **','굵게 표시 기호가 남아 있습니다.',null,'format'],
      [/^(#{1,6})\s+(.+)$/gm,'마크다운 제목','제목 기호가 남아 있습니다.',null,'format']
    ];
    for(const [re,cat,reason,repl,kind] of rules){let m;while((m=re.exec(text))){const after=cat==='마크다운 **'?m[1]:cat==='마크다운 제목'?m[2]:repl;add(cat,reason,m[0],after,kind,m.index,m.index+m[0].length);}}
    for(const m of text.matchAll(/\n{3,}/g))add('연속 빈 줄','빈 줄을 줄이면 읽기 흐름이 좋아집니다.',m[0],'\n\n','read',m.index,m.index+m[0].length);
    if(repeat){const re=/[가-힣A-Za-z0-9]{2,}/g,counts=new Map();let m;while((m=re.exec(text)))counts.set(m[0],(counts.get(m[0])||0)+1);[...counts.entries()].filter(([,n])=>n>=6).sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([w,n])=>add('반복 단어',`“${w}”가 ${n}회 반복됩니다. 돋보기로 위치를 순서대로 확인해보세요.`,`${w} × ${n}`,null,'read',-1,-1,{word:w}));}
    return out;
  }
  function sentenceSignals(text){const reasons=[];if(/자주 묻는 질문\s*\(FAQ\)/.test(text))reasons.push('정형 템플릿');if(/결론적으로|요약하자면|정리하자면|마무리하자면/.test(text))reasons.push('정형 전환어');if(/\*\*[^*\n]+\*\*/.test(text)||/^#{1,6}\s+/m.test(text))reasons.push('마크다운 서식');return reasons;}
  function hygiene(text,all,hom){const md=(String(text??'').match(/\*\*|^#{1,6}\s/gm)||[]).length;return Math.max(0,100-Math.min(60,(all||[]).length*4)-Math.min(20,(hom||[]).length*4)-Math.min(20,md*2));}
  function reviewSuggestion(text){let s=String(text??'');s=s.replace(/자주 묻는 질문\s*\(FAQ\)/g,'자주 물어보시더라고요').replace(/결론적으로|요약하자면|정리하자면|마무리하자면/g,'그래서').replace(/\*\*([^*\n]+)\*\*/g,'$1').replace(/^(#{1,6})\s+(.+)$/gm,'$2');return s===text?'':s;}
  function countIssuesLight(text,{repeat=true}={}){text=String(text??'');let n=0;n+=(text.match(/자주 묻는 질문\s*\(FAQ\)/g)||[]).length;n+=(text.match(/결론적으로|요약하자면|정리하자면|마무리하자면/g)||[]).length;n+=(text.match(/\*\*[^*\n]+\*\*/g)||[]).length;n+=(text.match(/^#{1,6}\s+.+$/gm)||[]).length;n+=(text.match(/\n{3,}/g)||[]).length;if(repeat){const words=text.match(/[가-힣A-Za-z0-9]{2,}/g)||[],f=new Map();for(const w of words)f.set(w,(f.get(w)||0)+1);n+=[...f.values()].filter(v=>v>=6).length;}return n;}
  function reviewMeta(text,{length=true,limit=400}={}){const all=sentences(text),cap=Math.max(0,Number(limit)||0);let candidateCount=0,visibleCandidateCount=0;for(let i=0;i<all.length;i++){const x=all[i],candidate=(length&&x.text.length>72)||sentenceSignals(x.text).length>0;if(candidate){candidateCount++;if(i<cap)visibleCandidateCount++;}}return{candidateCount,visibleCandidateCount,totalSentences:all.length,limit:cap,overflow:Math.max(0,all.length-cap)};}
  function codePointLength(text){let n=0;for(const _ of String(text??''))n++;return n;}
  function analyze(text,{profile='standard',nfkc=false,repeat=true,length=true}={}){const source=String(text??''),sc=scan(source,{profile});let base=sc.clean;if(nfkc)base=base.normalize('NFKC');const hom=homoglyphs(base);return{source,scan:sc,base,homoglyphs:hom,issues:issues(base,{repeat}),reviewMeta:reviewMeta(base,{length}),score:hygiene(source,sc.all,hom),policyVersion:sc.policyVersion};}
  return{charInfo,scan,homoglyphs,sentences,issues,sentenceSignals,hygiene,reviewSuggestion,countIssuesLight,reviewMeta,codePointLength,analyze};
};
})();
