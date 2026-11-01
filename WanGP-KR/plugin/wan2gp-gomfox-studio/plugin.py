"""곰같은여우의 AI 스튜디오: 원본 WanGP 기능을 보존하는 한국어 시작 화면.

이 플러그인은 원본 생성 엔진, 모델, VRAM 정책을 변경하지 않는다.
무료 로컬 시작이 기본이며 GPT/Deepy 요청은 명시적 사용자 동의를 요구한다.
"""

from __future__ import annotations

from pathlib import Path

import gradio as gr

from shared.utils.plugins import WAN2GPPlugin

from .catalog import format_model_catalog
from .hardware import read_hardware_report
from .help_content import TOPICS, render_guide


APP_TITLE = "곰같은여우의 AI 스튜디오"
TAB_ID = "GomFoxStudio"
HERO_FILE = Path(__file__).resolve().parent / "studio-hero.png"

# 새 UI 전용 CSS. SVG/외부 폰트/스크립트/원격 CDN에 의존하지 않는다.
STUDIO_STYLE = """
<style>
#gfs-root {--gfs-blue:#162b50; --gfs-gold:#f3ab66;}
#gfs-root .gfs-kicker {font-size:12px;font-weight:800;letter-spacing:.13em;color:#e99959;margin-bottom:3px}
#gfs-root .gfs-intro {font-size:15px;line-height:1.6;color:var(--body-text-color,inherit);opacity:.86}
#gfs-root .gfs-chip {display:inline-block;margin:3px 7px 5px 0;padding:6px 11px;border-radius:999px;background:rgba(67,139,141,.15);font-size:12px;font-weight:700}
#gfs-root .gfs-chip.gfs-note {background:rgba(235,145,77,.14)}
#gfs-root .gfs-panel {padding:16px 18px;border-radius:17px;background:linear-gradient(128deg,rgba(53,117,128,.11),rgba(232,159,95,.09));border:1px solid rgba(128,148,166,.23)}
#gfs-root .gfs-panel h3 {margin:0 0 6px;font-size:19px}
#gfs-root .gfs-panel p {margin:5px 0;line-height:1.6}
#gfs-root .gfs-steps {font-size:14px;opacity:.88;line-height:1.7}
#gfs-root #gfs-banner img {border-radius:22px;object-fit:cover;object-position:center;max-height:235px}
#gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:88px;border-radius:16px;font-size:16px;font-weight:750;white-space:pre-line;padding:13px 9px}
#gfs-root #gfs-category-video {background:linear-gradient(145deg,#284a78,#1a3359);color:#fff;border-color:#42608a}
#gfs-root #gfs-category-image {background:linear-gradient(145deg,#8b597c,#634767);color:#fff;border-color:#986987}
#gfs-root #gfs-category-audio {background:linear-gradient(145deg,#267875,#21565f);color:#fff;border-color:#438c88}
#gfs-root #gfs-category-3d {background:linear-gradient(145deg,#946f4f,#78523d);color:#fff;border-color:#a47b5a}
#gfs-root #gfs-launch {min-height:49px;border-radius:13px;font-weight:800}
#gfs-root .gfs-muted {font-size:12px;opacity:.75}
@media (max-width:740px) {
  #gfs-root #gfs-banner img {max-height:145px;border-radius:15px}
  #gfs-root .gfs-panel {padding:12px}
  #gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:67px;font-size:14px;padding:7px}
}
</style>
"""


