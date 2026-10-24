import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { runInNewContext } from 'node:vm';

const db = JSON.parse(readFileSync(new URL('../dist/data/saju-knowledge.json', import.meta.url), 'utf8'));
assert.equal(db.schemaVersion, 2);
const masters = Array.from('甲乙丙丁戊己庚辛壬癸');
const gods = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
const branches = Array.from('子丑寅卯辰巳午未申酉戌亥');
assert.deepEqual(Object.keys(db.dayMasters).sort(), [...masters].sort());
assert.deepEqual(Object.keys(db.tenGods).sort(), [...gods].sort());
assert.deepEqual(Object.keys(db.branchHints).sort(), [...branches].sort());
assert.equal(Object.keys(db.fiveElements).length, 5);
const domains = ['work', 'love', 'money', 'wellbeing'];
for (const [key, item] of Object.entries(db.dayMasters)) {
  for (const field of ['name', 'image', 'core', 'strength', 'shadow', ...domains])
    assert.ok(typeof item[field] === 'string' && item[field].trim().length >= 2, `${key} ${field}`);
  assert.match(item.core, /결$/, `${key} core: 사주 안내문 연결을 위한 명사형 마무리 필요`);
  for (const field of ['core', 'strength', 'shadow'])
    assert.doesNotMatch(item[field], /[.!?]\s*$/, `${key} ${field}: 완성 문장과 조각 문장의 혼용 방지`);
}
for (const [key, item] of Object.entries(db.tenGods)) {
  for (const field of ['theme', 'core', ...domains])
    assert.ok(typeof item[field] === 'string' && item[field].trim().length >= 3, `${key} ${field}`);
  assert.match(item.core, /흐름$/, `${key} core: 연운·기간별 해석과 자연스럽게 연결되어야 함`);
}
const allMessages = Object.values(db.dayMasters).flatMap(item=>domains.map(field=>item[field]));
assert.equal(new Set(allMessages).size, allMessages.length, '일간 40개 분야별 문구의 중복 제거');
for(const type of ['harmony', 'clash']){
  const rows=db.branchRelations[type];
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.flat()).size, 12, `${type} 12지지 완전 대응`);
  rows.forEach(row=>assert.ok(row.length===2 && row.every(s=>branches.includes(s))));
}

const env = {};
runInNewContext(readFileSync(new URL('../dist/assets/lunar.js', import.meta.url), 'utf8'), env);
const { Solar, LunarUtil }=env;
const result = Solar.fromYmdHms(2026,10,24,12,0,0).getLunar().getEightChar();
assert.ok(branches.includes(result.getDayZhi()));
for(const master of masters){
  for(const periodStem of masters){
    const tenGod=LunarUtil.SHI_SHEN[master+periodStem];
    assert.ok(typeof tenGod==='string', `${master}+${periodStem}`);
  }
}
console.log(`자체 사주 지식 DB 검증 통과 · 일간 ${masters.length}종 · 십성 ${gods.length}종 · 분야 ${domains.length}개 · 지지 합/충 12쌍 · 상세 해설 ${allMessages.length}개`);
