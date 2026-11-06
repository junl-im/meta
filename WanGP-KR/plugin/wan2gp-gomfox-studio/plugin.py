"""곰같은여우의 AI 스튜디오: 원본 WanGP 기능을 보존하는 한국어 시작 화면.

이 플러그인은 원본 생성 엔진, 모델, VRAM 정책을 변경하지 않는다.
무료 로컬 시작이 기본이며 GPT/Deepy 요청은 명시적 사용자 동의를 요구한다.
"""

from __future__ import annotations

import base64
from pathlib import Path

import gradio as gr

from shared.utils.plugins import WAN2GPPlugin

from .catalog import (
    GALLERY_CONFIRM_CHOICES, format_gallery_confirmation, format_model_catalog_page,
    format_model_details, format_model_preflight, format_queue_dashboard_guided,
)
from .hardware import detect_hardware, read_hardware_report
from .help_content import (
    FIRST_CREATION_STAGES, TOPICS, TROUBLESHOOT_TOPICS, connected_creation_choices, render_card_summary,
    format_first_creation_handoff, render_first_creation_step, render_guide, render_troubleshooting,
)
from .prompt_assistant import TASK_KINDS, STYLES, PROFILES, build_prompt, fill_example
from .studio_check import (
    clear_error_diagnosis, format_error_diagnosis, format_studio_readiness,
    suggest_recovery_topic,
)


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
            f"background-image:linear-gradient(90deg,rgba(7,17,31,.67),rgba(7,17,31,.18) 60%,transparent 90%),"
            f"url('data:image/webp;base64,{content}') !important;"
            "background-position:left center,right center !important;"
            "background-size:100% 100%,auto 100% !important;"
            "background-repeat:no-repeat,no-repeat !important;}"
        )
    return "<style>" + "".join(rules) + "</style>" if rules else ""

