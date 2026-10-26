// 화면마다 하나의 장면을 보여주는 마음도감 내비게이션.
// 책갈피(URL 해시)를 유지해 브라우저 뒤로 가기와 직접 공유를 지원한다.
const screenIds = ["home", "types", "blood", "bridge", "talk", "theater"];
const byId = id => document.getElementById(id);

const talkLab = byId("talk-lab");
const bridge = byId("bridge");
const theater = byId("theater");
if (talkLab && bridge && theater) {
  const talkPage = document.createElement("section");
  talkPage.id = "talk";
  talkPage.className = "chapter talk-page screen";
  talkPage.dataset.screen = "talk";
  talkPage.hidden = true;
  const title = document.createElement("p");
  title.className = "eyebrow";
  title.textContent = "말풍선 번역소 · 우리의 대화";
  talkPage.append(title, talkLab);
  talkLab.classList.add("storybook-card");
  const next = document.createElement("a");
  next.className = "primary-link next-link talk-to-story";
  next.href = "#theater";
  next.textContent = "나의 마음 이야기 보기 →";
  talkPage.append(next);
  theater.before(talkPage);
}

// 독자에게 필요한 정보만 표시한다. 제작 로그와 원화 검수 상태는 개발 문서에서 관리한다.
document.querySelector(".art-review")?.remove();
document.querySelector(".concept-roster")?.remove();
document.querySelector(".review-ribbon")?.remove();
document.querySelector(".preview-shortcut")?.remove();
document.querySelector(".talk-lab .review-pill")?.remove();

const foxArt = "./assets/branding/storybook-fox-app-icon-v01.webp";
const typeArt = {
  ISTJ:"./assets/characters/mbti/istj-hedgehog-draft-v01.webp",
  ISFJ:"./assets/characters/mbti/isfj-gardener-draft-v01.webp",
  INFJ:"./assets/characters/mbti/infj-owl-draft-v01.webp",
  INTJ:"./assets/characters/mbti/intj-storybook-v01.webp",
  ISTP:"./assets/characters/mbti/istp-storybook-v01.webp",
  ISFP:"./assets/characters/mbti/isfp-storybook-v01.webp",
  INFP:"./assets/characters/mbti/infp-storybook-v01.webp",
  INTP:"./assets/characters/mbti/intp-storybook-v01.webp",
  ESTP:"./assets/characters/mbti/estp-storybook-v01.webp",
  ESFP:"./assets/characters/mbti/esfp-storybook-v01.webp",
  ENFP:"./assets/characters/mbti/enfp-storybook-v01.webp",
  ENTP:"./assets/characters/mbti/entp-storybook-v01.webp",
  ESTJ:"./assets/characters/mbti/estj-storybook-v01.webp",
  ESFJ:"./assets/characters/mbti/esfj-storybook-v01.webp",
  ENFJ:"./assets/characters/mbti/enfj-storybook-v01.webp",
  ENTJ:"./assets/characters/mbti/entj-storybook-v01.webp"
};
let group = 0;
const typeButtons = [...document.querySelectorAll("#types-grid .type-card")];
typeButtons.forEach((button, index) => {
  const code = button.dataset.type;
  const holder = document.createElement("span");
  holder.className = "type-portrait";
  holder.setAttribute("aria-hidden", "true");
  const img = new Image();
  img.src = typeArt[code] || foxArt;
  img.alt = "";
  img.loading = "lazy";
  holder.append(img);
  button.prepend(holder);
  button.dataset.page = String(Math.floor(index / 4));
});

function showGroup(index) {
  group = Math.min(3, Math.max(0, index));
  typeButtons.forEach(button => { button.hidden = Number(button.dataset.page) !== group; });
  document.querySelectorAll(".group-tab").forEach(button => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.group) === group));
  });
}
document.querySelectorAll(".group-tab").forEach(button => button.addEventListener("click", () => showGroup(Number(button.dataset.group))));
const selectedType = typeButtons.find(button => button.getAttribute("aria-pressed") === "true");
if (selectedType) group = Number(selectedType.dataset.page);
showGroup(group);

