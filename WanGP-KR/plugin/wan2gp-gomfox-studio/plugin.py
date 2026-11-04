"""곰같은여우의 AI 스튜디오: 원본 WanGP 기능을 보존하는 한국어 시작 화면.

이 플러그인은 원본 생성 엔진, 모델, VRAM 정책을 변경하지 않는다.
무료 로컬 시작이 기본이며 GPT/Deepy 요청은 명시적 사용자 동의를 요구한다.
"""

from __future__ import annotations

import base64
from pathlib import Path

import gradio as gr

from shared.utils.plugins import WAN2GPPlugin

from .catalog import format_model_catalog, format_model_details, format_queue_status
from .hardware import read_hardware_report
from .help_content import TOPICS, render_guide
from .prompt_assistant import TASK_KINDS, STYLES, PROFILES, build_prompt, fill_example
from .studio_check import format_studio_readiness


APP_TITLE = "곰같은여우의 AI 스튜디오"
TAB_ID = "GomFoxStudio"
HERO_FILE = Path(__file__).resolve().parent / "studio-hero.png"
ICON_FILE = Path(__file__).resolve().parent / "gomfox-studio-icon.png"
CATEGORY_ART = {
    "video": Path(__file__).resolve().parent / "category-video.webp",
    "image": Path(__file__).resolve().parent / "category-image.webp",
    "audio": Path(__file__).resolve().parent / "category-audio.webp",
    "3d": Path(__file__).resolve().parent / "category-3d.webp",
}


def category_art_css() -> str:
    """Embed only our four small, local WebP cards; no network or file URL needed."""
    rules = []
    for category, artwork in CATEGORY_ART.items():
        try:
            # Guard UI rendering from a missing, damaged or unexpectedly large asset.
            if not artwork.is_file() or not 0 < artwork.stat().st_size < 512_000:
                continue
            payload = artwork.read_bytes()
            if payload[:4] != b"RIFF" or payload[8:12] != b"WEBP":
                continue
        except OSError:
            continue  # Existing gradients remain as an offline fallback.
        content = base64.b64encode(payload).decode("ascii")
        rules.append(
            f"#gfs-root #gfs-category-{category} {{"
            f"background-image:linear-gradient(90deg,rgba(7,17,31,.24),transparent 80%),"
            f"url('data:image/webp;base64,{content}') !important;"
            "background-position:center !important;background-size:cover !important;}"
        )
    return "<style>" + "".join(rules) + "</style>" if rules else ""

