"""곰같은여우 스튜디오 대시보드의 비침습적 연결에 대한 정적 회귀 검사."""

from __future__ import annotations

import ast
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLUGIN_DIR = ROOT / "plugin" / "wan2gp-gomfox-studio"
SOURCE = (PLUGIN_DIR / "plugin.py").read_text(encoding="utf-8")
META = json.loads((PLUGIN_DIR / "plugin_info.json").read_text(encoding="utf-8"))


class StudioDashboardTests(unittest.TestCase):
    def test_syntax_and_local_raster_asset(self):
        ast.parse(SOURCE)
        image = PLUGIN_DIR / "studio-hero.png"
        self.assertTrue(image.is_file())
        self.assertEqual(image.read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
        emblem = PLUGIN_DIR / "gomfox-studio-icon.png"
        original = ROOT / "assets" / "gomfox-studio-icon.png"
        self.assertTrue(emblem.is_file())
        self.assertEqual(emblem.read_bytes()[:8], b"\x89PNG\r\n\x1a\n")
        self.assertEqual(emblem.read_bytes(), original.read_bytes())
        self.assertIn("ICON_FILE", SOURCE)
        for category in ("video", "image", "audio", "3d"):
            art = PLUGIN_DIR / f"category-{category}.webp"
            self.assertTrue(art.is_file())
            self.assertEqual(art.read_bytes()[:4], b"RIFF")
            self.assertEqual(art.read_bytes()[8:12], b"WEBP")
            self.assertLess(art.stat().st_size, 160_000)
        helper = PLUGIN_DIR / "first-run-helper-v036.webp"
        self.assertTrue(helper.is_file())
        self.assertEqual(helper.read_bytes()[:4], b"RIFF")
        self.assertEqual(helper.read_bytes()[8:12], b"WEBP")
        self.assertLess(helper.stat().st_size, 160_000)
        self.assertIn("data:image/webp;base64,", SOURCE)
        self.assertIn("category_art_css()", SOURCE)
        self.assertIn('payload[8:12] != b"WEBP"', SOURCE)
        for forbidden in ("<svg", "data:image/svg", "cdn.jsdelivr"):
            self.assertNotIn(forbidden, SOURCE.casefold())

    def test_free_mode_and_all_task_categories(self):
        for text in (
            "무료 제작 · 시작", "영상 제작", "이미지 제작",
            "음성 · 음악", "3D · 월드", "원본 WanGP 무료 제작 화면 열기",
        ):
            self.assertIn(text, SOURCE)
        self.assertIn("fn=self.goto_media_tab", SOURCE)
        self.assertIn('render_card_summary("짧은 영상")', SOURCE)
        self.assertIn('render_card_summary("사진·그림")', SOURCE)
        self.assertIn('render_card_summary("목소리·음악")', SOURCE)
        self.assertIn('render_card_summary("3D 만들기")', SOURCE)
        self.assertLess(SOURCE.index('with gr.Tab("무료 제작 · 시작")'), SOURCE.index('with gr.Tab("처음 실행 · 따라 하기")'))

    def test_guide_explorer_hardware_and_optin_gpt(self):
        for text in ("처음 사용자 도움말", "모델 찾아보기", "내 PC · 저사양 안내", "GPT 감독 · 선택"):
            self.assertIn(text, SOURCE)
        for text in ("format_model_catalog", "read_hardware_report", "if not consent:"):
            self.assertIn(text, SOURCE)
        self.assertEqual(SOURCE.count("deepy.run("), 1)
        self.assertTrue(SOURCE.index("if not consent:") < SOURCE.index("deepy.run("))

    def test_onboarding_is_explicit_and_noninvasive(self):
        for text in ("처음 실행 · 따라 하기", "welcome_topic", "welcome_hardware", "welcome_start"):
            self.assertIn(text, SOURCE)
        self.assertIn("fn=read_hardware_report", SOURCE)
        self.assertIn("fn=self.goto_media_tab", SOURCE)
        self.assertNotIn("torch.cuda.set_device", SOURCE)

    def test_v025_first_generation_is_manual_and_mobile_compact(self):
        for token in (
            'FIRST_CREATION_STAGES',
            'render_first_creation_step',
            'first_creation_stage.change(',
            'welcome_topic.change(',
            'elem_id="gfs-first-creation"',
            'elem_id="gfs-first-creation-guide"',
            '직접 선택',
            '#gfs-root #gfs-first-creation-guide {font-size:12px',
        ):
            self.assertIn(token, SOURCE)
        self.assertIn('with gr.Accordion("분야별 자세한 도움말 (선택)", open=False)', SOURCE)

    def test_v026_preflight_uses_explicit_model_and_only_user_action(self):
        for token in (
            'format_model_preflight', 'detect_hardware',
            'model_preflight_run.click(', 'inputs=[model_id_input, manual_vram]',
            'elem_id="gfs-model-preflight-result"',
            'welcome_topic.change(', 'fn=connected_creation_choices',
            'outputs=[kind_choice, prompt_kind]',
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn("submit_generation", SOURCE)

    def test_v029_model_selection_is_manual_and_does_not_start_generation(self):
        for token in (
            "format_model_catalog_page",
            'elem_id="gfs-model-pick"',
            "model_pick.change(",
            "refresh_catalog_with_picker",
            "outputs=[catalog_output, model_pick, model_id_input]",
            'gr.update(choices=choices, value=None)',
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn("submit_generation", SOURCE)

    def test_v030_first_creation_wizard_has_read_only_model_check(self):
        for token in (
            'elem_id="gfs-welcome-model-panel"',
            'elem_id="gfs-welcome-model-pick"',
            'elem_id="gfs-welcome-model-report"',
            'welcome_catalog_run.click(',
            'welcome_model_check.click(',
            'welcome_model_search.change(',
            'welcome_model_pick.change(',
            'inputs=[welcome_topic, welcome_model_search]',
            'inputs=[welcome_model_pick], outputs=[welcome_model_report]',
            'gr.update(choices=[], value=None)',
            '선택해도 **원본 Media Generator의 모델은 바뀌지 않습니다',
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn("submit_generation", SOURCE)

    def test_v018_recovery_help_is_optional_and_read_only(self):
        for token in (
            "문제가 생겼나요? 단계별 해결",
            'open=False, elem_id="gfs-recovery"',
            "TROUBLESHOOT_TOPICS", "render_troubleshooting",
            "problem_topic.change(",
            "암호·API 키·개인 사진",
        ):
            self.assertIn(token, SOURCE)
        self.assertLess(SOURCE.index('with gr.Tab("처음 실행 · 따라 하기")'), SOURCE.index("problem_topic.change("))

    def test_offline_prompt_workshop_is_copy_only(self):
        for token in (
            "프롬프트 작업실", "prompt_compose.click(", "fn=build_prompt",
            "prompt_example.click(", "fn=fill_example",
            "prompt_result", "prompt_copy.click(", "prompt_open.click(",
            "기존 원본 프롬프트나 생성 설정을 덮어쓰지 않습니다",
        ):
            self.assertIn(token, SOURCE)
        self.assertIn("from .prompt_assistant import", SOURCE)
        self.assertIn("navigator.clipboard.writeText", SOURCE)
        self.assertIn("draft.startsWith('먼저 만들고 싶은')", SOURCE)
        self.assertNotIn('request_component("prompt")', SOURCE)
        self.assertNotIn("show_copy_button=True", SOURCE)

    def test_queue_monitor_and_model_details_are_read_only(self):
        for token in (
            "작업 현황 · 갤러리", "format_queue_dashboard_guided", "format_model_details",
            "model_inspect.click(", "queue_refresh.click(", "gallery_open.click(",
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn("cancel_queue_task(", SOURCE)
        self.assertNotIn("submit_task(", SOURCE)

    def test_compact_mobile_layout_and_keyboard_focus_are_present(self):
        for token in (
            "@media (max-width:740px)",
            "@media (max-width:740px) and (max-height:740px)",
            "prefers-reduced-motion",
            "button:focus-visible",
            "gfs-section-tabs .tab-nav",
        ):
            self.assertIn(token, SOURCE)

    def test_v024_recovery_panel_is_compact_and_has_clear_and_connection_controls(self):
        for token in (
            '#gfs-root #gfs-error-advice {min-width:0;max-width:100%',
            '#gfs-root #gfs-error-actions {gap:8px;flex-wrap:wrap',
            '#gfs-root #gfs-error-actions > * {flex:1 1 135px;min-width:0}',
            'elem_id="gfs-error-clear"',
            'elem_id="gfs-connection-result"',
            'clear_error_diagnosis()',
            '원본 연결 단계 확인 (읽기 전용)',
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn('url("data:image/svg', SOURCE.casefold())

    def test_plugin_metadata_matches(self):
        self.assertEqual(META["version"], "0.36.0-dev")

    def test_v036_first_run_illustration_is_optional_and_mobile_text_has_room(self):
        for token in (
            'FIRST_RUN_ART_FILE', 'first_run_art_css()',
            'gfs-first-run-intro', 'data:image/webp;base64,',
            '.gfs-first-run-intro {padding-right:103px;',
            'gfs-first-run-intro p {font-size:12px;',
        ):
            self.assertIn(token, SOURCE)
        self.assertIn('STUDIO_STYLE + category_art_css() + first_run_art_css()', SOURCE)
        preview = ROOT / 'docs' / 'V036_FIRST_RUN_VISUAL_PREVIEW.html'
        html = preview.read_text(encoding='utf-8')
        self.assertIn('first-run-helper-v036.webp', html)
        self.assertIn('v0.36 디자인 배치 참고용 정적 미리보기', html)
        self.assertIn('@media(max-width:420px)', html)
        self.assertNotIn('<svg', html.casefold())
        self.assertNotIn('https://', html)

    def test_v035_first_run_is_stepwise_with_safe_inline_blockers(self):
        for token in (
            'elem_id="gfs-first-creation-next"',
            'elem_id="gfs-first-creation-blocker"',
            'next_first_creation_stage(stage)',
            'fn=advance_first_creation_guide',
            'fn=reset_first_creation_guide',
            'render_first_creation_blocker(stage)',
            'open=False, elem_id="gfs-welcome-model-panel"',
            'open=False, elem_id="gfs-first-handoff"',
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn('submit_generation(', SOURCE)

    def test_v034_mobile_recovery_and_inline_routing_are_bounded(self):
        for token in (
            'elem_id="gfs-recovery-topic"',
            'elem_id="gfs-recovery-guide"',
            '#gfs-root #gfs-recovery-guide {min-width:0;max-width:100%',
            '#gfs-root #gfs-error-actions > * {flex:1 1 calc(50% - 3px)',
            'fn=diagnose_and_open_help',
            'suggest_recovery_topic(log_text)',
            'fn=clear_error_and_related_help',
        ):
            self.assertIn(token, SOURCE)
        self.assertIn("GomFoxStudio", META["app_tab"])

    def test_read_only_preflight_is_optional(self):
        for token in (
            "gr.Accordion(", "open=False", "format_studio_readiness(api_session)",
            "preflight_check.click(", "preflight_hardware.click(",
        ):
            self.assertIn(token, SOURCE)

    def test_offline_design_preview_keeps_four_local_assets(self):
        preview = ROOT / "docs" / "V012_VISUAL_PREVIEW.html"
        self.assertTrue(preview.is_file())
        html = preview.read_text(encoding="utf-8")
        for category in ("video", "image", "audio", "3d"):
            self.assertIn(f"category-{category}.webp", html)
        self.assertNotIn("<svg", html.casefold())
        self.assertNotIn("https://", html)

    def test_v016_design_rows_and_nonintrusive_compact_guide(self):
        for token in (
            'elem_id="gfs-category-grid-bottom"',
            '#gfs-root #gfs-category-grid,#gfs-root #gfs-category-grid-bottom {gap:12px',
            'background-position:left center,right center !important',
            '#gfs-root #gfs-banner {height:184px !important',
            '#gfs-root #gfs-banner {height:112px !important',
            'render_card_summary("")',
            'gfs-task-guide',
        ):
            self.assertIn(token, SOURCE)
        self.assertIn('video_button.click(fn=lambda: render_card_summary("짧은 영상")', SOURCE)

    def test_v019_crops_no_illustrations_and_queue_summary_is_separate(self):
        for token in (
            "background-size:100% 100%,auto 100% !important",
            "background-repeat:no-repeat,no-repeat !important",
            "#gfs-root #gfs-queue-overview",
            "#gfs-root #gfs-queue-result textarea",
            "queue_overview = gr.Markdown(",
            "outputs=[queue_overview, queue_result, queue_guidance,",
            "@media (max-width:420px)",
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn("background-size:cover !important", SOURCE)

    def test_v032_queue_guidance_reset_and_manual_gallery_review_are_read_only(self):
        for token in (
            '#gfs-root #gfs-queue-guidance',
            'elem_id="gfs-queue-guidance"',
            'queue_guidance = gr.Markdown(',
            'format_queue_dashboard_guided(api_session, show)',
            'outputs=[queue_overview, queue_result, queue_guidance,',
            'gallery_observed, gallery_file_opened, gallery_result]',
            'gallery_check.click(',
            'fn=format_gallery_confirmation',
            'elem_id="gfs-gallery-result"',
        ):
            self.assertIn(token, SOURCE)
        self.assertNotIn('cancel_queue_task(', SOURCE)
        self.assertNotIn('submit_task(', SOURCE)

    def test_v019_offline_preview_keeps_raster_art_and_distinguishes_mock_queue(self):
        preview = ROOT / "docs" / "V019_VISUAL_PREVIEW.html"
        html = preview.read_text(encoding="utf-8")
        for category in ("video", "image", "audio", "3d"):
            self.assertIn(f"category-{category}.webp", html)
        for token in (
            "background-size:100% 100%,auto 100%",
            "@media(max-width:420px)",
            "aria-live=\"polite\"",
            "예시 데이터",
            "오프라인 시각 배치 미리보기",
        ):
            self.assertIn(token, html)
        self.assertNotIn("<svg", html.casefold())
        self.assertNotIn("https://", html)

    def test_v016_visual_preview_matches_local_art_and_mobile_layout(self):
        preview = ROOT / "docs" / "V016_VISUAL_PREVIEW.html"
        html = preview.read_text(encoding="utf-8")
        for category in ("video", "image", "audio", "3d"):
            self.assertIn(f"category-{category}.webp", html)
        self.assertIn("@media(max-width:740px)", html)
        self.assertIn("height:112px", html)
        self.assertIn("grid-template-columns:repeat(2,minmax(0,1fr))", html)
        self.assertNotIn("<svg", html.casefold())
        self.assertNotIn("https://", html)


if __name__ == "__main__":
    unittest.main()