const sodaArt = {
  A:"./assets/branding/blood-a-bunny-v02.webp",
  B:"./assets/branding/blood-b-otter-v02.webp",
  AB:"./assets/branding/blood-ab-owl-v01.webp",
  O:"./assets/branding/blood-o-bear-v01.webp"
};
document.querySelectorAll("#blood-grid .soda-card").forEach(button => {
  const img = new Image();
  img.src = sodaArt[button.dataset.blood] || foxArt;
  img.className = "soda-portrait";
  img.alt = "";
  img.loading = "lazy";
  button.prepend(img);
});

// 작은 이야기책 안에 두 주인공을 그려 놓고 내용만 부드럽게 스크롤한다.
const resultStory = byId("result");
const sceneSwitch = document.querySelector("#result .scene-switch");
if (resultStory && sceneSwitch) {
  const paper = document.createElement("div");
  paper.className = "story-scroll illustrated-scroll";
  paper.append(byId("storyline"),document.querySelector("#result .story-advice"),byId("scene-question"));
  resultStory.insertBefore(paper, sceneSwitch);
  const cameos = document.createElement("div");
  cameos.className = "story-cameos";
  for (const [kind, title] of [["type","성격 친구"],["soda","소다 친구"]]) {
    const frame = document.createElement("div");
    frame.className = "cameo-frame";
    const img = new Image();img.alt="";img.dataset.cameo=kind;
    const name = document.createElement("span");name.dataset.cameoLabel=kind;
    name.textContent=title;
    frame.append(img,name);cameos.append(frame);
  }
  paper.append(cameos);
}
function updateStoryCameos(){
  const type = document.querySelector('.type-card[aria-pressed="true"]')?.dataset.type;
  const blood = document.querySelector('.soda-card[aria-pressed="true"]')?.dataset.blood;
  const elem = document.querySelector(".story-cameos");
  if (!elem) return;
  elem.hidden = !(type && blood);
  const typeImage = elem.querySelector('[data-cameo="type"]');
  const sodaImage = elem.querySelector('[data-cameo="soda"]');
  typeImage.src = typeArt[type] || "./assets/branding/storybook-fox-app-icon-v01.webp";
  sodaImage.src = sodaArt[blood] || "./assets/branding/storybook-fox-app-icon-v01.webp";
  elem.querySelector('[data-cameo-label="type"]').textContent = type || "성격 친구";
  elem.querySelector('[data-cameo-label="soda"]').textContent = blood ? blood+"형 친구" : "소다 친구";
}
window.addEventListener("maeum:selection-change",event=>{
  const {field,value}=event.detail || {};
  if(field==="type"){
    const selected=typeButtons.find(button=>button.dataset.type===value);
    if(selected)showGroup(Number(selected.dataset.page));
  }else if(field==="reset")showGroup(0);
  updateStoryCameos();
});
updateStoryCameos();

// 휴대폰 기본 선택 메뉴 대신 이야기책 안에서 친구를 고르는 별도 장면.
const friendSelect = byId("friend-type");
if (friendSelect) {
  const friendPicker = document.createElement("button");
  friendPicker.type = "button";
  friendPicker.className = "friend-picker";
  friendPicker.textContent = friendSelect.selectedOptions[0]?.textContent || "친구 고르기";
  friendSelect.classList.add("enhanced");
  friendSelect.after(friendPicker);
  const friendDialog = document.createElement("dialog");
  friendDialog.className = "atlas-dialog friend-dialog";
  friendDialog.setAttribute("aria-label", "함께 볼 유형 고르기");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "atlas-close";
  close.textContent = "×";
  close.setAttribute("aria-label", "친구 선택 닫기");
  close.addEventListener("click", () => friendDialog.close());
  const heading = document.createElement("h2");
  heading.textContent = "오늘 함께할 친구는?";
  const help = document.createElement("p");
  help.className = "dialog-note";
  help.textContent = "서로 다른 두 마음의 이야기를 열어 봐!";
  const choices = document.createElement("div");
  choices.className = "friend-choice-list illustrated-scroll";
  for (const option of [...friendSelect.options].filter(option=>option.value)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "friend-choice";
    const portrait = new Image();
    portrait.src = typeArt[option.value] || "./assets/branding/storybook-fox-app-icon-v01.webp";
    portrait.alt="";
    const label = document.createElement("span");
    label.textContent = option.textContent;
    button.append(portrait,label);
    button.addEventListener("click", () => {
      friendSelect.value = option.value;
      friendSelect.dispatchEvent(new Event("change", {bubbles:true}));
      friendPicker.textContent = option.textContent;
      friendDialog.close();
    });
    choices.append(button);
  }
  friendDialog.append(close,heading,help,choices);
  document.body.append(friendDialog);
  friendPicker.addEventListener("click",()=>friendDialog.showModal());
  friendDialog.addEventListener("click", event => { if (event.target === friendDialog) friendDialog.close(); });
  friendSelect.addEventListener("change",()=>{friendPicker.textContent=friendSelect.selectedOptions[0]?.textContent || "친구 고르기";});
}

