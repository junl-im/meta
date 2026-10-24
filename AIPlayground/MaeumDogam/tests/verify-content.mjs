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

import {EXPLORE_QUESTIONS, recommendStoryType} from "../data/explore.mjs";
assert.equal(EXPLORE_QUESTIONS.length,12,"마음 탐험은 12장면");
assert.equal(new Set(EXPLORE_QUESTIONS.map(q=>q.id)).size,12,"장면 ID 중복");
const axisLetters=["EI","SN","TF","JP"];
for(const axis of axisLetters){
  assert.equal(EXPLORE_QUESTIONS.filter(q=>q.axis===axis).length,3,axis+" 장면 수 오류");
}
for(const question of EXPLORE_QUESTIONS){
  assert.equal(question.options.length,2,question.id+" 선택지 수 오류");
  assert.ok(question.prompt.length>=12,question.id+" 장면 질문 누락");
  assert.deepEqual(question.options.map(o=>o.letter).sort(),question.axis.split("").sort(),question.id+" 축 불일치");
  assert.ok(question.options.every(o=>o.label.length>=8),question.id+" 문항 누락");
}
for(const type of TYPES){
  const answers=EXPLORE_QUESTIONS.map(q=>{
    const letter=type.code[axisLetters.indexOf(q.axis)];
    return q.options.findIndex(o=>o.letter===letter);
  });
  assert.equal(recommendStoryType(answers),type.code,type.code+" 추천 오류");
}
assert.equal(recommendStoryType([]),null);
assert.equal(recommendStoryType(Array(12).fill(2)),null);
assert.equal(recommendStoryType("000000000000"),null);
console.log("PASS: 12장면 마음 탐험 × 16가지 추천 결과 및 잘못된 입력 방어");
