import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const TIMEZONE = 'Asia/Seoul';
const OUTPUT_PATH = path.resolve('ai-cleaner/data/daily-topics.json');
const DEFAULT_MODEL = 'gpt-5';
const TOPIC_COUNT = 10;
const HISTORY_COMMITS = 14;
const HISTORY_TOPIC_LIMIT = 120;
const execFileAsync = promisify(execFile);

function env(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function requiredConfigIssues({ apiKey, seed }) {
  const issues = [];
  if (!apiKey) issues.push('OPENAI_API_KEY secret');
  if (!seed) issues.push('BLOG_FACTORY_SEED variable');
  return issues;
}

function assertRequiredConfig({ apiKey, seed }) {
  const issues = requiredConfigIssues({ apiKey, seed });
  if (!issues.length) return;
  throw new Error(
    `필수 Actions 설정 ${issues.length}개가 없습니다: ${issues.join(', ')}. ` +
    'Repository Settings > Secrets and variables > Actions에서 설정해 주세요.'
  );
}

function kstDateParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    localTimestamp: `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}+09:00`
  };
}

function clampText(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function loadRecentTopicTitles() {
  const titles = [];
  const seen = new Set();
  const addPayload = payload => {
    for (const topic of Array.isArray(payload?.topics) ? payload.topics : []) {
      const title = clampText(topic?.title, 120);
      const key = title.toLocaleLowerCase('ko-KR');
      if (!title || seen.has(key)) continue;
      seen.add(key);
      titles.push(title);
      if (titles.length >= HISTORY_TOPIC_LIMIT) break;
    }
  };
  try { addPayload(JSON.parse(await fs.readFile(OUTPUT_PATH, 'utf8'))); } catch (_) {}
  if (titles.length >= HISTORY_TOPIC_LIMIT) return titles;
  try {
    const { stdout } = await execFileAsync('git', ['log', `-${HISTORY_COMMITS}`, '--format=%H', '--', 'ai-cleaner/data/daily-topics.json'], { cwd: process.cwd(), maxBuffer: 1024 * 1024 });
    for (const sha of stdout.split(/\r?\n/).map(v => v.trim()).filter(Boolean)) {
      if (titles.length >= HISTORY_TOPIC_LIMIT) break;
      try {
        const { stdout: raw } = await execFileAsync('git', ['show', `${sha}:ai-cleaner/data/daily-topics.json`], { cwd: process.cwd(), maxBuffer: 2 * 1024 * 1024 });
        addPayload(JSON.parse(raw));
      } catch (_) {}
    }
  } catch (_) {}
  return titles.slice(0, HISTORY_TOPIC_LIMIT);
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text.trim();
  const chunks = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (content?.type === 'output_text' && typeof content.text === 'string') chunks.push(content.text);
      else if (typeof content?.text === 'string') chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function parseJsonText(text) {
  const stripped = String(text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(stripped); } catch (_) {}
  const first = stripped.indexOf('{');
  const last = stripped.lastIndexOf('}');
  if (first >= 0 && last > first) return JSON.parse(stripped.slice(first, last + 1));
  throw new Error('OpenAI 응답에서 JSON 객체를 찾지 못했습니다.');
}

function normalizeTopic(raw, index) {
  const score = Number(raw?.priorityScore);
  return {
    id: `topic-${String(index + 1).padStart(2, '0')}`,
    title: clampText(raw?.title, 120),
    category: clampText(raw?.category, 48) || '일반',
    whyNow: clampText(raw?.whyNow, 220),
    searchIntent: clampText(raw?.searchIntent, 180),
    angle: clampText(raw?.angle, 220),
    researchNeed: clampText(raw?.researchNeed, 240),
    imageConcept: clampText(raw?.imageConcept, 220),
    priorityReason: clampText(raw?.priorityReason, 220),
    priorityScore: Number.isFinite(score) ? Math.max(1, Math.min(100, Math.round(score))) : Math.max(1, 90 - index * 4)
  };
}

function validateAndNormalize(parsed) {
  const rawTopics = Array.isArray(parsed?.topics) ? parsed.topics : [];
  if (rawTopics.length < TOPIC_COUNT) throw new Error(`주제가 ${rawTopics.length}개만 생성되었습니다. 정확히 ${TOPIC_COUNT}개가 필요합니다.`);
  const topics = rawTopics.slice(0, TOPIC_COUNT).map(normalizeTopic).filter(topic => topic.title);
  if (topics.length !== TOPIC_COUNT) throw new Error('제목이 비어 있는 주제가 있어 Daily Engine 결과를 저장하지 않았습니다.');
  topics.sort((a, b) => b.priorityScore - a.priorityScore);
  topics.forEach((topic, index) => {
    topic.rank = index + 1;
    topic.top3 = index < 3;
  });
  return {
    summary: clampText(parsed?.summary, 300) || '오늘 작성 가치가 높은 주제를 우선순위대로 정리했습니다.',
    topics
  };
}

async function requestOpenAI({ apiKey, model, prompt, useWebSearch = true }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150_000);
  const topicSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string' },
      topics: {
        type: 'array',
        minItems: TOPIC_COUNT,
        maxItems: TOPIC_COUNT,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            category: { type: 'string' },
            whyNow: { type: 'string' },
            searchIntent: { type: 'string' },
            angle: { type: 'string' },
            researchNeed: { type: 'string' },
            imageConcept: { type: 'string' },
            priorityReason: { type: 'string' },
            priorityScore: { type: 'integer', minimum: 1, maximum: 100 }
          },
          required: ['title','category','whyNow','searchIntent','angle','researchNeed','imageConcept','priorityReason','priorityScore']
        }
      }
    },
    required: ['summary','topics']
  };
  const body = {
    model,
    input: prompt,
    store: false,
    reasoning: { effort: 'low' },
    text: {
      verbosity: 'low',
      format: {
        type: 'json_schema',
        name: 'daily_blog_topics',
        description: 'Exactly ten Korean blog topic candidates and their production metadata.',
        strict: true,
        schema: topicSchema
      }
    }
  };
  if (useWebSearch) body.tools = [{ type: 'web_search' }];
  try {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const text = await response.text();
      let payload;
      try { payload = JSON.parse(text); } catch (_) { payload = { raw: text }; }
      if (response.ok) return payload;
      const message = payload?.error?.message || `HTTP ${response.status}`;
      if (attempt < 3 && (response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500)) {
        await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
        continue;
      }
      throw new Error(`OpenAI API 실패: ${message}`);
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('OpenAI API 요청이 150초를 넘어 중단되었습니다. 잠시 뒤 다시 실행해 주세요.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
  throw new Error('OpenAI API 요청이 완료되지 않았습니다.');
}

async function main() {
  const apiKey = env('OPENAI_API_KEY');
  const model = env('OPENAI_MODEL', DEFAULT_MODEL);
  const seed = clampText(env('BLOG_FACTORY_SEED'), 4000);
  const audience = clampText(env('BLOG_FACTORY_AUDIENCE'), 1200);
  const avoidTopics = clampText(env('BLOG_FACTORY_AVOID_TOPICS'), 8000);
  const recentTopics = await loadRecentTopicTitles();
  assertRequiredConfig({ apiKey, seed });

  const { date, localTimestamp } = kstDateParts();
  const prompt = `당신은 한국어 블로그의 데일리 소재 편집장이다. 오늘 날짜는 ${date}, 기준 시간대는 ${TIMEZONE}이다.\n\n` +
    `관심 분야: ${seed}\n` +
    `주요 독자: ${audience || '관심 분야에서 합리적으로 추론'}\n` +
    `이미 쓴 주제/피할 소재: ${avoidTopics || '별도 제공 없음'}\n` +
    `최근 Daily Engine 주제(중복 회피용, 최대 ${HISTORY_TOPIC_LIMIT}개): ${recentTopics.length ? recentTopics.join(' | ') : '기록 없음'}\n\n` +
    `웹 검색 도구를 사용할 수 있으면 오늘 기준으로 시기성·계절성·최근 변화가 있는지 확인하라. 다만 확인되지 않은 검색량, 조회수, 인기 순위, 효과 수치를 만들지 마라. ` +
    `사용자의 실제 방문·구매·사용 경험을 지어내지 마라. 너무 뉴스성이라 하루 만에 가치가 사라지는 소재만 고르지 말고, 검색형·시즌형·생활형·에버그린을 적절히 섞어라. ` +
    `서로 검색 의도가 겹치지 않도록 정확히 ${TOPIC_COUNT}개를 만들고, 최근 주제와 제목만 다른 재탕 소재는 제외하라. 검색형·시즌형·비교형·생활형·에버그린이 한 유형에 과도하게 몰리지 않게 구성하라. ` +
    `priorityScore는 검색 의도 명확성 30점 + 오늘성/시기성 25점 + 차별화 25점 + 작성 실행가능성 20점 기준으로 합산하고, priorityReason에 점수 근거를 한 문장으로 적어라.\n\n` +
    `반드시 아래 형태의 JSON 객체만 출력하라. 마크다운 코드펜스와 설명문은 금지한다.\n` +
    `{"summary":"오늘 소재 구성 요약","topics":[{"title":"제목/주제","category":"검색형|시즌형|생활형|비교형|에버그린 등","whyNow":"오늘 또는 지금 쓰기 좋은 이유. 확인된 사실만 단정","searchIntent":"독자가 이 주제를 찾는 의도","angle":"비슷한 글과 다르게 풀 각도","researchNeed":"본문 작성 전에 확인할 최신 사실 또는 자료. 없으면 '추가 확인 최소'","imageConcept":"대표 이미지 또는 본문 장면 콘셉트","priorityReason":"검색 의도·오늘성·차별화·실행가능성 기준의 우선순위 이유","priorityScore":90}]}`;

  const payload = await requestOpenAI({ apiKey, model, prompt, useWebSearch: true });
  const responseText = extractResponseText(payload);
  if (!responseText) throw new Error('OpenAI 응답 본문이 비어 있습니다.');
  const normalized = validateAndNormalize(parseJsonText(responseText));
  const webSearchUsed = Array.isArray(payload?.output) && payload.output.some(item => String(item?.type || '').includes('web_search'));
  const result = {
    schemaVersion: 1,
    status: 'ready',
    date,
    timezone: TIMEZONE,
    generatedAt: new Date().toISOString(),
    generatedAtLocal: localTimestamp,
    model,
    engine: 'github-actions-openai-responses',
    webSearchUsed,
    historyCompared: recentTopics.length,
    summary: normalized.summary,
    topics: normalized.topics
  };
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Daily Blog Factory: ${date} 주제 ${result.topics.length}개 생성 완료 (${model}, webSearchUsed=${webSearchUsed}).`);
}

main().catch(error => {
  console.error(`Daily Blog Factory generation failed: ${error?.message || error}`);
  process.exitCode = 1;
});
