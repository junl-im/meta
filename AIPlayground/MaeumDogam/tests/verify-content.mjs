import {TYPES, SODAS, BLOOD_CODES, getStory} from "../data/content.mjs";
import assert from "node:assert/strict";
assert.equal(TYPES.length,16,"16유형이어야 합니다.");
assert.equal(SODAS.length,4,"소다 캐릭터는 4종이어야 합니다.");
assert.deepEqual(BLOOD_CODES,["A","B","O","AB"]);
const codes=TYPES.map((item)=>item.code);
assert.equal(new Set(codes).size,16,"유형 코드 중복");
const stories=[];
for(const item of TYPES){
  assert.equal(item.scenes.length,4,item.code+" 이야기 부족");
  for(const blood of BLOOD_CODES){
    const scene=getStory(item.code,blood);
    assert.ok(scene && scene.story.length>=60,item.code+"-"+blood+" 이야기 누락");
    stories.push(scene.story);
  }
}
assert.equal(stories.length,64);
assert.equal(new Set(stories).size,64,"64개 본문 중복");
assert.equal(getStory("INVALID","A"),null);
assert.equal(getStory("ISTJ","INVALID"),null);
console.log("PASS: 16유형 × 4소다 = 중복 없는 64개 창작 이야기");
