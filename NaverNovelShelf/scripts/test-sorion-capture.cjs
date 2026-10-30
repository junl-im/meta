const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const base = path.resolve(__dirname, '..', 'extension', 'sorion-naver-reader');
const source = (name) => fs.readFileSync(path.join(base, name), 'utf8');
const chapterUrl = 'https://m.novel.naver.com/challenge/detail?novelId=1247361&volumeNo=39#nafullscreen';
const chapterText = ('이준이 코코에게 물었다.\n코코는 대답하지 않았다.\n').repeat(14);

async function testExtractAndSend() {
  const buttons = new Map();
  const messages = [];
  const document = {
    title: '39화. 아마노의 도장, 사무라이 코코 : 네이버웹소설',
    querySelector(selector) {
      if (selector === '#con_data') return { innerText: chapterText };
      if (selector === '#detailContents h2') return { innerText: '제목 : 39화. 아마노의 도장' };
      return null;
    },
    getElementById(id) { return buttons.get(id); },
    createElement() {
      return {
        style: {}, isConnected: true, setAttribute() {},
        addEventListener(name, cb) { this[name] = cb; },
      };
    },
    body: { appendChild(node) { buttons.set(node.id, node); } },
  };
  const chrome = {
    runtime: {
      onMessage: { addListener() {} },
      async sendMessage(message) { messages.push(message); return { ok: true }; },
    },
  };
  vm.runInNewContext(source('naver-capture.js'), {
    document, chrome, location: { href: chapterUrl }, URL,
    setInterval() {}, setTimeout() {},
  });
  const button = buttons.get('gomfox-sorion-chapter-button');
  assert(button, 'chapter page must receive one-click button');
  button.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(messages.length, 1, 'capture must send once');
  const chapter = messages[0].chapter;
  assert.equal(chapter.novelId, '1247361');
  assert.equal(chapter.volumeNo, '39');
  assert.equal(chapter.title, '39화. 아마노의 도장');
  assert.equal(chapter.text, chapterText.trim());
  assert.equal(chapter.url, chapterUrl);
  return chapter;
}

async function testOneTimeHandoff(chapter) {
  const state = {};
  const opened = [];
  let onMessage;
  const chrome = {
    runtime: { onMessage: { addListener(fn) { onMessage = fn; } } },
    action: { onClicked: { addListener() {} } },
    tabs: {
      async create(data) { opened.push(data.url); },
      async sendMessage() {},
    },
    storage: { session: {
      async set(record) { Object.assign(state, record); },
      async get(key) { return { [key]: state[key] }; },
      async remove(key) { delete state[key]; },
    } },
  };
  vm.runInNewContext(source('background.js'), { chrome, URL, crypto: { randomUUID }, Date, Set });
  const send = (msg, tabUrl) => new Promise((resolve) => {
    const keepOpen = onMessage(msg, { tab: { url: tabUrl } }, resolve);
    assert.equal(keepOpen, true, 'async message response channel required');
  });
  const accepted = await send({ type: 'SORION_CHAPTER_CAPTURE', chapter }, chapterUrl);
  assert.equal(accepted.ok, true);
  assert.equal(opened.length, 1);
  const token = new URL(opened[0]).searchParams.get('handoff');
  assert(token, 'handoff token must be present');
  const imported = await send({ type: 'SORION_CHAPTER_TAKE', token }, opened[0]);
  assert.equal(imported.ok, true);
  assert.equal(imported.chapter.text, chapter.text);
  assert.equal(Object.keys(state).length, 0, 'original chapter must be deleted after one handoff');
  const replay = await send({ type: 'SORION_CHAPTER_TAKE', token }, opened[0]);
  assert.equal(replay.ok, false, 'handoff must be single-use');
}

(async () => {
  const chapter = await testExtractAndSend();
  await testOneTimeHandoff(chapter);
  console.log('SoriON Naver chapter extraction and one-time browser handoff: OK');
})().catch((error) => { console.error(error); process.exitCode = 1; });
