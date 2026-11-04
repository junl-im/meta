"""도움말이 기본 무료 모드·선택 GPT 원칙을 유지하는지 확인한다."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


HELP_PATH = (
    Path(__file__).resolve().parents[1]
    / "plugin"
    / "wan2gp-gomfox-studio"
    / "help_content.py"
)
SPEC = importlib.util.spec_from_file_location("gomfox_studio_help", HELP_PATH)
assert SPEC is not None and SPEC.loader is not None
help_content = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(help_content)


class TestHelpContent(unittest.TestCase):
    def test_all_topics_have_korean_guides(self):
        self.assertGreaterEqual(len(help_content.TOPICS), 9)
        for topic in help_content.TOPICS:
            self.assertIn("###", help_content.render_guide(topic))
            self.assertGreater(len(help_content.render_guide(topic)), 70)

    def test_default_help_is_beginner_friendly(self):
        default = help_content.render_guide("처음 시작")
        self.assertIn("5단계", default)
        self.assertIn("GPT 로그인이 필요하지 않습니다", default)
        self.assertIn("갤러리", default)

    def test_gpt_is_optional(self):
        guide = help_content.render_guide("GPT는 선택")
        self.assertIn("GPT 없이 가능", guide)
        self.assertIn("Deepy Prime", guide)
        self.assertIn("외부에 전송", guide)

    def test_low_spec_guide_is_honest(self):
        guide = help_content.render_guide("저사양 설정")
        self.assertIn("RAM 16GB", guide)
        self.assertIn("VRAM", guide)
        self.assertIn("모든 모델", guide)

    def test_unknown_topic_returns_start(self):
        self.assertEqual(
            help_content.render_guide("존재하지 않는 메뉴"),
            help_content.render_guide("처음 시작"),
        )

    def test_troubleshooting_has_six_specific_safe_paths(self):
        self.assertEqual(len(help_content.TROUBLESHOOT_TOPICS), 6)
        for topic in help_content.TROUBLESHOOT_TOPICS:
            guide = help_content.render_troubleshooting(topic)
            self.assertIn("###", guide)
            self.assertGreater(len(guide), 180)
            self.assertIn("1.", guide)
        self.assertIn("Apps & PlugIn Manager", help_content.render_troubleshooting("한글 스튜디오 탭이 안 보여요"))
        self.assertIn("SHA-256", help_content.render_troubleshooting("그림 카드가 비거나 잘려 보여요"))
        self.assertIn("GPT나 유료 서비스로 자동 전환하지 않습니다", help_content.render_troubleshooting("모델 다운로드·생성이 멈춘 것 같아요"))
        self.assertIn("GPT 연결·외부 전송·유료 GPU는 기본 작업에 필수가 아닙니다", help_content.render_troubleshooting("GPT 없이 무료로 만들고 싶어요"))

    def test_unknown_problem_never_echoes_input_or_generates_commands(self):
        hostile = "<script>alert(1)</script>"
        self.assertEqual(
            help_content.render_troubleshooting(hostile),
            help_content.render_troubleshooting(help_content.TROUBLESHOOT_TOPICS[0]),
        )
        self.assertNotIn(hostile, help_content.render_troubleshooting(hostile))

    def test_v019_card_guides_are_compact_and_cover_four_illustrations(self):
        self.assertEqual(len(help_content.CARD_SUMMARIES), 4)
        for topic, content in help_content.CARD_SUMMARIES.items():
            self.assertIn("###", help_content.render_card_summary(topic))
            self.assertIn("다음 행동", content)
            self.assertLess(len(content), 250)
            self.assertLess(len(content), len(help_content.render_guide(topic)))
        self.assertIn("카드를 하나 선택해 보세요", help_content.render_card_summary("<svg"))
        self.assertNotIn("<svg", help_content.render_card_summary("<svg"))


if __name__ == "__main__":
    unittest.main()
