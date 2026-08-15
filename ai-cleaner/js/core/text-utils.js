(() => {
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const ns=root.AICleanerModules=root.AICleanerModules||{};
ns.splitGraphemesExact=function splitGraphemesExact(text){
  const value=String(text??'');
  if(typeof Intl!=='undefined'&&Intl.Segmenter){try{return[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].map(x=>x.segment);}catch(_){}}
  return Array.from(value);
};
ns.exactTextEqual=function exactTextEqual(a,b){return String(a??'')===String(b??'');};

const POLICY_VERSION='old-v6-layer-a-safe-1.2.2';
const LEGACY_V6_LAYER_A=new Map([
  [0x200B,['ZERO WIDTH SPACE','숨은 문자','remove']],[0x200C,['ZERO WIDTH NON-JOINER','의미 민감 문자','preserve']],[0x200D,['ZERO WIDTH JOINER','의미 민감 문자','preserve']],[0x2060,['WORD JOINER','의미 민감 문자','preserve']],
  [0xFEFF,['ZERO WIDTH NO-BREAK SPACE','숨은 문자','remove']],[0x200E,['LEFT-TO-RIGHT MARK','숨은 문자','remove']],[0x200F,['RIGHT-TO-LEFT MARK','숨은 문자','remove']],
  [0x202A,['LEFT-TO-RIGHT EMBEDDING','숨은 문자','remove']],[0x202B,['RIGHT-TO-LEFT EMBEDDING','숨은 문자','remove']],[0x202C,['POP DIRECTIONAL FORMATTING','숨은 문자','remove']],
  [0x202D,['LEFT-TO-RIGHT OVERRIDE','숨은 문자','remove']],[0x202E,['RIGHT-TO-LEFT OVERRIDE','숨은 문자','remove']],[0x2066,['LEFT-TO-RIGHT ISOLATE','숨은 문자','remove']],
  [0x2067,['RIGHT-TO-LEFT ISOLATE','숨은 문자','remove']],[0x2068,['FIRST STRONG ISOLATE','숨은 문자','remove']],[0x2069,['POP DIRECTIONAL ISOLATE','숨은 문자','remove']],
  [0x00A0,['NO-BREAK SPACE','특수 공백','space']],[0x2000,['EN QUAD','특수 공백','space']],[0x2001,['EM QUAD','특수 공백','space']],[0x2002,['EN SPACE','특수 공백','space']],
  [0x2003,['EM SPACE','특수 공백','space']],[0x2004,['THREE-PER-EM SPACE','특수 공백','space']],[0x2005,['FOUR-PER-EM SPACE','특수 공백','space']],[0x2006,['SIX-PER-EM SPACE','특수 공백','space']],
  [0x2007,['FIGURE SPACE','특수 공백','space']],[0x2008,['PUNCTUATION SPACE','특수 공백','space']],[0x2009,['THIN SPACE','특수 공백','space']],[0x200A,['HAIR SPACE','특수 공백','space']],
  [0x202F,['NARROW NO-BREAK SPACE','특수 공백','space']],[0x205F,['MEDIUM MATHEMATICAL SPACE','특수 공백','space']],[0x3000,['IDEOGRAPHIC SPACE','특수 공백','space']]
]);
const SAFE_EXTENSIONS=new Map([
  [0x00AD,['SOFT HYPHEN','숨은 문자','remove']],[0x061C,['ARABIC LETTER MARK','숨은 문자','remove']],[0x1680,['OGHAM SPACE MARK','특수 공백','space']]
]);
const hex=cp=>'U+'+cp.toString(16).toUpperCase().padStart(4,'0');
function dynamicSensitive(cp){
  if(cp>=0xFE00&&cp<=0xFE0F)return['VARIATION SELECTOR','의미 민감 문자','preserve'];
  if(cp>=0xE0100&&cp<=0xE01EF)return['VARIATION SELECTOR SUPPLEMENT','의미 민감 문자','preserve'];
  if(cp>=0xE0000&&cp<=0xE007F)return['UNICODE TAG','의미 민감 문자','preserve'];
  return null;
}
ns.TEXT_HYGIENE_POLICY_VERSION=POLICY_VERSION;
ns.classifyTextCodePoint=function classifyTextCodePoint(ch){
  const value=String(ch??'');if(!value)return null;const cp=value.codePointAt(0),code=hex(cp);
  const legacy=LEGACY_V6_LAYER_A.get(cp);if(legacy){const[name,type,policy]=legacy;return{cp,code,name,type,policy,legacyV6:true,reason:policy==='preserve'?'문자 결합·줄바꿈·표현 의미에 영향을 줄 수 있어 보존':'old-v6 Layer A 기술 흔적 사전'};}
  const ext=SAFE_EXTENSIONS.get(cp);if(ext){const[name,type,policy]=ext;return{cp,code,name,type,policy,legacyV6:false,reason:'안전 정리 확장 항목'};}
  const sensitive=dynamicSensitive(cp);if(sensitive){const[name,type,policy]=sensitive;return{cp,code,name,type,policy,legacyV6:false,reason:'이모지·문자 표시 형태에 영향을 줄 수 있어 보존'};}
  if((cp<32&&value!=='\n'&&value!=='\t')||cp===127)return{cp,code,name:'CONTROL',type:'숨은 문자',policy:'remove',legacyV6:false,reason:'비표시 제어문자'};
  return null;
};
ns.getTextHygienePolicy=function getTextHygienePolicy(){
  return{
    version:POLICY_VERSION,
    legacyV6:[...LEGACY_V6_LAYER_A.entries()].map(([cp,[name,type,policy]])=>({cp,code:hex(cp),name,type,policy})),
    safeExtensions:[...SAFE_EXTENSIONS.entries()].map(([cp,[name,type,policy]])=>({cp,code:hex(cp),name,type,policy})),
    sensitiveRanges:['U+FE00–U+FE0F','U+E0100–U+E01EF','U+E0000–U+E007F']
  };
};
ns.sanitizeVisibleTypingSource=function sanitizeVisibleTypingSource(text){
  const value=String(text??'');let out='';const removed=[],normalizedSpaces=[],preservedSensitive=[],found=[];let pos=0;
  for(const ch of value){
    const info=ns.classifyTextCodePoint(ch);
    if(!info){out+=ch;pos+=ch.length;continue;}
    const item={...info,pos,char:ch};found.push(item);
    if(info.policy==='remove'){removed.push(item);pos+=ch.length;continue;}
    if(info.policy==='space'){normalizedSpaces.push(item);out+=' ';pos+=ch.length;continue;}
    preservedSensitive.push(item);out+=ch;pos+=ch.length;
  }
  return{text:out,found,removed,normalizedSpaces,preservedSensitive,changed:out!==value,policyVersion:POLICY_VERSION};
};
})();
