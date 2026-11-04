"""시작 점검은 파일 형식과 원본 읽기 API만 확인하고 부작용을 만들지 않는다."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


PLUGIN_DIR = Path(__file__).resolve().parents[1] / "plugin" / "wan2gp-gomfox-studio"
MODULE = PLUGIN_DIR / "studio_check.py"
spec = importlib.util.spec_from_file_location("gomfox_studio_check", MODULE)
assert spec and spec.loader
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


class ReadinessTests(unittest.TestCase):
    def test_bundled_art_and_missing_api_report(self):
        report = check.format_studio_readiness(None)
        self.assertIn("4/4개", report)
        self.assertIn("연결 확인 불가", report)
        self.assertIn("외부 전송은 수행하지 않았습니다", report)

    def test_session_queries_metadata_once_without_submitting(self):
        class SafeSession:
            calls = 0
            def list_model_metadata(self):
                self.calls += 1
                return [{"model_type": "a"}, {"model_type": "b"}]
            def list_queue(self):
                raise AssertionError("큐는 호출하면 안 됩니다")
            def submit_task(self):
                raise AssertionError("생성하면 안 됩니다")

        session = SafeSession()
        report = check.format_studio_readiness(session)
        self.assertIn("메타데이터 2개", report)
        self.assertIn("작업 큐: 조회 API 있음", report)
        self.assertEqual(session.calls, 1)

    def test_broken_art_does_not_crash(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "category-video.webp").write_bytes(b"not a webp")
            report = check.format_studio_readiness(None, root)
        self.assertIn("0/4개", report)
        self.assertIn("손상되었습니다", report)

    def test_bad_or_throwing_model_api_is_recoverable(self):
        class BadSession:
            def list_model_metadata(self):
                raise RuntimeError("private path or credential not safe to show")

        report = check.format_studio_readiness(BadSession())
        self.assertIn("조회 실패 (RuntimeError)", report)
        self.assertNotIn("credential", report)


if __name__ == "__main__":
    unittest.main()