# 새 UI 전용 CSS. SVG/외부 폰트/스크립트/원격 CDN에 의존하지 않는다.
STUDIO_STYLE = """
<style>
#gfs-root {--gfs-blue:#162b50;--gfs-gold:#f3ab66;width:100%;max-width:1180px;margin:0 auto;font-family:"Malgun Gothic","Apple SD Gothic Neo",system-ui,sans-serif;letter-spacing:-.012em}
#gfs-root * {box-sizing:border-box}
#gfs-root #gfs-section-tabs {min-width:0}
#gfs-root #gfs-section-tabs .tab-nav {overflow-x:auto;scrollbar-width:thin;scrollbar-color:rgba(130,154,158,.55) transparent;gap:4px}
#gfs-root #gfs-section-tabs .tab-nav button {white-space:nowrap;min-height:44px;border-radius:9px 9px 0 0;font-weight:650}
#gfs-root #gfs-section-tabs .tab-nav button[aria-selected="true"] {color:var(--body-text-color,#f7ebda);background:rgba(223,166,98,.13);border-bottom:2px solid #d69a5f}
#gfs-root button:focus-visible {outline:3px solid #e4aa63;outline-offset:2px}
#gfs-root #gfs-brand-row {align-items:center;gap:11px;margin-top:8px}
#gfs-root #gfs-brand-icon {width:68px !important;height:68px !important;max-width:68px;flex:0 0 68px;align-self:center}
#gfs-root #gfs-brand-icon .image-container {height:100% !important;max-height:100% !important}
#gfs-root #gfs-brand-icon img {width:100%;height:100%;object-fit:contain}
#gfs-root .gfs-kicker {font-size:12px;font-weight:800;letter-spacing:.13em;color:#e99959;margin-bottom:3px}
#gfs-root #gfs-brand-row h1 {font-size:clamp(21px,2.5vw,31px);line-height:1.2;letter-spacing:-.045em;margin:0}
#gfs-root .gfs-intro {font-size:14px;line-height:1.55;color:var(--body-text-color,inherit);opacity:.88;margin-top:3px}
#gfs-root .gfs-chip {display:inline-block;margin:3px 7px 5px 0;padding:6px 11px;border-radius:999px;background:rgba(67,139,141,.15);font-size:12px;font-weight:700}
#gfs-root .gfs-chip.gfs-note {background:rgba(235,145,77,.14)}
#gfs-root .gfs-panel {padding:14px 16px;border-radius:15px;background:linear-gradient(120deg,rgba(53,117,128,.12),rgba(232,159,95,.075));border:0}
#gfs-root .gfs-panel h3 {margin:0 0 6px;font-size:19px}
#gfs-root .gfs-panel p {margin:5px 0;line-height:1.6}
#gfs-root .gfs-steps {font-size:14px;opacity:.88;line-height:1.7}
#gfs-root #gfs-banner {height:184px !important;min-height:0 !important;overflow:hidden;border-radius:19px}
#gfs-root #gfs-banner .image-container {height:100% !important;max-height:100% !important}
#gfs-root #gfs-banner img {width:100% !important;height:100% !important;max-height:none !important;object-fit:cover;object-position:center 47%;border-radius:19px;display:block}
#gfs-root #gfs-category-grid,#gfs-root #gfs-category-grid-bottom {gap:12px;align-items:stretch}
#gfs-root #gfs-category-grid-bottom {margin-top:1px}
#gfs-root #gfs-category-grid > *,#gfs-root #gfs-category-grid-bottom > * {min-width:0}
#gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:184px;border:0;border-radius:15px;font-size:20px;font-weight:850;letter-spacing:-.032em;line-height:1.45;white-space:pre-line;text-align:left;padding:21px 23px;color:#fff;text-shadow:0 2px 7px rgba(0,0,0,.65);box-shadow:0 5px 14px rgba(9,20,35,.13);background-position:right center;background-size:auto 100%;background-repeat:no-repeat;overflow:hidden;transition:transform .16s ease,box-shadow .16s ease}
#gfs-root #gfs-category-video {background:radial-gradient(circle at 90% 17%,rgba(133,194,232,.29),transparent 38%),linear-gradient(145deg,#315982,#162e51);background-color:#162e51;color:#fff}
#gfs-root #gfs-category-image {background:radial-gradient(circle at 91% 22%,rgba(247,192,221,.27),transparent 38%),linear-gradient(145deg,#875a79,#553a62);background-color:#553a62;color:#fff}
#gfs-root #gfs-category-audio {background:radial-gradient(circle at 90% 20%,rgba(147,235,209,.25),transparent 38%),linear-gradient(145deg,#277e7a,#1b515c);background-color:#1b515c;color:#fff}
#gfs-root #gfs-category-3d {background:radial-gradient(circle at 90% 20%,rgba(242,194,127,.32),transparent 38%),linear-gradient(145deg,#96714f,#61422f);background-color:#61422f;color:#fff}
@media (hover:hover) {#gfs-root #gfs-category-video:hover,#gfs-root #gfs-category-image:hover,#gfs-root #gfs-category-audio:hover,#gfs-root #gfs-category-3d:hover {transform:translateY(-2px);box-shadow:0 9px 20px rgba(12,22,42,.22)}}
@media (prefers-reduced-motion:reduce) {#gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {transition:none}}
#gfs-root #gfs-launch {min-height:48px;border:0;border-radius:13px;font-weight:800;background:linear-gradient(110deg,#245b68,#236a69);color:#fff6e8;box-shadow:0 4px 12px rgba(17,53,64,.13)}
#gfs-root #gfs-task-guide {font-size:14px;line-height:1.55;margin:3px 0;padding:10px 15px;border:0;border-radius:13px;background:linear-gradient(110deg,rgba(53,113,125,.12),rgba(232,156,100,.085))}
#gfs-root #gfs-task-guide h3 {font-size:17px;line-height:1.4;margin:0 0 5px}
#gfs-root #gfs-task-guide p {margin:4px 0}
#gfs-root #gfs-preflight-panel {border:0;border-radius:14px;background:rgba(64,112,119,.10);margin-top:5px}
#gfs-root #gfs-preflight-check,#gfs-root #gfs-preflight-hardware {border:0;border-radius:11px;min-height:43px;font-weight:750}
#gfs-root #gfs-preflight-result textarea {font-size:13px;line-height:1.6}
#gfs-root #gfs-recovery {border:0;border-radius:14px;background:rgba(57,111,120,.09);min-width:0;max-width:100%;overflow-wrap:anywhere}
#gfs-root #gfs-recovery-guide {min-width:0;max-width:100%;padding:9px 13px;border:0;border-radius:12px;background:rgba(60,121,119,.09);line-height:1.65;overflow-wrap:anywhere;word-break:keep-all}
#gfs-root #gfs-recovery-guide h3 {font-size:16px;line-height:1.4;margin:0 0 6px}
#gfs-root #gfs-recovery-guide li {margin:3px 0}
#gfs-root #gfs-first-creation {border:0;border-radius:14px;background:linear-gradient(120deg,rgba(45,118,119,.12),rgba(223,157,98,.08))}
#gfs-root #gfs-first-creation-guide {padding:9px 13px;background:rgba(41,111,113,.09);border:0;border-radius:12px;font-size:14px;line-height:1.62}
#gfs-root #gfs-first-creation-guide h3 {font-size:17px;margin:0 0 6px}
#gfs-root #gfs-first-creation-guide p {margin:6px 0}
#gfs-root #gfs-first-handoff {border:0;border-radius:14px;background:rgba(54,119,122,.1);min-width:0}
#gfs-root #gfs-first-handoff-check {min-height:43px;border:0;border-radius:11px;font-weight:750}
#gfs-root #gfs-first-handoff-result {padding:10px 13px;border:0;border-radius:12px;background:rgba(231,160,95,.09);font-size:13px;line-height:1.65;overflow-wrap:anywhere;word-break:keep-all}
#gfs-root #gfs-first-handoff-result p {margin:0}
#gfs-root #gfs-welcome-model-panel {border:0;border-radius:14px;background:rgba(55,120,120,.1)}
#gfs-root #gfs-welcome-catalog-run,#gfs-root #gfs-welcome-model-check {border:0;border-radius:11px;min-height:43px;font-weight:750}
#gfs-root #gfs-welcome-model-report textarea {font-size:13px;line-height:1.6;overflow-wrap:anywhere}
#gfs-root #gfs-error-input textarea {font-size:13px;line-height:1.6;overflow-wrap:anywhere;min-width:0}
#gfs-root #gfs-error-advice {min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:keep-all;padding:10px 13px;background:rgba(42,122,125,.12);border:0;border-radius:12px;line-height:1.65}
#gfs-root #gfs-error-advice h3 {font-size:16px;line-height:1.45;margin:0 0 6px}
#gfs-root #gfs-error-actions {gap:8px;flex-wrap:wrap;min-width:0}
#gfs-root #gfs-error-actions button {white-space:normal;overflow-wrap:anywhere;min-width:0}
#gfs-root #gfs-error-diagnose {min-height:43px;border:0;border-radius:11px;font-weight:800;background:linear-gradient(120deg,#246c74,#23625e);color:#fff}
#gfs-root #gfs-error-clear,#gfs-root #gfs-connection-check {min-height:43px;border:0;border-radius:11px;font-weight:700}
#gfs-root #gfs-connection-result textarea {font-size:12px;line-height:1.7;overflow-wrap:anywhere;min-width:0}
#gfs-root #gfs-copy {border-radius:12px;font-weight:750}
#gfs-root #gfs-example {border-radius:12px;font-weight:750;border:1px solid rgba(210,154,99,.42);background:linear-gradient(135deg,rgba(239,182,111,.19),rgba(97,151,151,.14))}
#gfs-root #gfs-compose {min-height:44px;background:linear-gradient(130deg,#2b746f,#205f68);color:#fff;border-radius:12px;font-weight:800}
#gfs-root #gfs-prompt-box textarea {line-height:1.55;font-size:14px}
#gfs-root .gfs-workshop {padding:14px 17px;border-radius:16px;border:0;background:linear-gradient(125deg,rgba(66,125,129,.15),rgba(235,163,103,.12))}
#gfs-root .gfs-workshop h3 {font-size:18px;margin:0 0 4px}
#gfs-root .gfs-workshop p {margin:0;opacity:.85}

#gfs-root #gfs-queue-refresh,#gfs-root #gfs-model-inspect {border-radius:12px;font-weight:750}
#gfs-root #gfs-model-preflight {border:0;border-radius:12px;background:rgba(49,121,121,.13)}
#gfs-root #gfs-model-preflight-run {border:0;border-radius:11px;font-weight:750;min-height:44px}
#gfs-root #gfs-model-preflight-result textarea {line-height:1.6;font-size:13px;overflow-wrap:anywhere}
#gfs-root #gfs-queue-overview {padding:10px 15px;border:0;border-radius:12px;background:linear-gradient(115deg,rgba(51,124,125,.18),rgba(231,167,93,.11));font-size:14px;line-height:1.6}
#gfs-root #gfs-queue-overview p {margin:0}
#gfs-root #gfs-queue-guidance {padding:10px 15px;border:0;border-radius:12px;background:rgba(225,157,91,.11);font-size:14px;line-height:1.65;overflow-wrap:anywhere;word-break:keep-all}
#gfs-root #gfs-queue-guidance p {margin:0}
#gfs-root #gfs-gallery-review {border:0;border-radius:13px;background:rgba(55,116,117,.09);min-width:0}
#gfs-root #gfs-gallery-check {min-height:43px;border:0;border-radius:11px;font-weight:750}
#gfs-root #gfs-gallery-result {border:0;border-radius:11px;padding:9px 13px;background:rgba(225,157,91,.10);font-size:13px;line-height:1.65;overflow-wrap:anywhere;word-break:keep-all}
#gfs-root #gfs-gallery-result p {margin:0}
#gfs-root #gfs-queue-result textarea {line-height:1.65;font-size:13px}
#gfs-root .gfs-status {padding:14px 16px;border-radius:14px;border:0;background:linear-gradient(120deg,rgba(53,112,123,.15),rgba(236,171,106,.09))}
#gfs-root .gfs-status strong {color:var(--gfs-gold)}
#gfs-root .gfs-muted {font-size:12px;opacity:.75}
@media (max-width:740px) {
  #gfs-root #gfs-banner {height:112px !important;border-radius:14px}
  #gfs-root #gfs-banner img {border-radius:14px}
  #gfs-root #gfs-brand-row {gap:7px;margin-top:5px}
  #gfs-root #gfs-brand-icon {width:47px !important;height:47px !important;max-width:47px;flex:0 0 47px}
  #gfs-root #gfs-brand-row h1 {font-size:21px}
  #gfs-root .gfs-kicker {font-size:10px;letter-spacing:.06em}
  #gfs-root .gfs-intro {font-size:13px;line-height:1.4}
  #gfs-root .gfs-chip {font-size:10px;padding:4px 7px;margin:3px 4px 3px 0}
  #gfs-root .gfs-panel {padding:10px 12px;border-radius:12px}
  #gfs-root .gfs-panel h3 {font-size:16px}
  #gfs-root .gfs-steps {font-size:12px;line-height:1.4}
  #gfs-root #gfs-category-grid,#gfs-root #gfs-category-grid-bottom {gap:7px}
  #gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:112px;font-size:14px;padding:13px;border-radius:12px}
  #gfs-root #gfs-task-guide {font-size:12px;padding:9px 11px}
  #gfs-root #gfs-task-guide h3 {font-size:14px}
  #gfs-root #gfs-queue-overview {padding:8px 10px;font-size:12px}
  #gfs-root #gfs-queue-guidance {padding:9px 11px;font-size:12px}
  #gfs-root #gfs-gallery-result {font-size:12px;padding:8px 10px}
  #gfs-root #gfs-error-input textarea,#gfs-root #gfs-error-advice {font-size:12px;line-height:1.6}
  #gfs-root #gfs-error-advice {padding:9px 11px}
  #gfs-root #gfs-error-advice h3 {font-size:14px}
  #gfs-root #gfs-recovery-guide {font-size:12px;line-height:1.52;padding:9px 10px}
  #gfs-root #gfs-recovery-guide h3 {font-size:14px}
  #gfs-root #gfs-first-creation-guide {font-size:12px;line-height:1.5;padding:8px 10px}
  #gfs-root #gfs-first-creation-guide h3 {font-size:14px}
  #gfs-root #gfs-first-handoff-result {font-size:12px;padding:9px 11px}
  #gfs-root #gfs-error-actions > * {flex:1 1 135px;min-width:0}
}
@media (max-width:420px) {
  #gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {padding:11px 10px;font-size:clamp(12px,3.4vw,14px)}
  #gfs-root #gfs-error-actions {gap:6px}
  #gfs-root #gfs-error-actions > * {flex:1 1 calc(50% - 3px);min-width:0}
  #gfs-root #gfs-error-actions button {font-size:12px;padding-inline:7px}
}
@media (max-width:740px) and (max-height:740px) {
  #gfs-root #gfs-banner {height:89px !important}
  #gfs-root #gfs-brand-icon {width:40px !important;height:40px !important;max-width:40px;flex:0 0 40px}
  #gfs-root #gfs-brand-row h1 {font-size:18px}
  #gfs-root #gfs-category-video,#gfs-root #gfs-category-image,#gfs-root #gfs-category-audio,#gfs-root #gfs-category-3d {min-height:96px}
}
</style>
"""


