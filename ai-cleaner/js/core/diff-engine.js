(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createDiffEngine=function createDiffEngine({splitGraphemes,maxCells=50000,maxLines=240,maxHunks=120}={}){
  if(typeof splitGraphemes!=='function')throw new Error('diff-engine requires splitGraphemes');
  function edgeParts(before,after){
    const a=splitGraphemes(String(before??'')),b=splitGraphemes(String(after??''));
    let prefix=0;while(prefix<a.length&&prefix<b.length&&a[prefix]===b[prefix])prefix++;
    let suffix=0;while(suffix<a.length-prefix&&suffix<b.length-prefix&&a[a.length-1-suffix]===b[b.length-1-suffix])suffix++;
    return{
      before:{prefix:a.slice(0,prefix).join(''),change:a.slice(prefix,a.length-suffix).join(''),suffix:a.slice(a.length-suffix).join('')},
      after:{prefix:b.slice(0,prefix).join(''),change:b.slice(prefix,b.length-suffix).join(''),suffix:b.slice(b.length-suffix).join('')}
    };
  }
  function lineOps(before,after){
    const a=String(before??'').split('\n'),b=String(after??'').split('\n'),ops=[];
    if(a.length*b.length<=maxCells&&a.length<=maxLines&&b.length<=maxLines){
      const m=b.length,dp=Array.from({length:a.length+1},()=>new Uint16Array(m+1));
      for(let i=a.length-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
      let i=0,j=0;
      while(i<a.length||j<b.length){
        if(i<a.length&&j<b.length&&a[i]===b[j]){ops.push({type:'same',text:a[i]});i++;j++;}
        else if(j>=b.length||(i<a.length&&dp[i+1][j]>=dp[i][j+1]))ops.push({type:'del',text:a[i++]});
        else ops.push({type:'add',text:b[j++]});
      }
    }else{
      const n=Math.max(a.length,b.length);
      for(let i=0;i<n;i++){
        if(a[i]===b[i])ops.push({type:'same',text:a[i]||''});
        else{if(i<a.length)ops.push({type:'del',text:a[i]});if(i<b.length)ops.push({type:'add',text:b[i]});}
      }
    }
    return ops;
  }
  function build(before,after){
    before=String(before??'');after=String(after??'');
    if(!before&&!after)return{count:0,hunks:[],displayHunks:[],truncated:false,mode:'empty'};
    if(before===after)return{count:0,hunks:[],displayHunks:[],truncated:false,mode:'same'};
    const ops=lineOps(before,after),hunks=[];let cur=null,line=1;
    for(const op of ops){
      if(op.type==='same'){if(cur){hunks.push(cur);cur=null;}line++;continue;}
      if(!cur)cur={line,before:[],after:[]};
      (op.type==='del'?cur.before:cur.after).push(op.text);if(op.type==='del')line++;
    }
    if(cur)hunks.push(cur);
    const displayHunks=hunks.slice(0,maxHunks).map(h=>{const beforeText=h.before.join('\n'),afterText=h.after.join('\n');return{...h,beforeText,afterText,parts:edgeParts(beforeText,afterText)};});
    return{count:hunks.length,hunks,displayHunks,truncated:hunks.length>maxHunks,mode:'changed'};
  }
  return{edgeParts,lineOps,build,limits:{maxCells,maxLines,maxHunks}};
};
})();
