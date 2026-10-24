import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const assert = (condition, description) => { if (!condition) throw new Error(description); };
const artwork = read('dist/data/tarot-artwork.json');
const meanings = read('dist/data/tarot-meanings.json');
const minors = read('dist/data/tarot-minor-readings.json');

assert(artwork.schemaVersion === 1, '원화 목록 스키마 오류');
assert(artwork.majorArtwork.length === 22, '메이저 원화는 22장이어야 합니다');
assert(artwork.minorArtwork.length === 4 && artwork.minorArtwork.every(s => s.length === 14), '마이너 원화는 56장이어야 합니다');
assert(meanings.major.length === 22 && meanings.suits.length === 4 && meanings.ranks.length === 14, '타로 명칭과 원화의 순서가 다릅니다');
assert(minors.schemaVersion === 1 && minors.cards.length === 4 && minors.cards.every(s => s.length === 14), '마이너 풀이가 누락됐습니다');

const all = [...artwork.majorArtwork, ...artwork.minorArtwork.flat()];
const unique = new Set();
for (const [index, file] of all.entries()) {
  assert(/^\.\/assets\/[a-z0-9-]+\.webp$/.test(file), `잘못된 원화 경로 #${index}`);
  const path = resolve(root, 'dist', file);
  assert(existsSync(path), `원화 누락: ${file}`);
  const bytes = readFileSync(path);
  assert(bytes.length > 6000 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP', `잘못된 이미지: ${file}`);
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert(!unique.has(digest), `동일 원화 중복: ${file}`);
  unique.add(digest);
}

const allReadings = minors.cards.flat();
const texts = new Set();
for (const [index, card] of allReadings.entries()) {
  assert(Array.isArray(card) && card.length === 3, `풀이 구조 오류 #${index + 1}`);
  for (const [part, text] of card.entries()) {
    assert(typeof text === 'string' && text.trim().length >= (part === 0 ? 5 : 35) && text.length < 360, `풀이 문장 오류 #${index + 1}`);
    assert(!texts.has(text), `복제된 풀이가 있습니다: ${text.slice(0, 25)}`);
    texts.add(text);
  }
}

const memorable = [
  [2, 2, /상처|슬픔/], // 소드 3
  [2, 5, /건너|이동/], // 소드 6
  [2, 8, /걱정|불안/], // 소드 9
  [2, 9, /고통|마침표/], // 소드 10
  [1, 4, /잃|슬픔/], // 컵 5
  [3, 4, /어려움|추위/], // 펜타클 5
  [0, 9, /짐/], // 완드 10
];
for (const [suit, rank, pattern] of memorable) {
  assert(pattern.test(minors.cards[suit][rank][0] + minors.cards[suit][rank][1]), `핵심 상징 누락: ${minors.order[suit]} ${minors.ranks[rank]}`);
}

console.log(`타로 검증 통과 · 메이저 22장 + 마이너 56장 · 원화 해시 중복 0 · 카드 고유 해석 ${allReadings.length}장`);
