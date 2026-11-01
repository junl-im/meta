"""곰같은여우의 AI 스튜디오 — WanGP의 원본 엔진을 수정하지 않는 한국어 작업실.

현재 개발 버전:
- 무료 로컬 모드가 기본. 외부 LLM/API 로그인 없이 WanGP 본래 화면으로 이동한다.
- 감독은 필요할 때 사용자가 명시적으로 선택한다.
- Deepy Prime의 공식 플러그인 호출 경로를 사용한다. 선택된 LLM이 Codex인지
  WanGP Configuration에서 확인해야 하며, ChatGPT 대화창 직접 연결은 별도다.
- GPU 생성, 모델 설정, 저VRAM 관리 기능을 직접 재구현하거나 변경하지 않는다.
"""

from __future__ import annotations

import gradio as gr

from shared.utils.plugins import WAN2GPPlugin


APP_TITLE = "곰같은여우의 AI 스튜디오"
TAB_ID = "GomFoxStudio"


class GomFoxStudioPlugin(WAN2GPPlugin):
    def __init__(self):
        super().__init__()
        self.name = APP_TITLE
        self.version = "0.1.0-dev"
        self.description = "기본 무료 로컬 제작, GPT 감독은 선택하는 한국어 작업실"

    def setup_ui(self):
        self.request_component("state")
        self.request_component("main_tabs")
        self.add_tab(
            tab_id=TAB_ID,
            label=APP_TITLE,
            component_constructor=self.create_ui,
        )

    def _send_optional_director_request(self, prompt: str, consent: bool) -> str:
        # 원격 엔진의 자격 정보는 WanGP나 플러그인이 읽거나 저장하지 않는다.
        if not consent:
            raise gr.Error("감독 기능은 선택 사항입니다. 연결 및 전송 안내를 확인하고 직접 체크해 주세요.")

        prompt = (prompt or "").strip()
        if not prompt:
            raise gr.Error("감독에게 요청할 내용을 한글로 입력해 주세요.")

        try:
            deepy = self.deepy
        except RuntimeError as error:
            raise gr.Error(f"감독 연결을 사용할 수 없습니다: {error}") from error

        if deepy.unavailable_reason:
            raise gr.Error(str(deepy.unavailable_reason))
        if deepy.deepy_type != "prime":
            raise gr.Error("자동 감독에는 Deepy Prime이 필요합니다. 설정에서 Prime을 선택해 주세요.")

        # 공식 sample 플러그인의 Deepy 작업/이벤트 소비 패턴을 따른다.
        # GPT 선택 여부는 WanGP의 LLM Engine 설정에서 사용자가 직접 확인한다.
        with deepy.run(prompt, workspace="current") as job:
            for _ in job.events():
                pass
            result = job.result()

        if result.status == "error":
            raise gr.Error(str(result.error or "감독 작업 중 오류가 발생했습니다."))
        if result.cancelled:
            return "감독 작업이 중단됐습니다. 무료 로컬 모드에는 영향이 없습니다."

        generated = []
        for item in (result.outputs or []):
            if isinstance(item, dict):
                name = str(item.get("name") or "").strip()
                if name:
                    generated.append(name)

        if generated:
            visible = "\n".join(f"- {name}" for name in generated[:10])
            return "감독 작업이 완료됐습니다. 원본 WanGP 갤러리에서 결과를 확인하세요.\n" + visible

        return "감독 작업이 완료됐습니다. 상세 진행 내용은 원본 Deepy 대화에서 확인해 주세요."

    def create_ui(self):
        with gr.Column():
            gr.Markdown(f"# {APP_TITLE}")
            gr.Markdown(
                "**기본 모드: 무료 로컬 제작**  \\n"
                "원본 WanGP가 제공하는 영상·이미지·음성·3D 모델과 "
                "저VRAM 설정을 그대로 사용합니다. GPT·Claude·외부 생성 API는 필수가 아닙니다."
            )
            gr.Markdown(
                "**주의:** 실제 생성 가능 모델·속도·화질은 그래픽카드와 VRAM에 따라 달라집니다. "
                "개인용 WanGP 사용은 라이선스 조건을 따릅니다."
            )

            open_generator = gr.Button("원본 무료 제작 화면 열기", variant="primary")

            with gr.Accordion("선택 기능: GPT / Deepy Prime 감독", open=False):
                gr.Markdown(
                    "GPT를 쓰고 싶을 때만 원본 **설정 → Prompt Enhancer / Deepy**에서 "
                    "**Codex**와 **Deepy Prime**을 선택해 주세요. 이 작업실에서는 "
                    "설정을 임의로 변경하거나 자동 로그인하지 않습니다. "
                    "외부 LLM을 쓰면 프롬프트·참조 이미지·영상 프레임 등이 "
                    "서비스 제공자에게 전송될 수 있습니다."
                )
                instruction = gr.Textbox(
                    label="감독에게 요청할 내용",
                    placeholder="예: 한국어로 짧은 광고 영상의 장면 구성을 제안하고, 작업 전 내 승인을 요청해 줘.",
                    lines=4,
                )
                consent = gr.Checkbox(
                    label="내가 직접 감독 기능을 켰고, WanGP에서 선택한 LLM 엔진 및 데이터 전송 가능성을 확인했습니다.",
                    value=False,
                )
                submit = gr.Button("선택한 감독에게 요청하기")
                outcome = gr.Textbox(
                    label="진행 결과",
                    value="선택 기능을 켜기 전에는 외부 감독 요청이 발생하지 않습니다.",
                    lines=5,
                    interactive=False,
                )

            gr.Markdown(
                "원본 WanGP의 고급 설정, Showrunner, Media Flow, 작업 큐, 갤러리는 "
                "기존 화면에서 계속 이용할 수 있습니다. "
                "이 플러그인은 해당 기능을 제거하거나 대체하지 않습니다."
            )

        open_generator.click(
            fn=self.goto_media_tab,
            inputs=[self.state],
            outputs=[self.main_tabs],
        )
        submit.click(
            fn=self._send_optional_director_request,
            inputs=[instruction, consent],
            outputs=[outcome],
        )
