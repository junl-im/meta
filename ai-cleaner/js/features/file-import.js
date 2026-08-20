(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createFileImportService=function createFileImportService({maxBytes=20*1024*1024,parserFactory}={}){
  function textDecoder(label,options){try{return new TextDecoder(label,options);}catch(_){return null;}}
  function decodeWith(label,bytes,options){const d=textDecoder(label,options);if(!d)return null;try{return d.decode(bytes);}catch(_){return null;}}
  function hangulScore(text){let hangul=0,replacement=0,control=0;for(const ch of String(text||'')){const cp=ch.codePointAt(0);if((cp>=0x1100&&cp<=0x11ff)||(cp>=0x3130&&cp<=0x318f)||(cp>=0xac00&&cp<=0xd7af))hangul++;else if(cp===0xfffd)replacement++;else if(cp<9||(cp>13&&cp<32))control++;}return hangul*4-replacement*8-control*3;}
  function normalizeBytes(value){if(value instanceof Uint8Array)return value;if(value instanceof ArrayBuffer)return new Uint8Array(value);if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength);return new Uint8Array(0);}
  function decodeTextBytes(value,{name=''}={}){
    const bytes=normalizeBytes(value);if(!bytes.length)return{text:'',encoding:'utf-8'};
    if(bytes.length>=3&&bytes[0]===0xef&&bytes[1]===0xbb&&bytes[2]===0xbf)return{text:decodeWith('utf-8',bytes.subarray(3))||'',encoding:'utf-8-bom'};
    if(bytes.length>=2&&bytes[0]===0xff&&bytes[1]===0xfe)return{text:decodeWith('utf-16le',bytes.subarray(2))||'',encoding:'utf-16le'};
    if(bytes.length>=2&&bytes[0]===0xfe&&bytes[1]===0xff){const decoded=decodeWith('utf-16be',bytes.subarray(2));if(decoded!=null)return{text:decoded,encoding:'utf-16be'};}
    const utf8Fatal=decodeWith('utf-8',bytes,{fatal:true});if(utf8Fatal!=null)return{text:utf8Fatal,encoding:'utf-8'};
    const eucKr=decodeWith('euc-kr',bytes),win1252=decodeWith('windows-1252',bytes);
    if(eucKr!=null&&(hangulScore(eucKr)>hangulScore(win1252||'')||/\.(?:txt|md|markdown|csv|log|ini|cfg|conf|properties|yaml|yml|toml)$/i.test(String(name||''))&&/[가-힣]/.test(eucKr)))return{text:eucKr,encoding:'euc-kr'};
    if(win1252!=null)return{text:win1252,encoding:'windows-1252'};
    return{text:decodeWith('utf-8',bytes)||'',encoding:'utf-8-replacement'};
  }
  function rtfCodepageLabel(raw){const m=/\\ansicpg(\d+)/i.exec(String(raw||'')),cp=m?Number(m[1]):1252;if(cp===949||cp===51949)return'euc-kr';if(cp===65001)return'utf-8';if(cp===1250)return'windows-1250';if(cp===1251)return'windows-1251';if(cp===1252)return'windows-1252';return'windows-1252';}
  function decodeRtfHexRun(run,label){const hex=[...String(run).matchAll(/\\'([0-9a-fA-F]{2})/g)].map(m=>parseInt(m[1],16));if(!hex.length)return'';const decoded=decodeWith(label,new Uint8Array(hex));return decoded==null?String.fromCharCode(...hex):decoded;}
  function rtfToText(raw){
    raw=String(raw??'');const label=rtfCodepageLabel(raw);
    let text=raw.replace(/\\u(-?\d+)\??/g,(_,n)=>{let cp=Number(n);if(cp<0)cp+=65536;return String.fromCharCode(cp);});
    text=text.replace(/(?:\\'[0-9a-fA-F]{2})+/g,run=>decodeRtfHexRun(run,label));
    return text.replace(/\\par[d]?\b ?/g,'\n').replace(/\\tab\b ?/g,'\t').replace(/\\[a-zA-Z]+-?\d* ?/g,'').replace(/[{}]/g,'').replace(/\\([\\{}])/g,'$1');
  }
  function parser(){if(parserFactory)return parserFactory();if(typeof DOMParser!=='undefined')return new DOMParser();return null;}
  function parse(name,raw){name=String(name||'');raw=String(raw??'');if(/\.html?$/i.test(name)){const p=parser();if(!p)return raw;const d=p.parseFromString(raw,'text/html');return(d.body&&d.body.innerText)||d.documentElement?.textContent||'';}if(/\.xml$/i.test(name)){try{const p=parser();if(!p)return raw;const d=p.parseFromString(raw,'application/xml');if(!d.querySelector('parsererror'))return d.documentElement?.textContent||raw;}catch(_){}return raw;}if(/\.rtf$/i.test(name))return rtfToText(raw);return raw;}
  function looksBinary(raw){if(!raw)return false;const sample=String(raw).slice(0,65536);let nul=0,ctrl=0;for(const ch of sample){const cp=ch.charCodeAt(0);if(cp===0)nul++;else if(cp<9||(cp>13&&cp<32))ctrl++;}return nul>0||ctrl>Math.max(12,sample.length*.02);}
  async function read(file){
    if(!file||(typeof file.arrayBuffer!=='function'&&typeof file.text!=='function')){const e=new Error('invalid-file');e.code='INVALID_FILE';throw e;}
    if(Number(file.size||0)>maxBytes){const e=new Error('file-too-large');e.code='FILE_TOO_LARGE';e.maxBytes=maxBytes;throw e;}
    const name=String(file.name||'text.txt');let raw='',encoding='utf-8';
    if(typeof file.arrayBuffer==='function'){
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(/\.rtf$/i.test(name)){raw=decodeWith('latin1',bytes)||String.fromCharCode(...bytes);encoding=rtfCodepageLabel(raw);}else{const decoded=decodeTextBytes(bytes,{name});raw=decoded.text;encoding=decoded.encoding;}
    }else raw=await file.text();
    if(looksBinary(raw)){const e=new Error('binary-text');e.code='BINARY_TEXT';throw e;}
    return{name,raw,text:parse(name,raw),encoding};
  }
  return{read,parse,rtfToText,looksBinary,decodeTextBytes,rtfCodepageLabel,maxBytes};
};
})();
