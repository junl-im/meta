/* 곰같은여우의 마음도감: 창작 선택형 '마음 탐험'. 심리검사/진단이 아닙니다. */
export const EXPLORE_QUESTIONS = [
  {
    "id": "scene-01",
    "axis": "EI",
    "prompt": "처음 온 마음마을 축제! 어디로 발걸음이 가?",
    "options": [
      {
        "label": "새 친구가 모인 부스로 가서 인사하기",
        "letter": "E"
      },
      {
        "label": "조용한 곳에서 풍경을 보며 적응하기",
        "letter": "I"
      }
    ]
  },
  {
    "id": "scene-02",
    "axis": "SN",
    "prompt": "낯선 지도를 받았어. 무엇부터 볼까?",
    "options": [
      {
        "label": "표시된 길과 실제 거리부터 살펴보기",
        "letter": "S"
      },
      {
        "label": "지도 뒤에 숨은 이야기부터 상상하기",
        "letter": "N"
      }
    ]
  },
  {
    "id": "scene-03",
    "axis": "TF",
    "prompt": "친구가 실수한 일을 털어놓으면?",
    "options": [
      {
        "label": "어디서 꼬였는지 함께 정리하기",
        "letter": "T"
      },
      {
        "label": "속상했을 마음부터 들어 주기",
        "letter": "F"
      }
    ]
  },
  {
    "id": "scene-04",
    "axis": "JP",
    "prompt": "주말 소풍을 떠나기 전, 마음이 편한 쪽은?",
    "options": [
      {
        "label": "시간과 준비물을 미리 정해 두기",
        "letter": "J"
      },
      {
        "label": "그날 기분 따라 코스를 정하기",
        "letter": "P"
      }
    ]
  },
  {
    "id": "scene-05",
    "axis": "EI",
    "prompt": "소다상점에 새 손님이 찾아왔어!",
    "options": [
      {
        "label": "먼저 말을 걸어 좋아하는 맛을 물어보기",
        "letter": "E"
      },
      {
        "label": "손님이 편해질 때까지 곁에서 기다리기",
        "letter": "I"
      }
    ]
  },
  {
    "id": "scene-06",
    "axis": "SN",
    "prompt": "신기한 비밀 상자를 발견했어.",
    "options": [
      {
        "label": "단서와 구조를 자세히 관찰하기",
        "letter": "S"
      },
      {
        "label": "상자가 어디서 왔을지 이야기를 떠올리기",
        "letter": "N"
      }
    ]
  },
  {
    "id": "scene-07",
    "axis": "TF",
    "prompt": "두 친구가 서로 다른 의견을 냈어.",
    "options": [
      {
        "label": "각 의견의 근거와 해결책을 비교하기",
        "letter": "T"
      },
      {
        "label": "두 사람의 감정을 먼저 헤아리기",
        "letter": "F"
      }
    ]
  },
  {
    "id": "scene-08",
    "axis": "JP",
    "prompt": "축제 무대를 꾸미는 날이야.",
    "options": [
      {
        "label": "순서표를 만들고 하나씩 완성하기",
        "letter": "J"
      },
      {
        "label": "떠오르는 아이디어를 보며 바꿔 나가기",
        "letter": "P"
      }
    ]
  },
  {
    "id": "scene-09",
    "axis": "EI",
    "prompt": "하루가 길었어. 기분 전환이 필요하다면?",
    "options": [
      {
        "label": "마음 맞는 사람과 수다를 나누기",
        "letter": "E"
      },
      {
        "label": "혼자 쉬며 생각을 정리하기",
        "letter": "I"
      }
    ]
  },
  {
    "id": "scene-10",
    "axis": "SN",
    "prompt": "새 장난감을 만드는 과제가 생겼어.",
    "options": [
      {
        "label": "써 본 도구와 방법을 응용하기",
        "letter": "S"
      },
      {
        "label": "아직 없던 쓰임새를 상상하기",
        "letter": "N"
      }
    ]
  },
  {
    "id": "scene-11",
    "axis": "TF",
    "prompt": "칭찬 카드를 친구에게 쓴다면?",
    "options": [
      {
        "label": "그 친구가 잘한 일을 구체적으로 적기",
        "letter": "T"
      },
      {
        "label": "그 친구가 내게 준 따뜻함을 적기",
        "letter": "F"
      }
    ]
  },
  {
    "id": "scene-12",
    "axis": "JP",
    "prompt": "마음 극장 마지막 장면은 어떻게 만들까?",
    "options": [
      {
        "label": "결말까지 미리 정하고 준비하기",
        "letter": "J"
      },
      {
        "label": "흐름을 보며 마지막 장면을 만들어 보기",
        "letter": "P"
      }
    ]
  }
];

export function recommendStoryType(answers){
  if(!Array.isArray(answers)||answers.length!==EXPLORE_QUESTIONS.length)return null;
  const counts={E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0};
  for(let i=0;i<answers.length;i++){
    const selected=answers[i];
    if(selected!==0&&selected!==1)return null;
    counts[EXPLORE_QUESTIONS[i].options[selected].letter]++;
  }
  return (counts.E>counts.I?"E":"I")+(counts.S>counts.N?"S":"N")+(counts.T>counts.F?"T":"F")+(counts.J>counts.P?"J":"P");
}
