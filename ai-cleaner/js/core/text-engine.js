(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
const SPECIAL_SPACES=new Set([0xA0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200A,0x202F,0x205F,0x3000]);
const REMOVABLE=new Set([0x200B,0x200E,0x200F,0x202A,0x202B,0x202C,0x202D,0x202E,0x2066,0x2067,0x2068,0x2069,0xFEFF]);
const SENSITIVE=new Set([0x200C,0x200D,0x2060]);
const LOOKALIKE={'а':'Cyrillic a','е':'Cyrillic e','о':'Cyrillic o','р':'Cyrillic er','с':'Cyrillic es','х':'Cyrillic ha','у':'Cyrillic u','і':'Cyrillic i'};
const hex=cp=>'U+'+cp.toString(16).toUpperCase().padStart(4,'0');
ns.createTextEngine=function createTextEngine(){
  function charInfo(ch,pos,profile='standard'){
    const cp=ch.codePointAt(0),code=hex(cp);
    if(SPECIAL_SPACES.has(cp))return{pos,code,name:'SPECIAL SPACE',type:'특수 공백',auto:profile==='standard',action:profile==='standard'?'일반 공백':'보존',replace:' '};
    if(REMOVABLE.has(cp)||((cp<32&&ch!=='\n'&&ch!=='\t')||cp===127))return{pos,code,name:'INVISIBLE / CONTROL',type:'숨은 문자',auto:profile!=='inspect',action:profile==='inspect'?'보존':'삭제',replace:''};
    if(SENSITIVE.has(cp)||(cp>=0xFE00&&cp<=0xFE0F)||(cp>=0xE0100&&cp<=0xE01EF)||(cp>=0xE0000&&cp<=0xE007F))return{pos,code,name:'MEANING-SENSITIVE UNICODE',type:'의미 민감 문자',auto:false,action:'보존',replace:ch,risk:'문자 결합·이모지·표현에 영향을 줄 수 있어 기본 보존'};
    return null;
  }
  function scan(text,{profile='standard'}={}){
    let clean='',all=[],auto=[],i=0;
    for(const ch of String(text??'')){
      const x=charInfo(ch,i,profile);
      if(x){all.push({...x,char:ch});if(x.auto){auto.push({...x,char:ch});clean+=x.replace;}else clean+=ch;}else clean+=ch;
      i+=ch.length;
    }
    return{clean,all,auto};
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
  function codePointLength(text){let n=0;for(const _ of String(text??''))n++;return n;}
  function analyze(text,{profile='standard',nfkc=false,repeat=true}={}){const source=String(text??''),sc=scan(source,{profile});let base=sc.clean;if(nfkc)base=base.normalize('NFKC');const hom=homoglyphs(base);return{source,scan:sc,base,homoglyphs:hom,issues:issues(base,{repeat}),score:hygiene(source,sc.all,hom)};}
  return{charInfo,scan,homoglyphs,sentences,issues,sentenceSignals,hygiene,reviewSuggestion,countIssuesLight,codePointLength,analyze};
};
})();
