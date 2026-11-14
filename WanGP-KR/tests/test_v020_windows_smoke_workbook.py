"""Offline v0.20 Windows first-generation workbook contract tests.

These tests verify source and JavaScript syntax, not a Windows/GPU session.
"""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
import unittest


ROOT = Path(__file__).resolve().parents[1]
BOOK_PATH = ROOT / "docs" / "V020_WINDOWS_SMOKE_WORKBOOK.html"


class HTMLInventory(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags: list[str] = []
        self.ids: set[str] = set()
        self.actions: set[str] = set()
        self.remote_assets: list[str] = []

    def handle_starttag(self, tag, attrs):
        self.tags.append(tag)
        data = dict(attrs)
        if "id" in data:
            self.ids.add(data["id"])
        if "data-stage" in data:
            self.actions.add(data["data-stage"])
        for key in ("src", "href"):
            if data.get(key, "").startswith(("http:", "https:", "//")):
                self.remote_assets.append(data[key])


class TestV020WindowsSmokeWorkbook(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = BOOK_PATH.read_text(encoding="utf-8")
        cls.dom = HTMLInventory()
        cls.dom.feed(cls.page)
        cls.script = re.search(r"<script>\s*(.*?)\s*</script>", cls.page, re.S).group(1)

    def test_standalone_offline_no_svg_or_remote_assets(self):
        self.assertTrue(self.page.startswith("<!doctype html>"))
        self.assertIn('<html lang="ko">', self.page)
        self.assertFalse(any(t in ("svg", "iframe", "canvas") for t in self.dom.tags))
        self.assertEqual(self.dom.remote_assets, [])
        for forbidden in ("data:image/svg", "<svg", "fetch(", "XMLHttpRequest", "localStorage", "sessionStorage"):
            self.assertNotIn(forbidden, self.page)

    def test_four_steps_and_manual_controls_are_present(self):
        self.assertEqual(self.dom.actions, {"pc", "run", "make", "report"})
        self.assertTrue({
            "os", "ram", "gpu", "vram", "integrity", "engine", "korean", "art", "model",
            "start-timer", "stop-timer", "outcome", "saved", "summary", "export", "copy",
        } <= self.dom.ids)
        self.assertIn("@media(max-width:800px)", self.page)
        self.assertIn("aria-live", self.page)

    def test_timer_is_measurement_only_and_export_is_local(self):
        self.assertIn("performance.now()", self.script)
        self.assertIn("setInterval(tick,350)", self.script)
        self.assertIn("URL.createObjectURL(file)", self.script)
        self.assertIn("URL.revokeObjectURL(url)", self.script)
        self.assertIn("text/plain;charset=utf-8", self.script)
        self.assertIn("(자동 생성·GPU 검증 결과 아님)", self.script)
        self.assertIn("지원 모델 없음 / 미시도", self.script)
        self.assertIn("외부 서버 전송 기능은 없습니다", self.page)

    @unittest.skipUnless(shutil.which("node"), "Node.js is unavailable")
    def test_embedded_javascript_is_syntactically_valid(self):
        completed = subprocess.run(
            ["node", "--check", "-"], input=self.script, text=True,
            capture_output=True, timeout=10, check=False,
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)


if __name__ == "__main__":
    unittest.main()
