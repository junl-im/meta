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
        self.assertIn("data:image/webp;base64,", SOURCE)
        self.assertIn("category_art_css()", SOURCE)
        for forbidden in ("<svg", "data:image/svg", "cdn.jsdelivr"):
            self.assertNotIn(forbidden, SOURCE.casefold())

    def test_free_mode_and_all_task_categories(self):
        for text in (
            "무료 제작 · 시작", "영상 제작", "이미지 제작",
            "음성 · 음악", "3D · 월드", "원본 WanGP 무료 제작 화면 열기",
        ):
            self.assertIn(text, SOURCE)
        self.assertIn("fn=self.goto_media_tab", SOURCE)
        self.assertIn('render_guide("짧은 영상")', SOURCE)
        self.assertIn('render_guide("사진·그림")', SOURCE)
        self.assertIn('render_guide("목소리·음악")', SOURCE)
        self.assertIn('render_guide("3D 만들기")', SOURCE)
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
            "작업 현황 · 갤러리", "format_queue_status", "format_model_details",
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

    def test_plugin_metadata_matches(self):
        self.assertEqual(META["version"], "0.12.0-dev")
        self.assertIn("GomFoxStudio", META["app_tab"])

    def test_offline_design_preview_keeps_four_local_assets(self):
        preview = ROOT / "docs" / "V012_VISUAL_PREVIEW.html"
        self.assertTrue(preview.is_file())
        html = preview.read_text(encoding="utf-8")
        for category in ("video", "image", "audio", "3d"):
            self.assertIn(f"category-{category}.webp", html)
        self.assertNotIn("<svg", html.casefold())
        self.assertNotIn("https://", html)


if __name__ == "__main__":
    unittest.main()
