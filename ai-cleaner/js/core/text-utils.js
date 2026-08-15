(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.splitGraphemesExact=function splitGraphemesExact(text){
  const value=String(text??'');
  if(typeof Intl!=='undefined'&&Intl.Segmenter){try{return[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value)].map(x=>x.segment);}catch(_){}}
  return Array.from(value);
};
ns.exactTextEqual=function exactTextEqual(a,b){return String(a??'')===String(b??'');};
const AUTO_REMOVE_HIDDEN=new Set([0x200B,0x200E,0x200F,0x202A,0x202B,0x202C,0x202D,0x202E,0x2066,0x2067,0x2068,0x2069,0xFEFF]);
const SPECIAL_SPACES=new Set([0xA0,0x1680,0x2000,0x2001,0x2002,0x2003,0x2004,0x2005,0x2006,0x2007,0x2008,0x2009,0x200A,0x202F,0x205F,0x3000]);
const SENSITIVE_HIDDEN=new Set([0x200C,0x200D,0x2060]);
ns.sanitizeVisibleTypingSource=function sanitizeVisibleTypingSource(text){
  const value=String(text??'');let out='';const removed=[],normalizedSpaces=[],preservedSensitive=[];let pos=0;
  for(const ch of value){
    const cp=ch.codePointAt(0),code='U+'+cp.toString(16).toUpperCase().padStart(4,'0');
    if(AUTO_REMOVE_HIDDEN.has(cp)||((cp<32&&ch!=='\n'&&ch!=='\t')||cp===127)){removed.push({pos,code,char:ch});pos+=ch.length;continue;}
    if(SPECIAL_SPACES.has(cp)){normalizedSpaces.push({pos,code,char:ch});out+=' ';pos+=ch.length;continue;}
    if(SENSITIVE_HIDDEN.has(cp)||(cp>=0xFE00&&cp<=0xFE0F)||(cp>=0xE0100&&cp<=0xE01EF)||(cp>=0xE0000&&cp<=0xE007F))preservedSensitive.push({pos,code,char:ch});
    out+=ch;pos+=ch.length;
  }
  return {text:out,removed,normalizedSpaces,preservedSensitive,changed:out!==value};
};
})();