class GomFoxStudioPlugin(WAN2GPPlugin):
    def __init__(self):
        super().__init__()
        self.name = APP_TITLE
        self.version = "0.34.0-dev"
        self.description = "첫 무료 제작 오류별 복구 안내·모바일 정렬 · 무료 로컬 기본 · GPT 선택"

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
            unavailable = deepy.unavailable_reason
            director_type = deepy.deepy_type
        except Exception:
            raise gr.Error("감독 연결 상태를 읽지 못했습니다. 원본 Deepy 설정을 확인해 주세요.") from None
        if unavailable:
            raise gr.Error("감독 연결이 준비되지 않았습니다. 원본 Deepy 설정에서 상태를 확인해 주세요.")
        if director_type != "prime":
            raise gr.Error("감독 기능에는 Deepy Prime이 필요합니다. 원본 설정을 확인해 주세요.")

        try:
            with deepy.run(prompt, workspace="current") as job:
                for _ in job.events():
                    pass
                result = job.result()
            status = result.status
            cancelled = result.cancelled
        except Exception:
            raise gr.Error("감독 작업을 확인하지 못했습니다. 원본 Deepy 화면에서 오류 상태를 확인해 주세요.") from None

        if status == "error":
            raise gr.Error("감독 작업 중 오류가 발생했습니다. 자세한 내용은 원본 Deepy 화면에서 확인해 주세요.")
        if cancelled:
            return "감독 작업이 중단됐습니다. 무료 로컬 제작은 그대로 사용할 수 있습니다."

        # 원본 출력 이름은 로컬 경로나 사용자 정보를 포함할 수 있어 표시하지 않는다.
        return "감독 작업이 완료됐습니다. 결과는 원본 WanGP 갤러리 또는 Deepy 화면에서 확인해 주세요."

    def create_ui(self, api_session=None):
        with gr.Column(elem_id="gfs-root"):
            gr.HTML(STUDIO_STYLE + category_art_css())
            if HERO_FILE.is_file():
                gr.Image(
                    value=str(HERO_FILE), height=184, interactive=False,
                    show_label=False, show_download_button=False,
                    show_fullscreen_button=False, container=False,
                    elem_id="gfs-banner",
                )
            with gr.Row(elem_id="gfs-brand-row"):
                if ICON_FILE.is_file():
                    gr.Image(
                        value=str(ICON_FILE), height=68, width=68,
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
                    with gr.Row(equal_height=True, elem_id="gfs-category-grid-bottom"):
                        audio_button = gr.Button("음성 · 음악\n소리 만들기", elem_id="gfs-category-audio")
                        model3d_button = gr.Button("3D · 월드\n입체와 장면", elem_id="gfs-category-3d")
                    task_guide = gr.Markdown(
                        value=render_card_summary(""),
                        elem_id="gfs-task-guide",
                    )
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
                        '<div class="gfs-steps">① 작업 고르기　② 네 단계 따라 하기　③ 원본에서 직접 생성</div></div>'
                    )
                    welcome_topic = gr.Dropdown(
                        choices=["처음 시작", "사진·그림", "짧은 영상", "목소리·음악", "3D 만들기"],
                        value="처음 시작", label="1단계 · 어떤 작품을 만들까요?",
                    )
                    with gr.Accordion("분야별 자세한 도움말 (선택)", open=False):
                        welcome_guide = gr.Markdown(value=render_guide("처음 시작"))
                    with gr.Accordion("첫 무료 작품 · 단계별 따라 하기", open=True, elem_id="gfs-first-creation"):
                        gr.Markdown(
                            "아래 단계를 하나씩 골라 확인하세요. **자동으로 다음 단계에 넘어가거나 "
                            "모델·설정을 바꾸지 않습니다.**"
                        )
                        first_creation_stage = gr.Dropdown(
                            choices=list(FIRST_CREATION_STAGES),
                            value=FIRST_CREATION_STAGES[0],
                            label="지금 확인할 단계 (직접 선택)",
                            elem_id="gfs-first-creation-stage",
                        )
                        first_creation_guide = gr.Markdown(
                            value=render_first_creation_step("처음 시작", FIRST_CREATION_STAGES[0]),
                            elem_id="gfs-first-creation-guide",
                        )
                    with gr.Accordion("첫 작품 모델 찾기 · 이 화면에서 확인", open=True, elem_id="gfs-welcome-model-panel"):
                        gr.Markdown(
                            "현재 분야의 **원본 모델 목록을 읽기만** 합니다. 검색하고 모델을 직접 선택한 다음 "
                            "준비 상태를 확인하세요. **다운로드·생성·설정 변경은 하지 않습니다.**"
                        )
                        welcome_model_search = gr.Textbox(
                            label="모델 이름 검색 (선택)", placeholder="예: Flux, Qwen, Wan",
                        )
                        welcome_catalog_run = gr.Button(
                            "이 분야 모델 찾아보기", elem_id="gfs-welcome-catalog-run",
                        )
                        welcome_catalog_status = gr.Markdown(
                            value="**아직 조회 전** · 위 버튼을 누르면 선택 분야에서 최대 40개를 표시합니다."
                        )
                        welcome_model_pick = gr.Dropdown(
                            choices=[], value=None, label="원본 모델 선택 (직접 선택)",
                            elem_id="gfs-welcome-model-pick",
                        )
                        welcome_model_check = gr.Button(
                            "선택 모델·내 PC 준비 확인", elem_id="gfs-welcome-model-check",
                        )
                        welcome_model_report = gr.Textbox(
                            label="모델 파일·RAM·VRAM 읽기 전용 확인표", lines=9,
                            interactive=False, elem_id="gfs-welcome-model-report",
                            value="먼저 분야별 모델을 조회하고 한 개를 선택하세요.",
                        )
                        gr.Markdown(
                            "여기서 선택해도 **원본 Media Generator의 모델은 바뀌지 않습니다.** "
                            "실제 생성 모델과 해상도는 원본 무료 제작 화면에서 직접 선택하세요."
                        )
                    welcome_hardware = gr.Button("내 PC 사양 살펴보기 (선택 · 읽기 전용)")
                    welcome_report = gr.Textbox(
                        label="이 컴퓨터의 RAM · GPU 안내", lines=7, interactive=False,
                        value="원하면 위 버튼을 누르세요. 확인을 건너뛰어도 무료 제작을 시작할 수 있습니다.",
                    )
                    with gr.Accordion(
                        "첫 무료 생성 · 지금 어디까지 확인했나요? (선택)",
                        open=True, elem_id="gfs-first-handoff",
                    ):
                        gr.Markdown(
                            "**내가 직접 확인한 것만** 체크하세요. 체크는 원본 GPU 실행·모델 준비 완료를 "
                            "자동 확인하지 않으며 원본 설정도 바꾸지 않습니다."
                        )
                        first_original_checked = gr.Checkbox(
                            label="원본 WanGP의 Media Generator 화면을 직접 열어 봤어요", value=False,
                            elem_id="gfs-first-original-checked",
                        )
                        first_model_checked = gr.Checkbox(
                            label="원본에서 제작 모델을 고르고 파일 준비 상태를 확인했어요", value=False,
                            elem_id="gfs-first-model-checked",
                        )
                        first_input_checked = gr.Checkbox(
                            label="프롬프트·필요한 입력과 가벼운 시작 설정을 확인했어요", value=False,
                            elem_id="gfs-first-input-checked",
                        )
                        first_handoff_check = gr.Button(
                            "아직 필요한 단계 확인", elem_id="gfs-first-handoff-check",
                        )
                        first_handoff_result = gr.Markdown(
                            value=format_first_creation_handoff("처음 시작", False, False, False),
                            elem_id="gfs-first-handoff-result",
                        )
                    welcome_start = gr.Button(
                        "원본 무료 제작 화면 열기", variant="primary", elem_id="gfs-welcome-start"
                    )
                    gr.Markdown(
                        "처음에는 **이미지 한 장 또는 짧은 저해상도 영상**부터 시험해 보세요. "
                        "모델 다운로드·생성은 원본 WanGP에서 직접 선택합니다. "
                        "이 안내 화면은 PC 설정을 자동 변경하지 않습니다."
                    )
                    with gr.Accordion(
                        "문제가 생겼나요? 단계별 해결", open=False, elem_id="gfs-recovery"
                    ):
                        problem_topic = gr.Dropdown(
                            choices=list(TROUBLESHOOT_TOPICS),
                            value=TROUBLESHOOT_TOPICS[0],
                            label="어떤 문제가 있나요?", elem_id="gfs-recovery-topic",
                        )
                        problem_guide = gr.Markdown(
                            value=render_troubleshooting(TROUBLESHOOT_TOPICS[0]),
                            elem_id="gfs-recovery-guide",
                        )
                        gr.Markdown(
                            "도움이 더 필요하면 **오류 문장·Windows 버전·GPU 이름·선택 모델**을 "
                            "기록해 주세요. **암호·API 키·개인 사진**은 공개 공간에 올리지 마세요. "
                            "이 안내는 설정이나 파일을 바꾸지 않습니다."
                        )
                        gr.Markdown(
                            "**오류 문장 간단 진단 · 선택** — 원본 실행 창의 오류 부분을 붙여넣으세요. "
                            "암호·토큰·개인정보·파일 경로는 입력 전에 가려 주세요. "
                            "진단은 이 화면의 문자열 비교만 수행하며 원본 로그를 자동 수집하지 않습니다. "
                            "일치하는 유형이 있으면 위 상황별 해결 안내를 해당 항목으로 전환합니다."
                        )
                        error_text = gr.Textbox(
                            label="오류 메시지 붙여넣기 (선택)", lines=3,
                            placeholder="예: RuntimeError: CUDA out of memory",
                            elem_id="gfs-error-input",
                        )
                        with gr.Row(elem_id="gfs-error-actions"):
                            error_diagnose = gr.Button(
                                "한국어 진단 보기", elem_id="gfs-error-diagnose"
                            )
                            error_clear = gr.Button(
                                "입력 지우기", elem_id="gfs-error-clear"
                            )
                        error_advice = gr.Markdown(
                            value="오류 문장을 입력하고 버튼을 눌러 주세요.",
                            elem_id="gfs-error-advice",
                        )
                        gr.Markdown(
                            "**원본 연결이 의심될 때** · 아래 버튼은 한글 UI·모델 목록 API·실제 생성 여부를 구분해 알려줍니다. "
                            "원본 작업 큐를 실행하거나 모델을 다운로드하지 않습니다."
                        )
                        connection_check = gr.Button(
                            "원본 연결 단계 확인 (읽기 전용)", elem_id="gfs-connection-check"
                        )
                        connection_result = gr.Textbox(
                            label="한글 화면 · 원본 모델 API · 생성 검증 단계",
                            lines=7, interactive=False,
                            value="버튼을 누르면 연결 단계를 점검합니다. 모델 실행까지 자동 확인하지는 않습니다.",
                            elem_id="gfs-connection-result",
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
                        "**모델 상세 보기:** 목록 조회 후 아래에서 모델을 선택하면 원본 ID가 자동으로 채워집니다. "
                        "직접 입력해도 됩니다. 모델 선택만으로 다운로드나 생성이 시작되지 않습니다."
                    )
                    model_pick = gr.Dropdown(
                        choices=[], value=None, label="조회한 목록에서 모델 선택 (선택)",
                        elem_id="gfs-model-pick",
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
                    with gr.Accordion(
                        "이 모델, 내 PC에서 시작해도 될까요? · 사전 점검 (선택)",
                        open=False, elem_id="gfs-model-preflight",
                    ):
                        gr.Markdown(
                            "위에 입력한 **원본 모델 ID**를 그대로 사용합니다. "
                            "PC의 RAM·GPU 정보와 원본 모델 파일 상태를 **읽기만** 하며, "
                            "실제 실행 가능 여부는 판단할 수 없습니다."
                        )
                        manual_vram = gr.Number(
                            label="전용 VRAM 직접 확인값(GB) · 모를 때는 비워 두기",
                            value=None, precision=1,
                        )
                        model_preflight_run = gr.Button(
                            "이 모델의 첫 실행 확인표 보기", elem_id="gfs-model-preflight-run"
                        )
                        model_preflight_result = gr.Textbox(
                            label="파일 준비 · 내 PC 메모리 · 다음 행동 (읽기 전용)",
                            lines=12, interactive=False,
                            value="원본 모델 ID를 입력한 뒤 위 버튼을 눌러 주세요. 실제 GPU 생성은 실행하지 않습니다.",
                            elem_id="gfs-model-preflight-result",
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
                    queue_overview = gr.Markdown(
                        value="**조회 전** · 새로고침을 누르면 전체·실행 중·대기 작업을 알려 드려요.",
                        elem_id="gfs-queue-overview",
                    )
                    queue_guidance = gr.Markdown(
                        value="**다음 행동 · 조회 전:** 작업 현황을 확인하면 대기·실행·취소·오류 상황에 맞는 확인 방법을 알려 드려요.",
                        elem_id="gfs-queue-guidance",
                    )
                    queue_result = gr.Textbox(
                        label="원본 큐 현황 (읽기 전용)", lines=10, interactive=False,
                        value="현재 작업 상태 새로고침을 눌러 주세요.",
                        elem_id="gfs-queue-result",
                    )
                    gallery_open = gr.Button(
                        "원본 WanGP 제작·갤러리 화면으로 이동", variant="primary"
                    )
                    with gr.Accordion(
                        "결과 확인 · 직접 점검 (선택)", open=False, elem_id="gfs-gallery-review"
                    ):
                        gr.Markdown(
                            "원본 화면을 열어 **눈으로 확인한 사실만** 선택하세요. "
                            "여기서는 결과 파일이나 오류 로그를 자동으로 읽지 않아요."
                        )
                        gallery_observed = gr.Dropdown(
                            label="원본 갤러리에서 직접 확인한 결과",
                            choices=list(GALLERY_CONFIRM_CHOICES), value=GALLERY_CONFIRM_CHOICES[0],
                            elem_id="gfs-gallery-observed",
                        )
                        gallery_file_opened = gr.Checkbox(
                            label="결과 파일을 내 PC에서 직접 열어 봤어요", value=False,
                            elem_id="gfs-gallery-file-opened",
                        )
                        gallery_check = gr.Button(
                            "내 확인 결과 안내 보기", elem_id="gfs-gallery-check",
                        )
                        gallery_result = gr.Markdown(
                            value="**확인 전:** 원본 갤러리와 실제 저장 파일을 직접 확인해 주세요.",
                            elem_id="gfs-gallery-result",
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
        welcome_topic.change(
            fn=connected_creation_choices, inputs=[welcome_topic],
            outputs=[kind_choice, prompt_kind],
        )
        def clear_welcome_model_selection(_value):
            return (
                gr.update(choices=[], value=None),
                "**선택 조건이 바뀌었습니다.** 모델을 다시 조회해 주세요.",
                "이전 모델 확인표를 지웠습니다. 모델을 다시 선택해 주세요.",
            )

        welcome_topic.change(
            fn=lambda topic: ("", *clear_welcome_model_selection(topic)),
            inputs=[welcome_topic],
            outputs=[welcome_model_search, welcome_model_pick, welcome_catalog_status, welcome_model_report],
        )
        welcome_model_search.change(
            fn=clear_welcome_model_selection,
            inputs=[welcome_model_search],
            outputs=[welcome_model_pick, welcome_catalog_status, welcome_model_report],
        )
        welcome_topic.change(
            fn=render_first_creation_step,
            inputs=[welcome_topic, first_creation_stage], outputs=[first_creation_guide],
        )
        def reset_first_handoff(topic):
            return (
                gr.update(value=False), gr.update(value=False), gr.update(value=False),
                format_first_creation_handoff(topic, False, False, False),
            )

        welcome_topic.change(
            fn=reset_first_handoff, inputs=[welcome_topic],
            outputs=[first_original_checked, first_model_checked, first_input_checked, first_handoff_result],
        )
        first_handoff_check.click(
            fn=format_first_creation_handoff,
            inputs=[welcome_topic, first_original_checked, first_model_checked, first_input_checked],
            outputs=[first_handoff_result],
        )
        for first_checkbox in (first_original_checked, first_model_checked, first_input_checked):
            first_checkbox.change(
                fn=format_first_creation_handoff,
                inputs=[welcome_topic, first_original_checked, first_model_checked, first_input_checked],
                outputs=[first_handoff_result],
            )
        first_creation_stage.change(
            fn=render_first_creation_step,
            inputs=[welcome_topic, first_creation_stage], outputs=[first_creation_guide],
        )
        def load_welcome_models(topic, query):
            category, _prompt_kind = connected_creation_choices(topic)
            report, choices = format_model_catalog_page(api_session, category, query, 1)
            summary = (report.splitlines() or ["원본 모델 목록 확인 필요"])[0]
            return (
                f"**조회 결과** · {summary}\n\n최대 40개씩 표시합니다. 원하는 모델이 없으면 검색어를 좁혀 주세요.",
                gr.update(choices=choices, value=None),
                "조회가 끝났습니다. 모델을 선택한 뒤 준비 확인을 눌러 주세요." if choices
                else "표시할 모델이 없습니다. 원본 연결·분야·검색어를 확인해 주세요.",
            )

        welcome_catalog_run.click(
            fn=load_welcome_models,
            inputs=[welcome_topic, welcome_model_search],
            outputs=[welcome_catalog_status, welcome_model_pick, welcome_model_report],
        )
        welcome_model_check.click(
            fn=lambda model_id: format_model_preflight(
                api_session, model_id, detect_hardware(),
            ),
            inputs=[welcome_model_pick], outputs=[welcome_model_report],
        )
        welcome_model_pick.change(
            fn=lambda _model_id: "선택이 바뀌었습니다. 위 준비 확인 버튼을 다시 눌러 주세요.",
            inputs=[welcome_model_pick], outputs=[welcome_model_report],
        )
        problem_topic.change(
            fn=render_troubleshooting, inputs=[problem_topic], outputs=[problem_guide]
        )
        def diagnose_and_open_help(log_text, selected_problem):
            diagnosis = format_error_diagnosis(log_text)
            suggested = suggest_recovery_topic(log_text)
            topic = suggested if suggested in TROUBLESHOOT_TOPICS else (
                selected_problem if selected_problem in TROUBLESHOOT_TOPICS else TROUBLESHOOT_TOPICS[0]
            )
            return diagnosis, gr.update(value=topic), render_troubleshooting(topic)

        error_diagnose.click(
            fn=diagnose_and_open_help, inputs=[error_text, problem_topic],
            outputs=[error_advice, problem_topic, problem_guide],
        )
        def clear_error_and_related_help():
            cleared, advice = clear_error_diagnosis()
            return cleared, advice, gr.update(value=TROUBLESHOOT_TOPICS[0]), render_troubleshooting(TROUBLESHOOT_TOPICS[0])

        error_clear.click(
            fn=clear_error_and_related_help, inputs=[],
            outputs=[error_text, error_advice, problem_topic, problem_guide],
        )
        connection_check.click(
            fn=lambda: format_studio_readiness(api_session), inputs=[], outputs=[connection_result]
        )
        welcome_hardware.click(fn=read_hardware_report, inputs=[], outputs=[welcome_report])
        welcome_start.click(fn=self.goto_media_tab, inputs=[self.state], outputs=[self.main_tabs])
        video_button.click(fn=lambda: render_card_summary("짧은 영상"), inputs=[], outputs=[task_guide])
        image_button.click(fn=lambda: render_card_summary("사진·그림"), inputs=[], outputs=[task_guide])
        audio_button.click(fn=lambda: render_card_summary("목소리·음악"), inputs=[], outputs=[task_guide])
        model3d_button.click(fn=lambda: render_card_summary("3D 만들기"), inputs=[], outputs=[task_guide])
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
        def refresh_catalog_with_picker(kind, query, page):
            report, choices = format_model_catalog_page(api_session, kind, query, page)
            return report, gr.update(choices=choices, value=None), ""

        catalog_refresh.click(
            fn=refresh_catalog_with_picker,
            inputs=[kind_choice, name_query, page_choice],
            outputs=[catalog_output, model_pick, model_id_input],
        )
        model_pick.change(fn=lambda chosen: chosen or "", inputs=[model_pick], outputs=[model_id_input])
        model_inspect.click(
            fn=lambda model_id: format_model_details(api_session, model_id),
            inputs=[model_id_input], outputs=[model_detail],
        )
        model_preflight_run.click(
            fn=lambda model_id, vram: format_model_preflight(
                api_session, model_id, detect_hardware(), vram,
            ),
            inputs=[model_id_input, manual_vram], outputs=[model_preflight_result],
        )
        def refresh_queue_with_gallery_reset(show):
            summary, details, guidance = format_queue_dashboard_guided(api_session, show)
            return (
                summary, details, guidance, gr.update(value=GALLERY_CONFIRM_CHOICES[0]),
                gr.update(value=False),
                "**새로 조회함:** 이전 수동 확인 선택을 초기화했어요. 원본 결과를 다시 확인해 주세요.",
            )

        queue_refresh.click(
            fn=refresh_queue_with_gallery_reset, inputs=[queue_prompts],
            outputs=[queue_overview, queue_result, queue_guidance,
                     gallery_observed, gallery_file_opened, gallery_result],
        )
        gallery_check.click(
            fn=format_gallery_confirmation,
            inputs=[gallery_observed, gallery_file_opened], outputs=[gallery_result],
        )
        gallery_open.click(
            fn=self.goto_media_tab, inputs=[self.state], outputs=[self.main_tabs]
        )
        submit.click(
            fn=self._send_optional_director_request, inputs=[instruction, consent], outputs=[outcome]
        )