# 새 UI 전용 CSS. SVG/외부 폰트/스크립트/원격 CDN에 의존하지 않는다.
STUDIO_STYLE = """
<style>
#gfs-root {--gfs-blue:#162b50; --gfs-gold:#f3ab66; width:100%;max-width:1180px;margin:0 auto}
#gfs-root * {box-sizing:border-box}
#gfs-root #gfs-section-tabs {min-width:0}
#gfs-root #gfs-section-tabs .tab-nav {overflow-x:auto;scrollbar-width:thin;scrollbar-color:rgba(151,162,172,.55) transparent}
#gfs-root #gfs-section-tabs .tab-nav button {white-space:nowrap;min-height:44px}
#gfs-root button:focus-visible {outline:3px solid #e4aa63;outline-offset:2px}
#gfs-root #gfs-brand-row {align-items:center;gap:12px}
#gfs-root #gfs-brand-icon {max-width:88px;flex:0 0 78px;align-self:center}
#gfs-root #gfs-brand-icon img {width:78px;height:78px;object-fit:contain}
#gfs-root .gfs-kicker {font-size:12px;font-weight:800;letter-spacing:.13em;color:#e99959;margin-bottom:3px}
#gfs-root .gfs-intro {font-size:15px;line-height:1.6;color:var(--body-text-color,inherit);opacity:.86}
#gfs-root .gfs-chip {display:inline-block;margin:3px 7px 5px 0;padding:6px 11px;border-radius:999px;background:rgba(67,139,141,.15);font-size:12px;font-weight:700}
#gfs-root .gfs-chip.gfs-note {background:rgba(235,145,77,.14)}
#gfs-root .gfs-panel {padding:16px 18px;border-radius:17px;background:linear-gradient(128deg,rgba(53,117,128,.11),rgba(232,159,95,.09));border:1px solid rgba(128,148,166,.23)}
#gfs-root .gfs-panel h3 {margin:0 0 6px;font-size:19px}
#gfs-root .gfs-panel p {margin:5px 0;line-height:1.6}
#gfs-root .gfs-steps {font-size:14px;opacity:.88;line-height:1.7}
#gfs-root #gfs-banner img {border-radius:22px;object-fit:cover;object-position:center;max-height:235px}
#gfs-root #gfs-category-grid {gap:13px}
#gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:154px;border:0;border-radius:16px;font-size:20px;font-weight:850;line-height:1.45;white-space:pre-line;text-align:left;padding:20px 23px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.68);box-shadow:0 8px 17px rgba(9,20,35,.18);transition:transform .16s ease,box-shadow .16s ease}
#gfs-root #gfs-category-video {background:radial-gradient(circle at 90% 17%,rgba(133,194,232,.29),transparent 38%),linear-gradient(145deg,#315982,#162e51);color:#fff;border-color:#6483a2}
#gfs-root #gfs-category-image {background:radial-gradient(circle at 91% 22%,rgba(247,192,221,.27),transparent 38%),linear-gradient(145deg,#875a79,#553a62);color:#fff;border-color:#aa7896}
#gfs-root #gfs-category-audio {background:radial-gradient(circle at 90% 20%,rgba(147,235,209,.25),transparent 38%),linear-gradient(145deg,#277e7a,#1b515c);color:#fff;border-color:#5b9f97}
#gfs-root #gfs-category-3d {background:radial-gradient(circle at 90% 20%,rgba(242,194,127,.32),transparent 38%),linear-gradient(145deg,#96714f,#61422f);color:#fff;border-color:#b28b6d}
#gfs-root #gfs-category-video:hover,#gfs-root #gfs-category-image:hover,#gfs-root #gfs-category-audio:hover,#gfs-root #gfs-category-3d:hover {transform:translateY(-2px);box-shadow:0 12px 23px rgba(12,22,42,.25)}
@media (prefers-reduced-motion:reduce) {#gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {transition:none}}
#gfs-root #gfs-launch {min-height:49px;border-radius:13px;font-weight:800}
#gfs-root #gfs-preflight-panel {border:0;border-radius:14px;background:rgba(64,112,119,.10);margin-top:5px}
#gfs-root #gfs-preflight-check,#gfs-root #gfs-preflight-hardware {border:0;border-radius:11px;min-height:43px;font-weight:750}
#gfs-root #gfs-preflight-result textarea {font-size:13px;line-height:1.6}
#gfs-root #gfs-copy {border-radius:12px;font-weight:750}
#gfs-root #gfs-example {border-radius:12px;font-weight:750;border:1px solid rgba(210,154,99,.42);background:linear-gradient(135deg,rgba(239,182,111,.19),rgba(97,151,151,.14))}
#gfs-root #gfs-compose {min-height:44px;background:linear-gradient(130deg,#2b746f,#205f68);color:#fff;border-radius:12px;font-weight:800}
#gfs-root #gfs-prompt-box textarea {line-height:1.55;font-size:14px}
#gfs-root .gfs-workshop {padding:14px 17px;border-radius:16px;border:1px solid rgba(122,151,153,.25);background:linear-gradient(125deg,rgba(66,125,129,.15),rgba(235,163,103,.12))}
#gfs-root .gfs-workshop h3 {font-size:18px;margin:0 0 4px}
#gfs-root .gfs-workshop p {margin:0;opacity:.85}

#gfs-root #gfs-queue-refresh,#gfs-root #gfs-model-inspect {border-radius:12px;font-weight:750}
#gfs-root .gfs-status {padding:14px 16px;border-radius:14px;border:1px solid rgba(105,152,148,.28);background:linear-gradient(120deg,rgba(53,112,123,.15),rgba(236,171,106,.09))}
#gfs-root .gfs-status strong {color:var(--gfs-gold)}
#gfs-root .gfs-muted {font-size:12px;opacity:.75}
@media (max-width:740px) {
  #gfs-root #gfs-banner img {max-height:122px;border-radius:15px}
  #gfs-root #gfs-brand-row {gap:7px}
  #gfs-root #gfs-brand-icon {max-width:50px;flex:0 0 48px}
  #gfs-root #gfs-brand-icon img {width:48px;height:48px}
  #gfs-root .gfs-kicker {font-size:10px;letter-spacing:.06em}
  #gfs-root .gfs-intro {font-size:13px;line-height:1.4}
  #gfs-root .gfs-chip {font-size:10px;padding:4px 7px;margin:3px 4px 3px 0}
  #gfs-root .gfs-panel {padding:11px 12px;border-radius:13px}
  #gfs-root .gfs-panel h3 {font-size:16px}
  #gfs-root .gfs-steps {font-size:12px}
  #gfs-root #gfs-category-grid {gap:7px}
  #gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:106px;font-size:14px;padding:13px;border-radius:12px}
}
@media (max-width:740px) and (max-height:740px) {
  #gfs-root #gfs-banner img {max-height:92px}
  #gfs-root #gfs-brand-icon img {width:40px;height:40px}
  #gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:89px}
}
</style>
"""


