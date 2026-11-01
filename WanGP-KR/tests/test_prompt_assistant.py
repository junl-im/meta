"""프롬프트 도우미는 외부 연결·모델 실행 없이 안전한 텍스트만 만든다."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "plugin" / "wan2gp-gomfox-studio" / "prompt_assistant.py"
SPEC = importlib.util.spec_from_file_location("gomfox_prompt_assistant", MODULE_PATH)
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class PromptAssistantTests(unittest.TestCase):
    def test_categories_have_valid_drafts(self):
        for kind in module.TASK_KINDS:
            prompt, advice = module.build_prompt(kind, "숲 속 작은 여우", module.STYLES[0], "낮 햇살", "절약")
            self.assertIn("숲 속 작은 여우", prompt)
            self.assertIn("낮 햇살", prompt)
            self.assertIn("절약 시작", advice)
            self.assertIn(module.TASK_HINTS[kind], advice)

    def test_empty_input_never_invents_subject(self):
        prompt, advice = module.build_prompt("영상", "  ", "잘못된 값", "", "고품질")
        self.assertIn("입력해 주세요", prompt)
        self.assertIn("고품질 시작", advice)

    def test_unknown_fields_fall_back_to_safe_presets(self):
        prompt, advice = module.build_prompt("invalid", "나무", "invalid", "", "invalid")
        self.assertIn("한 장의 이미지", prompt)
        self.assertIn("절약 시작", advice)

    def test_text_cleaning_is_bounded_and_single_line(self):
        prompt, _ = module.build_prompt("영상", "가" * 500 + "\n개", module.STYLES[0], "나" * 300, "균형")
        self.assertNotIn("가" * 361, prompt)
        self.assertNotIn("나" * 241, prompt)
        self.assertIn("균형 시작", module.build_prompt("영상", "나무", "", "", "균형")[1])

    def test_pure_module_has_no_network_or_filesystem_import(self):
        code = MODULE_PATH.read_text(encoding="utf-8")
        for forbidden in ("requests", "httpx", "openai", "subprocess", "os.system", "write_text", "torch", "gradio"):
            self.assertNotIn(forbidden, code)


if __name__ == "__main__":
    unittest.main()
