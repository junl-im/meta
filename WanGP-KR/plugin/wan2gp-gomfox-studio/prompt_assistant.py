"""곰같은여우 AI 스튜디오 무료 로컬 프롬프트 초안 도우미.

네트워크/LLM/파일 쓰기/모델 변경 없이 텍스트만 구성한다.
"""

from __future__ import annotations


TASK_KINDS = ("영상", "이미지", "음성·음악", "3D")
STYLES = ("사실적·자연스러움", "따뜻함·부드러움", "강렬함·극적 연출", "선명함·깔끔함")
PROFILES = ("절약", "균형", "고품질")

# 무료 예시만 채운다. 원본 모델·설정·생성 작업은 변경하지 않는다.
STARTER_EXAMPLES = {
    "영상": (
        "이른 아침 숲길을 걷는 작은 여우",
        "짧은 한 장면, 부드러운 카메라 이동, 자연스러운 걸음, 아침 안개",
    ),
    "이미지": (
        "햇살이 드는 나무 작업실에서 책을 읽는 여우",
        "따뜻한 색조, 세밀한 배경, 안정적인 구도, 손과 눈의 형태를 자연스럽게",
    ),
    "음성·음악": (
        "조용한 숲속 마을의 포근한 배경음악",
        "잔잔한 피아노와 현악기, 낮은 음량, 짧은 도입부, 부드러운 마무리",
    ),
    "3D": (
        "작은 나무 책상 위에 놓인 도자기 찻잔",
        "물체 한 개, 단색 배경, 형태가 잘 보이는 정면 사진, 도자기 표면 질감",
    ),
}


def fill_example(task_kind: str) -> tuple[str, str]:
    """선택 분야의 편집 가능한 무료 예시를 돌려준다."""
    return STARTER_EXAMPLES.get(task_kind, STARTER_EXAMPLES["이미지"])

TASK_INTROS = {
    "영상": "움직임과 장면 전환이 자연스러운 짧은 영상을 제작해 주세요.",
    "이미지": "완성도 높은 한 장의 이미지를 제작해 주세요.",
    "음성·음악": "원하는 분위기가 드러나는 소리를 제작해 주세요.",
    "3D": "형태와 재질이 분명한 3D 결과물을 제작해 주세요.",
}

TASK_HINTS = {
    "영상": "영상 모델별 권장 프레임·해상도는 다릅니다. 처음에는 짧은 길이와 낮은 해상도를 고르세요.",
    "이미지": "이미지 모델에서 지원하는 작은 해상도와 배치 1개로 먼저 확인하세요.",
    "음성·음악": "짧은 오디오부터 시험하고 음량·발음·리듬을 확인하세요.",
    "3D": "간단한 물체 한 개부터 시작하세요. 메시와 텍스처 단계의 메모리 요구가 다를 수 있습니다.",
}

PROFILE_HINTS = {
    "절약": "절약 시작: 가능한 가벼운 모델, 낮은 해상도, 최소 길이/배치부터. RAM 16GB·낮은 VRAM이면 우선 추천.",
    "균형": "균형 시작: 절약 설정에서 성공한 뒤 해상도나 길이를 한 단계씩 높이세요.",
    "고품질": "고품질 시작: GPU 전용 VRAM과 모델별 권장 사양을 확인한 경우에만 시도하세요.",
}


def _clean(value: str | None, max_chars: int = 360) -> str:
    """대화 상자의 텍스트를 단일 문장에 가까운 안전한 길이로 정돈한다."""
    raw = str(value or "")
    raw = "".join(ch if ch.isprintable() else " " for ch in raw)
    return " ".join(raw.split())[:max_chars].strip()


def build_prompt(
    task_kind: str, subject: str, style: str, extra: str, profile: str
) -> tuple[str, str]:
    """프롬프트와 저사양 팁을 반환한다. 모델/API 호출은 하지 않는다."""
    kind = task_kind if task_kind in TASK_KINDS else "이미지"
    look = style if style in STYLES else STYLES[0]
    level = profile if profile in PROFILES else "절약"
    topic = _clean(subject)
    detail = _clean(extra, 240)

    hint = f"**{level} 모드 안내**\n\n{PROFILE_HINTS[level]}\n\n{TASK_HINTS[kind]}"
    if not topic:
        return "먼저 만들고 싶은 장면·물체·소리를 입력해 주세요.", hint

    lines = [
        TASK_INTROS[kind],
        f"주제: {topic}",
        f"표현 분위기: {look}",
    ]
    if detail:
        lines.append(f"추가 조건: {detail}")
    if kind == "영상":
        lines.append("장면의 움직임과 피사체가 일관되게 보이도록 해 주세요.")
    elif kind == "3D":
        lines.append("주요 형태와 표면 재질이 잘 구분되도록 해 주세요.")
    elif kind == "음성·음악":
        lines.append("소리의 분위기와 흐름이 자연스럽게 이어지도록 해 주세요.")
    else:
        lines.append("주요 대상이 명확하고 구도가 안정되도록 해 주세요.")
    return "\n".join(lines), hint