class GomFoxStudioPlugin(WAN2GPPlugin):
    def __init__(self):
        super().__init__()
        self.name = APP_TITLE
        self.version = "0.14.0-dev"
        self.description = "전용 원화·시작 점검·저사양 첫 제작 순서가 있는 무료 로컬 제작실 · GPT 선택"

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
            gr.HTML(STUDIO_STYLE + category_art_css())
            if HERO_FILE.is_file():
                gr.Image(
                    value=str(HERO_FILE), height=225, interactive=False,
                    show_label=False, show_download_button=False,
                    show_fullscreen_button=False, container=False,
                    elem_id="gfs-banner",
                )
            with gr.Row(elem_id="gfs-brand-row"):
                if ICON_FILE.is_file():
                    gr.Image(
                        value=str(ICON_FILE), height=78, width=78,
                        interactive=False, show_label=False,
                        show_download_button=False, show_fullscreen_button=False,
                        container=False, elem_id="gfs-brand-icon",
                    )
                with gr.Column():
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
                        '<p>원하는 그림 카드를 누르면 사용 순서가 나타나요. '
                        '처음이라면 다음 탭의 따라 하기도 확인해 보세요.</p>'
                        '<div class="gfs-steps">① 작업 선택　② 설명 확인　③ 원본 무료 제작 화면 열기</div></div>'
                    )
                    with gr.Row(equal_height=True, elem_id="gfs-category-grid"):
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
                    with gr.Accordion(
                        "시작 전 확인 · 처음이라면 눌러 보세요 (선택)",
                        open=False, elem_id="gfs-preflight-panel",
                    ):
                        gr.Markdown("파일과 원본 연결·PC 사양을 **읽기만** 합니다. 모델 다운로드·생성·GPT 연결은 시작하지 않습니다.")
                        with gr.Row():
                            preflight_check = gr.Button(
                                "스튜디오 준비 상태 확인", elem_id="gfs-preflight-check"
                            )
                            preflight_hardware = gr.Button(
                                "내 PC RAM·GPU 확인", elem_id="gfs-preflight-hardware"
                            )
                        preflight_result = gr.Textbox(
                            label="확인 결과", lines=8, interactive=False,
                            value="위 버튼 중 하나를 누르면 안전한 읽기 전용 결과가 나타납니다.",
                            elem_id="gfs-preflight-result",
                        )

                with gr.Tab("처음 실행 · 따라 하기"):
                    gr.HTML(
                        '<div class="gfs-panel"><h3>반가워요! 첫 작품을 함께 만들어 봐요.</h3>'
                        '<p>원본 WanGP를 처음 설치한 분을 위한 안내예요. '
                        '무료 로컬 기능부터 시작하고, GPT 연결은 건너뛰어도 됩니다.</p>'
                        '<div class="gfs-steps">① 작업 고르기　② PC 사양 확인　③ 원본 제작 시작</div></div>'
                    )
                    welcome_topic = gr.Dropdown(
                        choices=["처음 시작", "사진·그림", "짧은 영상", "목소리·음악", "3D 만들기"],
                        value="처음 시작", label="1단계 · 어떤 작품을 만들까요?",
                    )
                    welcome_guide = gr.Markdown(value=render_guide("처음 시작"))
                    welcome_hardware = gr.Button("2단계 · 내 PC 사양 살펴보기 (읽기 전용)")
                    welcome_report = gr.Textbox(
                        label="이 컴퓨터의 RAM · GPU 안내", lines=7, interactive=False,
                        value="원하면 위 버튼을 누르세요. 확인을 건너뛰어도 무료 제작을 시작할 수 있습니다.",
                    )
                    welcome_start = gr.Button(
                        "3단계 · 무료 제작 화면으로 이동", variant="primary", elem_id="gfs-welcome-start"
                    )
                    gr.Markdown(
                        "처음에는 **이미지 한 장 또는 짧은 저해상도 영상**부터 시험해 보세요. "
                        "모델 다운로드·생성은 원본 WanGP에서 직접 선택합니다. "
                        "이 안내 화면은 PC 설정을 자동 변경하지 않습니다."
                    )

                with gr.Tab("프롬프트 작업실"):
                    gr.HTML(
                        '<div class="gfs-workshop"><h3>무료 프롬프트 초안 만들기</h3>'
                        '<p>무엇을 만들고 싶은지만 적어 보세요. 로컬에서 문장을 다듬고 '
                        '원본 WanGP에 직접 복사해 사용할 수 있어요. GPT 연결·GPU 사용 없음.</p></div>'
                    )
                    with gr.Row():
                        prompt_kind = gr.Dropdown(
                            choices=list(TASK_KINDS), value="이미지", label="제작 분야"
                        )
                        prompt_style = gr.Dropdown(
                            choices=list(STYLES), value=STYLES[0], label="분위기"
                        )
                        prompt_profile = gr.Dropdown(
                            choices=list(PROFILES), value="절약", label="시작 모드"
                        )
                    prompt_subject = gr.Textbox(
                        label="무엇을 만들까요?", lines=2,
                        placeholder="예: 초록 숲에서 작은 여우가 책을 읽는 장면",
                    )
                    prompt_extra = gr.Textbox(
                        label="추가 조건 (선택)", lines=2,
                        placeholder="예: 아침 햇살, 부드러운 카메라 이동, 원본 색감 유지",
                    )
                    prompt_example = gr.Button(
                        "처음이라면 예시 넣기 · 직접 수정 가능", elem_id="gfs-example"
                    )
                    gr.Markdown("**사용법:** 분야를 고르고 예시를 넣은 뒤, 원하는 부분만 바꿔 보세요. 예시 입력만으로 생성이 시작되지는 않습니다.")
                    prompt_compose = gr.Button(
                        "무료 프롬프트 만들기", variant="primary", elem_id="gfs-compose"
                    )
                    prompt_result = gr.Textbox(
                        label="완성한 초안",
                        lines=7, interactive=False,
                        elem_id="gfs-prompt-box",
                        value="주제를 입력하고 무료 프롬프트 만들기를 눌러 주세요.",
                    )
                    prompt_copy = gr.Button("프롬프트 한 번에 복사", elem_id="gfs-copy")
                    prompt_copy_status = gr.Markdown(
                        value="복사 버튼이 동작하지 않는 브라우저라면 문장을 직접 선택해 복사하세요."
                    )
                    prompt_advice = gr.Markdown(
                        value="**절약 모드:** 작은 모델·짧은 길이·낮은 해상도부터 시험하세요."
                    )
                    prompt_open = gr.Button("복사한 프롬프트로 원본 제작 화면 열기")
                    gr.Markdown(
                        "복사한 문장은 원본의 프롬프트 입력칸에 직접 붙여넣으세요. "
                        "기존 원본 프롬프트나 생성 설정을 덮어쓰지 않습니다. "
                        "모드 선택은 **추천 안내**이며 GPU 설정을 자동으로 바꾸지 않습니다."
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
                    gr.Markdown(
                        "**모델 상세 보기:** 위 목록에 표시된 대괄호 안의 원본 모델 ID를 입력하세요. "
                        "지원 기능과 파일 준비 상태를 원본에서 조회합니다."
                    )
                    with gr.Row():
                        model_id_input = gr.Textbox(
                            label="원본 모델 ID", placeholder="예: qwen_image_20B"
                        )
                        model_inspect = gr.Button(
                            "모델 정보 확인", elem_id="gfs-model-inspect"
                        )
                    model_detail = gr.Textbox(
                        label="모델 상세·파일 상태 (읽기 전용)",
                        lines=9, interactive=False,
                        value="모델 ID를 입력한 뒤 모델 정보 확인을 눌러 주세요.",
                    )

                with gr.Tab("작업 현황 · 갤러리"):
                    gr.HTML(
                        '<div class="gfs-status"><strong>원본 WanGP 공용 작업 큐</strong>'
                        '<p>지금 실행 중이거나 대기 중인 작업을 조회할 수 있어요. '
                        '새로고침을 눌러야 최신 상태가 나타납니다.</p></div>'
                    )
                    queue_prompts = gr.Checkbox(
                        label="작업 내용(프롬프트)도 표시하기 · 기본 숨김", value=False
                    )
                    queue_refresh = gr.Button(
                        "현재 작업 상태 새로고침", elem_id="gfs-queue-refresh"
                    )
                    queue_result = gr.Textbox(
                        label="원본 큐 현황 (읽기 전용)", lines=10, interactive=False,
                        value="현재 작업 상태 새로고침을 눌러 주세요.",
                    )
                    gallery_open = gr.Button(
                        "원본 WanGP 제작·갤러리 화면으로 이동", variant="primary"
                    )
                    gr.Markdown(
                        "이 화면에서는 **조회만** 합니다. 작업 삭제·중단·재실행을 하지 않습니다. "
                        "진행률(%)과 완료 결과 썸네일은 원본 WanGP의 제작·갤러리 화면에서 확인하세요. "
                        "원본 큐 API가 제공되지 않는 이전 버전에서는 안내 문구만 표시됩니다."
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

        welcome_topic.change(fn=render_guide, inputs=[welcome_topic], outputs=[welcome_guide])
        welcome_hardware.click(fn=read_hardware_report, inputs=[], outputs=[welcome_report])
        welcome_start.click(fn=self.goto_media_tab, inputs=[self.state], outputs=[self.main_tabs])
        video_button.click(fn=lambda: render_guide("짧은 영상"), inputs=[], outputs=[task_guide])
        image_button.click(fn=lambda: render_guide("사진·그림"), inputs=[], outputs=[task_guide])
        audio_button.click(fn=lambda: render_guide("목소리·음악"), inputs=[], outputs=[task_guide])
        model3d_button.click(fn=lambda: render_guide("3D 만들기"), inputs=[], outputs=[task_guide])
        open_generator.click(
            fn=self.goto_media_tab, inputs=[self.state], outputs=[self.main_tabs]
        )
        preflight_check.click(
            fn=lambda: format_studio_readiness(api_session), inputs=[], outputs=[preflight_result]
        )
        preflight_hardware.click(
            fn=read_hardware_report, inputs=[], outputs=[preflight_result]
        )
        prompt_example.click(
            fn=fill_example,
            inputs=[prompt_kind], outputs=[prompt_subject, prompt_extra],
        )
        prompt_compose.click(
            fn=build_prompt,
            inputs=[prompt_kind, prompt_subject, prompt_style, prompt_extra, prompt_profile],
            outputs=[prompt_result, prompt_advice],
        )
        prompt_copy.click(
            fn=None, inputs=[prompt_result], outputs=[prompt_copy_status],
            js=(
                "async (draft) => {"
                "  try {"
                "    if (!draft || draft.startsWith('주제를 입력') || draft.startsWith('먼저 만들고 싶은')) return '먼저 프롬프트를 만들어 주세요.';"
                "    await navigator.clipboard.writeText(draft);"
                "    return '복사 완료! 원본 제작 화면에서 붙여넣으세요.';"
                "  } catch (_) {"
                "    return '브라우저가 자동 복사를 허용하지 않았습니다. 문장을 직접 선택해 복사하세요.';"
                "  }"
                "}"
            ),
        )
        prompt_open.click(
            fn=self.goto_media_tab, inputs=[self.state], outputs=[self.main_tabs]
        )
        guide_topic.change(fn=render_guide, inputs=[guide_topic], outputs=[guide_display])
        hardware_check.click(fn=read_hardware_report, inputs=[], outputs=[hardware_result])
        catalog_refresh.click(
            fn=lambda kind, query, page: format_model_catalog(api_session, kind, query, page),
            inputs=[kind_choice, name_query, page_choice], outputs=[catalog_output],
        )
        model_inspect.click(
            fn=lambda model_id: format_model_details(api_session, model_id),
            inputs=[model_id_input], outputs=[model_detail],
        )
        queue_refresh.click(
            fn=lambda show: format_queue_status(api_session, show),
            inputs=[queue_prompts], outputs=[queue_result],
        )
        gallery_open.click(
            fn=self.goto_media_tab, inputs=[self.state], outputs=[self.main_tabs]
        )
        submit.click(
            fn=self._send_optional_director_request, inputs=[instruction, consent], outputs=[outcome]
        )
