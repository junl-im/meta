import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const authors=['[곰같은여우]','[여우같은곰]','고양이와사비','[ZERO]','닥터X'];
const leagues=['best','challenge'];
const source=path.join(root,'site/catalog.js');
const feed=path.join(root,'site/catalog-feed.json');
const integration=path.join(root,'integration/catalog.v1.json');
const context={window:{}};
vm.runInNewContext(await fs.readFile(source,'utf8'),context,{timeout:2000});
const previous=context.window.NOVEL_CATALOG;
if(!Array.isArray(previous))throw Error('Existing catalog is unavailable');

function decode(text){
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|laquo|raquo);/gi,(_,entity)=>{
    if(entity.startsWith('#x'))return String.fromCodePoint(parseInt(entity.slice(2),16));
    if(entity.startsWith('#'))return String.fromCodePoint(parseInt(entity.slice(1),10));
    return{amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',laquo:'«',raquo:'»'}[entity.toLowerCase()]??_;
  });
}
function field(card,pattern,label){
  const value=card.match(pattern)?.[1];
  if(!value)throw Error(`Public search card lacks ${label}`);
  return decode(value.trim());
}
function parse(html,league){
  const count=Number(html.match(/<h2 class="title">[^<]*<em>(\d+)건<\/em>/)?.[1]);
  if(!Number.isInteger(count))throw Error(`Search total missing for ${league}`);
  const cards=[...html.matchAll(/<li class="item">\s*<a href="\/(best|challenge)\/list\?novelId=(\d+)"[\s\S]*?<\/li>/g)];
  const rows=cards.map(([markup,cardLeague,id])=>{
    return {id,league:cardLeague,
      title:field(markup,/<span class="title">([^<]+)<\/span>/,'title'),
      author:field(markup,/<span class="author"><strong>([^<]+)<\/strong>/,'author'),
      image:field(markup,/<img src="([^"]+)"/,'cover'),
      tags:decode(markup.match(/<span class="tag">([^<]*)<\/span>/)?.[1]??'')};
  });
  return{count,rows,html};
}
function genre(tags,fallback=''){
  const known=['로판','로맨스','현판','판타지','무협','미스터리','SF','드라마','스릴러'];
  const found=[...tags.matchAll(/#([^\s#]+)/g)].map(match=>match[1]);
  return found.findLast(tag=>known.includes(tag))??fallback;
}
async function search(author,league){
  const base=`https://m.novel.naver.com/search?keyword=${encodeURIComponent(author)}&section=${league}&target=author`;
  const pending=[base],visited=new Set(),rows=[];
  let expected=null;
  while(pending.length){
    if(visited.size>=20)throw Error(`Too many public search pages: ${author} ${league}`);
    const url=pending.shift();if(visited.has(url))continue;visited.add(url);
    const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; GomFoxNovelShelf/1.0)'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error(`Naver search failed: ${author} ${league} HTTP ${response.status}`);
    const parsed=parse(await response.text(),league);
    expected??=parsed.count;
    if(parsed.count!==expected)throw Error(`Search total changed mid-check: ${author} ${league}`);
    rows.push(...parsed.rows);
    if(rows.length>=expected)break;
    for(const match of parsed.html.matchAll(/href="([^"#]*[?&](?:amp;)?page=\d+[^"#]*)"/g)){
      const next=new URL(decode(match[1]),base);
      if(next.origin==='https://m.novel.naver.com'&&next.pathname==='/search'&&next.searchParams.get('section')===league&&next.searchParams.get('target')==='author'&&next.searchParams.get('keyword')===author&&!visited.has(next.href)&&!pending.includes(next.href))pending.push(next.href);
    }
    if(!pending.length)throw Error(`Incomplete public search: ${author} ${league} ${rows.length}/${expected}`);
  }
  if(rows.length!==expected)throw Error(`Public search count mismatch: ${author} ${league}`);
  return rows.filter(row=>row.author===author&&row.league===league).map(row=>{
    if(!/^\d+$/.test(row.id)||!/^https:\/\/novel-phinf\.pstatic\.net\//.test(row.image))throw Error(`Invalid public metadata: ${row.id}`);
    return row;
  });
}

const collected=[];
for(const author of authors)for(const league of leagues){
  const rows=await search(author,league);
  if(!rows.length&&previous.some(work=>work.author===author&&work.league===league))
    throw Error(`Public search returned no known works: ${author} ${league}`);
  collected.push(...rows);
}
const unique=new Map(collected.map(row=>[`${row.league}:${row.id}`,row]));
if(unique.size!==collected.length)throw Error('Duplicate public search result');
const previousById=new Map(previous.map(row=>[row.id,row]));
const next=[...unique.values()].map(row=>{
  const old=previousById.get(row.id);
  return{title:row.title,author:row.author,id:row.id,league:row.league,image:row.image,genre:genre(row.tags,old?.genre),url:`https://m.novel.naver.com/${row.league}/list?novelId=${row.id}`};
}).sort((a,b)=>{
  const oldA=previous.findIndex(row=>row.id===a.id),oldB=previous.findIndex(row=>row.id===b.id);
  return(oldA<0?Infinity:oldA)-(oldB<0?Infinity:oldB)||Number(b.id)-Number(a.id);
});
if(next.some(row=>!row.genre))throw Error('A new work has no verified genre');
const signature=rows=>JSON.stringify(rows.map(({title,author,id,league,image,genre})=>[title,author,id,league,image,genre]));
if(signature(next)===signature(previous)){console.log(`No catalog changes (${next.length} works)`);process.exit(0)}
const checked=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const tuples=next.map(({title,author,id,league,image,genre})=>`  ${JSON.stringify([title,author,id,league,image,genre])}`).join(',\n');
await fs.writeFile(source,`/* Public Naver Web Novel work metadata, verified ${checked}.\n   Only titles, author pen names, official cover thumbnail URLs and links.\n   No story text or reader data is reproduced. */\nwindow.NOVEL_CATALOG = [\n${tuples}\n].map(([title,author,id,league,image,genre])=>({\n  title, author, id, league, image, genre,\n  url: \`https://m.novel.naver.com/\${league}/list?novelId=\${id}\`\n}));\nwindow.NOVEL_CATALOG_LAST_CHECK = ${JSON.stringify(checked)};\n`);
const original=JSON.parse(await fs.readFile(integration,'utf8'));
const output={...original,catalog_last_verified:checked,works:next.map(row=>({id:row.id,title:row.title,author_search_identity:row.author,league:row.league,genre:row.genre,official_url:row.url,cover_thumbnail_url:row.image}))};
const json=JSON.stringify(output,null,2)+'\n';
await fs.writeFile(integration,json);
await fs.writeFile(feed,json);
console.log(`Updated ${next.length} verified public works`);
