(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
ns.createFileImportService=function createFileImportService({maxBytes=20*1024*1024,parserFactory}={}){
  function rtfToText(raw){let text=String(raw??'').replace(/\\u(-?\d+)\??/g,(_,n)=>{let cp=Number(n);if(cp<0)cp+=65536;return String.fromCharCode(cp);});return text.replace(/\\par[d]?\b ?/g,'\n').replace(/\\tab\b ?/g,'\t').replace(/\\'[0-9a-fA-F]{2}/g,m=>String.fromCharCode(parseInt(m.slice(2),16))).replace(/\\[a-zA-Z]+-?\d* ?/g,'').replace(/[{}]/g,'').replace(/\\([\\{}])/g,'$1');}
  function parser(){if(parserFactory)return parserFactory();if(typeof DOMParser!=='undefined')return new DOMParser();return null;}
  function parse(name,raw){name=String(name||'');raw=String(raw??'');if(/\.html?$/i.test(name)){const p=parser();if(!p)return raw;const d=p.parseFromString(raw,'text/html');return(d.body&&d.body.innerText)||d.documentElement?.textContent||'';}if(/\.xml$/i.test(name)){try{const p=parser();if(!p)return raw;const d=p.parseFromString(raw,'application/xml');if(!d.querySelector('parsererror'))return d.documentElement?.textContent||raw;}catch(_){}return raw;}if(/\.rtf$/i.test(name))return rtfToText(raw);return raw;}
  function looksBinary(raw){if(!raw)return false;const sample=String(raw).slice(0,65536);let nul=0,ctrl=0;for(const ch of sample){const cp=ch.charCodeAt(0);if(cp===0)nul++;else if(cp<9||(cp>13&&cp<32))ctrl++;}return nul>0||ctrl>Math.max(12,sample.length*.02);}
  async function read(file){if(!file||typeof file.text!=='function'){const e=new Error('invalid-file');e.code='INVALID_FILE';throw e;}if(Number(file.size||0)>maxBytes){const e=new Error('file-too-large');e.code='FILE_TOO_LARGE';e.maxBytes=maxBytes;throw e;}const raw=await file.text();if(looksBinary(raw)){const e=new Error('binary-text');e.code='BINARY_TEXT';throw e;}return{name:String(file.name||'text.txt'),raw,text:parse(file.name,raw)};}
  return{read,parse,rtfToText,looksBinary,maxBytes};
};
})();
