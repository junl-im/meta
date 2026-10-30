import assert from 'node:assert/strict';
import {languageSegments} from '../voice-source/languageSegments.mjs';
for(const text of ['그녀가 Hello world라고 말했다.','한 글 자 씩 읽 어 요.','The fox reads a book.','AI와 hello-world, 다시 한 글 자.']){
  const pieces=languageSegments(text);
  assert.equal(pieces.map(piece=>piece.text).join(''),text);
  if(text.includes('Hello world')) assert(pieces.some(piece=>piece.language==='en'&&piece.text==='Hello world'));
  if(text.includes('한 글 자')) assert(pieces.some(piece=>piece.language==='ko'&&piece.text.includes('한 글 자')));
}
assert.equal(languageSegments('Hello world')[0].language,'en');
assert.equal(languageSegments('한 글 자')[0].language,'ko');
console.log('Mixed-language segmentation and spaced Hangul: OK');
