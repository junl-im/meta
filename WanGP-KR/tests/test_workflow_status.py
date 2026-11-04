"""v0.8 원본 모델 상세 및 큐의 읽기 전용 동작 검사."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


MODULE_PATH = (
    Path(__file__).resolve().parents[1]
    / "plugin" / "wan2gp-gomfox-studio" / "catalog.py"
)
spec = importlib.util.spec_from_file_location("gomfox_catalog_v08", MODULE_PATH)
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


class FakeSession:
    def __init__(self):
        self.metadata_calls = 0
        self.queue_calls = 0

    def list_model_metadata(self):
        self.metadata_calls += 1
        return [{
            "model_type": "mock_image",
            "name": "Mock Image",
            "family_label": "Test",
            "main_output": ["image"],
        }]

    def get_model_schema(self, model_type):
        assert model_type == "mock_image"
        return {"inputs": ["text", "image"], "capabilities": {"text_to_image": True}}

    def get_model_availability(self, model_type):
        assert model_type == "mock_image"
        return {"files_ready": False}

    def list_queue(self):
        self.queue_calls += 1
        return {
            "total_count": 2,
            "running_count": 1,
            "queued_count": 1,
            "tasks": [
                {"queue_id": "q-1", "status": "running",
                 "model_type": "mock_image", "prompt": "개인적인 프롬프트"},
                {"queue_id": "q-2", "status": "queued", "model_type": "mock_image"},
            ],
        }


class WorkflowStatusTests(unittest.TestCase):
    def test_model_details_read_only_and_exact_id(self):
        session = FakeSession()
        result = catalog.format_model_details(session, "mock_image")
        self.assertIn("Mock Image", result)
        self.assertIn("text_to_image", result)
        self.assertIn('"files_ready": false', result)
        self.assertEqual(session.metadata_calls, 1)
        self.assertIn("일치하는 모델 ID가 없습니다", catalog.format_model_details(session, "missing"))

    def test_queue_counts_and_opt_in_prompt_visibility(self):
        session = FakeSession()
        hidden = catalog.format_queue_status(session)
        self.assertIn("전체 2개", hidden)
        self.assertIn("실행 중", hidden)
        self.assertNotIn("개인적인 프롬프트", hidden)
        visible = catalog.format_queue_status(session, True)
        self.assertIn("개인적인 프롬프트", visible)
        self.assertEqual(session.queue_calls, 2)

    def test_v019_queue_dashboard_returns_summary_and_details_from_one_read(self):
        session = FakeSession()
        summary, details = catalog.format_queue_dashboard(session)
        self.assertIn("**전체 2개**", summary)
        self.assertIn("**실행 중 1개**", summary)
        self.assertIn("**대기 1개**", summary)
        self.assertIn("전체 2개", details)
        self.assertNotIn("개인적인 프롬프트", summary + details)
        self.assertEqual(session.queue_calls, 1)

        summary2, details2 = catalog.format_queue_dashboard(session, True)
        self.assertEqual(summary2, summary)
        self.assertIn("개인적인 프롬프트", details2)
        self.assertEqual(session.queue_calls, 2)

    def test_v019_unavailable_queue_has_matching_safe_summary(self):
        summary, details = catalog.format_queue_dashboard(None)
        self.assertIn("연결 확인 필요", summary)
        self.assertIn("원본 큐 상태 API", details)

    def test_missing_api_does_not_generate_or_mutate(self):
        self.assertIn("이용할 수 없습니다", catalog.format_queue_status(None))
        self.assertIn("연결할 수 없습니다", catalog.format_model_details(None, "mock_image"))

    def test_ill_formed_response_does_not_crash(self):
        class Odd:
            def list_queue(self):
                return {"total_count": "unknown", "tasks": "wrong"}
        self.assertIn("형식이 올바르지 않습니다", catalog.format_queue_status(Odd()))


if __name__ == "__main__":
    unittest.main()