// 마음 산책을 일반 팝업 대신 일러스트 책장으로 펼친다.
const atlasDialog = byId("atlas-dialog");
const explorePanel = byId("explore-panel");
const exploreResult = byId("explore-result");
const dialogSlot = byId("dialog-slot");
dialogSlot.append(explorePanel, exploreResult);
const closeAtlas = () => {
  if (atlasDialog.open) atlasDialog.close();
  explorePanel.hidden = true;
  byId("explore-toggle")?.setAttribute("aria-expanded", "false");
};
byId("atlas-close")?.addEventListener("click", closeAtlas);
byId("explore-close")?.addEventListener("click", closeAtlas);
atlasDialog?.addEventListener("click", event => {
  if (event.target === atlasDialog) closeAtlas();
});
atlasDialog?.addEventListener("close", () => {
  explorePanel.hidden = true;
  byId("explore-toggle")?.setAttribute("aria-expanded", "false");
});
byId("explore-toggle")?.addEventListener("click", () => {
  if (!atlasDialog.open && (explorePanel.hidden === false || exploreResult.hidden === false)) atlasDialog.showModal();
});
dialogSlot.addEventListener("click", event => {
  const link = event.target.closest('a[href^="#"]');
  if (link) closeAtlas();
});

// 여러 기능에 걸친 결과가 있어도 바탕 화면은 절대로 세로로 스크롤되지 않는다.
function route() {
  const id = location.hash.replace(/^#/, "").split("?")[0] || (new URLSearchParams(location.search).has("t") ? "theater" : "home");
  const target = screenIds.includes(id) ? id : "home";
  for (const screen of document.querySelectorAll("main > .screen")) {
    const current = screen.dataset.screen === target;
    screen.hidden = !current;
    screen.setAttribute("aria-hidden", String(!current));
    if (current) {
      screen.classList.remove("enter-scene");
      void screen.offsetWidth;
      screen.classList.add("enter-scene");
    }
  }
  document.querySelectorAll(".site-header nav a[data-nav]").forEach(link => {
    if (link.dataset.nav === target) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  closeAtlas();
  document.title = target === "home" ? "곰같은여우의 마음도감" : `${({types:"성격마을",blood:"소다상점",bridge:"마음궁합",talk:"T/F 대화",theater:"나의 이야기"})[target]} | 곰같은여우의 마음도감`;
  document.querySelectorAll(".illustrated-scroll").forEach(el => { el.scrollTop = 0; });
}
window.addEventListener("hashchange", route);
route();

document.querySelectorAll("#types-grid .type-card").forEach(button => button.addEventListener("click", () => {
  byId("types-next")?.classList.add("bouncy-next");
}));
byId("types-next")?.addEventListener("click", event => {
  const hasSelected = !!document.querySelector('#types-grid .type-card[aria-pressed="true"]');
  if (!hasSelected) {
    event.preventDefault();
    byId("chosen-type").textContent = "마음에 드는 친구를 하나 골라 줘!";
  }
});

// 이미지를 새로 저장했어도 주소가 달라져 개인정보가 서버로 제출되는 일은 없다.
document.querySelector(".brand-icon")?.setAttribute("src", "./assets/branding/maeum-header-fox-v01.webp");
