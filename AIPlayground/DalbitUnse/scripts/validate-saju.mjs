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

// 운영 화면에서 쓰는 한국 시간대 보정 함수를 같은 원본에서 불러와 검증합니다.
const appSource = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const correctionStart = appSource.indexOf('  const seoulOffsetFormat=');
const correctionEnd = appSource.indexOf('  function readBirthTime(', correctionStart);
assert.ok(correctionStart > 0 && correctionEnd > correctionStart, '한국 표준시 보정 함수가 필요합니다.');
const calculation = { Solar, Date, Intl };
runInNewContext(`${appSource.slice(correctionStart, correctionEnd)}\nthis.pillars=koreanPillars;this.offset=seoulOffsetMinutes;`, calculation);
const beforeIpchun = calculation.pillars(Solar.fromYmdHms(2026, 2, 4, 5, 0, 0));
const afterIpchun = calculation.pillars(Solar.fromYmdHms(2026, 2, 4, 5, 10, 0));
assert.equal(beforeIpchun.year, '乙巳', '한국 시간 2026년 입춘 전은 을사년입니다.');
assert.equal(beforeIpchun.month, '己丑');
assert.equal(afterIpchun.year, '丙午', '한국 시간 입춘 이후는 병오년입니다.');
assert.equal(afterIpchun.month, '庚寅');
assert.equal(calculation.offset([2026, 2, 4, 5, 0]), 540);
assert.equal(calculation.offset([1955, 1, 15, 12, 0]), 510, '과거 한국 표준시 UTC+8:30을 반영해야 합니다.');
assert.equal(calculation.offset([1955, 6, 1, 12, 0]), 570, '1955년 여름의 서머타임도 반영해야 합니다.');
const earlyZi = calculation.pillars(Solar.fromYmdHms(2026, 10, 24, 0, 0, 0));
const lateZi = calculation.pillars(Solar.fromYmdHms(2026, 10, 24, 23, 0, 0));
assert.equal(earlyZi.day, lateZi.day);
assert.notEqual(earlyZi.time, lateZi.time, '00시와 23시는 동일한 자시라도 시간 천간이 다를 수 있습니다.');
assert.match(appSource, /new Option\('자시 · 23:00~23:59','23'\)/);
console.log('사주 계산 회귀 검증 통과 · 한국 시간 입춘 교차 · 1955 표준시 · 이른/늦은 자시 · 절기 기준 4기둥 · 십성 · 윤달 왕복 변환 · 성별 대운');
