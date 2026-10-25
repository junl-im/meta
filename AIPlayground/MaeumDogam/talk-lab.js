// 마음도감 공개 체험판: T/F 문화 밈을 차별 없는 소통 놀이로 재구성한 창작 대사.
// 선택한 말투는 실제 MBTI 분류와 무관하며, 의학·심리 진단이 아닙니다.
const DIALOGUES = [
  {
    situation: "나 오늘 발표 완전 망했어. 집에 가고 싶어...",
    empathy: "진짜 속상했겠다. 준비 많이 했는데 너무 아쉬웠지?",
    solution: "다음에는 첫 30초만 같이 연습해 볼까? 내가 들어줄게!",
    ask: "지금은 속상한 얘기 더 들어줄까, 아니면 다음 발표를 같이 준비해 볼까?",
    insight: "마음을 알아주는 말과 손을 내미는 말. 둘 다 친절이 될 수 있어."
  },
  {
    situation: "방금 산 아이스크림을 떨어뜨렸어... 한 입도 못 먹었는데!",
    empathy: "아이고! 딱 먹으려던 순간이라 더 억울했겠다!",
    solution: "가게 아직 열었지? 이번엔 내가 하나 사 올게!",
    ask: "한 번만 같이 슬퍼해 줄까, 아니면 아이스크림 구조 작전에 나설까?",
    insight: "작은 사건엔 장난도 위로가 될 수 있어. 상대 표정을 살피는 게 포인트!"
  },
  {
    situation: "어제 답장이 늦어서 조금 서운했어.",
    empathy: "기다리게 해서 서운했겠다. 네 마음을 미처 못 봤어. 미안해.",
    solution: "다음엔 바쁠 때 한 줄 미리 남길게. 우리 서로 편한 방법을 정해 보자.",
    ask: "그렇게 느꼈구나, 미안해. 어떤 순간에 특히 서운했는지 더 들려줄래?",
    insight: "상처를 알아주는 말과 다시 그러지 않겠다는 약속은 함께 갈 수 있어."
  },
  {
    situation: "주말에 놀러 갈까? 그런데 날씨가 안 좋대!",
    empathy: "기대했는데 아쉽다! 우리 주말만 기다렸잖아.",
    solution: "비 오면 실내 전시회 어때? 근처에 괜찮은 곳 찾아봤어.",
    ask: "비가 와도 나가고 싶어, 아니면 집에서 쉬고 싶어? 네 마음부터 들어볼게.",
    insight: "T와 F의 싸움이 아니라 두 사람이 같은 주말을 즐기는 방법 찾기!"
  }
];

const sceneText = document.querySelector("#talk-situation");
const answerText = document.querySelector("#talk-answer");
const insightText = document.querySelector("#talk-insight");
const indexText = document.querySelector("#talk-index");
const choices = [...document.querySelectorAll("[data-talk-style]")];
const nextButton = document.querySelector("#talk-next");

if(sceneText && answerText && insightText && indexText && nextButton && choices.length === 3){
  let scene = 0;
  let style = "ask";

  function render(){
    const current = DIALOGUES[scene];
    indexText.textContent = `상황 ${scene + 1} / ${DIALOGUES.length}`;
    sceneText.textContent = current.situation;
    answerText.textContent = current[style];
    insightText.textContent = current.insight;
    choices.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.talkStyle === style));
    });
  }

  choices.forEach(button => button.addEventListener("click", () => {
    style = button.dataset.talkStyle;
    render();
  }));

  nextButton.addEventListener("click", () => {
    scene = (scene + 1) % DIALOGUES.length;
    style = "ask";
    render();
  });

  render();
}