class GomFoxStudioPlugin(WAN2GPPlugin):
    def __init__(self):
        super().__init__()
        self.name = APP_TITLE
        self.version = "0.5.0-dev"
        self.description = "무료 로컬 제작 중심 한국어 대시보드 · GPT 감독 선택"

    def setup_ui(self):
        self.request_component("state")
        self.request_component("main_tabs")
        self.add_tab(tab_id=TAB_ID, label=APP_TITLE, component_constructor=self.create_ui)

    def _send_optional_director_request(self, prompt: str, consent: bool) -> str:
        if not consent:
            raise gr.Error("GPT 감독은 선택 사항입니다. 안내를 확인하고 직접 동의해 주세요.")
        prompt = (prompt or "").strip()
        if not prompt:
            raise gr.Error("감독에게 요청할 내용을 입력해 주세요.")

        try:
            deepy = self.deepy
        except RuntimeError as error:
            raise gr.Error(f"감독 연결을 사용할 수 없습니다: {error}") from error
        if deepy.unavailable_reason:
            raise gr.Error(str(deepy.unavailable_reason))
        if deepy.deepy_type != "prime":
            raise gr.Error("감독 기능에는 Deepy Prime이 필요합니다. 원본 설정을 확인해 주세요.")

        with deepy.run(prompt, workspace="current") as job:
            for _ in job.events():
                pass
            result = job.result()

        if result.status == "error":
            raise gr.Error(str(result.error or "감독 작업 중 오류가 발생했습니다."))
        if result.cancelled:
            return "감독 작업이 중단됐습니다. 무료 로컬 제작은 그대로 사용할 수 있습니다."

        generated = []
        for item in (result.outputs or []):
            if isinstance(item, dict):
                name = str(item.get("name") or "").strip()
                if name:
                    generated.append(name)
        if generated:
            return "감독 작업이 완료됐습니다. 원본 WanGP 갤러리에서 결과를 확인하세요.\n" + "\n".join(
                f"- {name}" for name in generated[:10]
            )
        return "감독 작업이 완료됐습니다. 세부 진행 내역은 원본 Deepy 대화에서 확인해 주세요."

    def create_ui(self, api_session=None):
        with gr.Column(elem_id="gfs-root"):
            gr.HTML(STUDIO_STYLE)
            if HERO_FILE.is_file():
                gr.Image(
                    value=str(HERO_FILE), height=225, interactive=False,
                    show_label=False, show_download_button=False,
                    show_fullscreen_button=False, container=False,
                    elem_id="gfs-banner",
                )
            gr.HTML('<div class="gfs-kicker">GOMFOX CREATIVE WORKSPACE</div>')
            gr.Markdown(f"# {APP_TITLE}")
            gr.HTML(
                '<div class="gfs-intro">처음에는 간단하게, 익숙해지면 원본 WanGP의 전문 기능까지. '
                '필요한 작업을 골라 무료 로컬 제작 화면에서 시작하세요.</div>'
                '<span class="gfs-chip">무료 로컬 기본</span>'
                '<span class="gfs-chip">Windows 16GB 배려</span>'
                '<span class="gfs-chip gfs-note">GPT는 선택 · 기본 꺼짐</span>'
            )

            with gr.Tabs(elem_id="gfs-section-tabs"):
                with gr.Tab("무료 제작 · 시작"):
                    gr.HTML(
                        '<div class="gfs-panel"><h3>무엇을 만들고 싶나요?</h3>'
                        '<p>아래에서 작업을 선택하면 사용 순서를 알려드립니다. '
                        '실제 생성은 원본 WanGP에서 진행됩니다.</p>'
                        '<div class="gfs-steps">① 작업 고르기　② 설명 확인　③ 무료 제작 화면 열기</div></div>'
                    )
                    with gr.Row(equal_height=True):
                        video_button = gr.Button("영상 제작\n움직이는 장면", elem_id="gfs-category-video")
                        image_button = gr.Button("이미지 제작\n사진과 그림", elem_id="gfs-category-image")
                    with gr.Row(equal_height=True):
                        audio_button = gr.Button("음성 · 음악\n소리 만들기", elem_id="gfs-category-audio")
                        model3d_button = gr.Button("3D · 월드\n입체와 장면", elem_id="gfs-category-3d")
                    task_guide = gr.Markdown(value=render_guide("처음 시작"))
                    open_generator = gr.Button(
                        "원본 WanGP 무료 제작 화면 열기", variant="primary", elem_id="gfs-launch"
                    )
                    gr.Markdown(
                        "원본 화면에서 **모델과 생성 설정을 직접 선택**해야 합니다. "
                        "모든 모델을 저사양 PC에서 실행할 수 있는 것은 아닙니다. "
                        "원본 **작업 큐·갤러리·Media Flow·Showrunner·LoRA**는 그대로 유지됩니다."
                    )

                with gr.Tab("처음 사용자 도움말"):
                    gr.Markdown("**처음 시작**부터 읽고 필요한 주제를 선택하세요. 어려운 용어도 한글로 풀이합니다.")
                    guide_topic = gr.Dropdown(
                        choices=list(TOPICS), value="처음 시작", label="도움말 주제"
                    )
                    guide_display = gr.Markdown(value=render_guide("처음 시작"))

                with gr.Tab("모델 찾아보기"):
                    gr.Markdown(
                        "원본 모델 정보를 **읽기만** 합니다. 조회해도 모델 다운로드나 GPU 생성은 시작되지 않습니다."
                    )
                    with gr.Row():
                        kind_choice = gr.Dropdown(
                            choices=["전체", "영상", "이미지", "음성", "3D", "월드", "기타"],
                            value="전체", label="분야",
                        )
                        name_query = gr.Textbox(label="이름 검색", placeholder="예: Wan, Flux, Qwen")
                    page_choice = gr.Number(label="페이지 (40개씩)", value=1, precision=0)
                    catalog_refresh = gr.Button("원본 모델 목록 조회")
                    catalog_output = gr.Textbox(
                        label="검색 결과", lines=12, interactive=False,
                        value="버튼을 누르면 설치된 WanGP의 원본 모델 목록을 읽습니다.",
                    )

                with gr.Tab("내 PC · 저사양 안내"):
                    gr.HTML(
                        '<div class="gfs-panel"><h3>내 컴퓨터가 감당할 수 있는 작업부터</h3>'
                        '<p>RAM 16GB라도 VRAM과 GPU 종류에 따라 가능한 모델이 달라집니다. '
                        '프로필은 안내일 뿐, 원본의 설정을 임의로 바꾸지 않습니다.</p></div>'
                    )
                    gr.Markdown(
                        "**절약 시작:** 작은 모델, 짧은 영상, 낮은 해상도부터 시도\n\n"
                        "**균형 사용:** 작업이 정상 실행되면 프레임과 해상도를 조금씩 올리기\n\n"
                        "**고품질 사용:** GPU·VRAM 여유가 실측 확인된 경우에만 도전"
                    )
                    hardware_check = gr.Button("이 PC의 GPU · 메모리 확인")
                    hardware_result = gr.Textbox(
                        label="사양 보고서와 시작 권장 사항", lines=10, interactive=False,
                        value="조회 전입니다. 버튼을 눌러 확인할 수 있습니다.",
                    )
                    gr.Markdown(render_guide("저사양 설정"))

                with gr.Tab("GPT 감독 · 선택"):
                    gr.Markdown(
                        "**기본 무료 제작에는 GPT가 필요하지 않습니다.**\n\n"
                        "필요할 때만 원본 **Configuration → Prompt Enhancer / Deepy**에서 "
                        "**Codex** 및 **Deepy Prime**을 선택하세요. "
                        "ChatGPT 대화창을 직접 조종하는 기능은 별도 연결 검증이 필요합니다.\n\n"
                        "원격 AI 사용 시 프롬프트나 참조 미디어가 외부로 전송될 수 있으며, "
                        "계정 사용량 제한 또는 요금이 적용될 수 있습니다."
                    )
                    instruction = gr.Textbox(
                        label="선택 감독에게 요청", lines=4,
                        placeholder="예: 20초짜리 짧은 영상의 장면 구성을 한국어로 기획해 줘.",
                    )
                    consent = gr.Checkbox(
                        label="내가 직접 GPT 감독 기능을 선택했고 외부 전송 가능성을 확인했습니다.",
                        value=False,
                    )
                    submit = gr.Button("동의 후 선택 감독 실행")
                    outcome = gr.Textbox(
                        label="감독 결과", lines=5, interactive=False,
                        value="기본 상태에서는 감독 요청이 전송되지 않습니다.",
                    )

            gr.HTML(
                '<div class="gfs-muted">원본 WanGP 엔진과 고급 기능은 변경하지 않습니다. '
                '이 화면은 Windows 실기 테스트 이전의 개발판입니다.</div>'
            )

        video_button.click(fn=lambda: render_guide("짧은 영상"), inputs=[], outputs=[task_guide])
        image_button.click(fn=lambda: render_guide("사진·그림"), inputs=[], outputs=[task_guide])
        audio_button.click(fn=lambda: render_guide("목소리·음악"), inputs=[], outputs=[task_guide])
        model3d_button.click(fn=lambda: render_guide("3D 만들기"), inputs=[], outputs=[task_guide])
        open_generator.click(
            fn=self.goto_media_tab, inputs=[self.state], outputs=[self.main_tabs]
        )
        guide_topic.change(fn=render_guide, inputs=[guide_topic], outputs=[guide_display])
        hardware_check.click(fn=read_hardware_report, inputs=[], outputs=[hardware_result])
        catalog_refresh.click(
            fn=lambda kind, query, page: format_model_catalog(api_session, kind, query, page),
            inputs=[kind_choice, name_query, page_choice], outputs=[catalog_output],
        )
        submit.click(
            fn=self._send_optional_director_request, inputs=[instruction, consent], outputs=[outcome]
        )
