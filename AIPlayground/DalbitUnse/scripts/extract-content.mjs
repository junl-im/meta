import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// 기존 확정 문구의 리터럴 선언만 추출하여 데이터 파일로 분리합니다.
const source = fs.readFileSync('dist/app.js', 'utf8');
function literal(name) {
  const start = source.search(new RegExp('\\bconst\\s+' + name + '\\s*='));
  if (start < 0) throw new Error('not found: ' + name);
  const begin = source.indexOf('=', start) + 1;
  let first = begin;
  while (/\s/.test(source[first])) first++;
  if (!'[{'.includes(source[first])) throw new Error('not a literal: ' + name);
  const stack = [], pairs = { '[': ']', '{': '}', '(': ')' };
  let quote = '', escaped = false;
  for (let i = first; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '\'' || c === '\"' || c === '`') { quote = c; continue; }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === ']' || c === '}' || c === ')') {
      if (stack.pop() !== c) throw new Error('invalid literal: ' + name);
      if (stack.length === 0) {
        return vm.runInNewContext('(' + source.slice(first, i + 1) + ')', Object.create(null), { timeout: 500 });
      }
    }
  }
  throw new Error('unterminated literal: ' + name);
}
function write(name, value) {
  const target = path.join('dist', 'data', name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify({ schemaVersion: 1, ...value }, null, 2) + '\n');
  console.log(target, fs.statSync(target).size, 'bytes');
}
write('fortune-copy.json', {
  headlines: literal('headlines'), opening: literal('opening'),
  closings: literal('closings'), reassurance: literal('reassurance'),
  palette: literal('palette'), directions: literal('directions'),
  elementMessage: literal('elementMessage'), dayStemMessage: literal('dayStemMessage')
});
write('tarot-meanings.json', {
  major: literal('major'), suits: literal('suits'), ranks: literal('ranks')
});
write('newyear-copy.json', {
  seasons: literal('seasons'), annualStarts: literal('annualStarts'), annualEnds: literal('annualEnds')
});
