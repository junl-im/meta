import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { strict as assert } from 'node:assert';

// 실제로 배포하는 달력 엔진을 그대로 실행해 4기둥·절기·대운 회귀를 검사합니다.
const engine = {};
runInNewContext(readFileSync(new URL('../dist/assets/lunar.js', import.meta.url), 'utf8'), engine);
const { Solar, Lunar, LunarUtil } = engine;

const birthday = Solar.fromYmdHms(1995, 10, 18, 13, 0, 0);
const lunar = birthday.getLunar();
const eight = lunar.getEightChar();
assert.equal(eight.getYear(), '乙亥');
assert.equal(eight.getMonth(), '丙戌');
assert.equal(eight.getDay(), '壬午');
assert.equal(eight.getYearShiShenGan(), '伤官');
assert.equal(LunarUtil.SHI_SHEN['壬' + '丙'], '偏财');
assert.equal(Lunar.fromYmdHms(lunar.getYear(), lunar.getMonth(), lunar.getDay(), 13, 0, 0).getSolar().toYmd(), '1995-10-18');

const maleCycles = eight.getYun(1, 2).getDaYun(5).slice(1);
const femaleCycles = eight.getYun(0, 2).getDaYun(5).slice(1);
assert.equal(maleCycles[0].getGanZhi(), '乙酉');
assert.notEqual(maleCycles[0].getGanZhi(), femaleCycles[0].getGanZhi());
assert.ok(maleCycles.every(c => c.getStartAge() <= c.getEndAge()));
assert.ok(maleCycles.every(c => c.getEndYear() - c.getStartYear() === 9));

const annual = Solar.fromYmdHms(2026, 7, 1, 12, 0, 0).getLunar().getEightChar();
assert.equal(annual.getYear(), '丙午');
console.log('사주 계산 회귀 검증 통과 · 절기 기준 4기둥 · 십성 · 윤달 왕복 변환 · 성별 대운 · 2026 세운');
