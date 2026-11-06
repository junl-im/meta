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

    def test_v031_guided_running_queue_reads_once_and_never_guesses_progress(self):
        session = FakeSession()
        summary, details, guidance = catalog.format_queue_dashboard_guided(session)
        self.assertIn("실행 중 1개", summary)
        self.assertIn("다음 행동 · 실행 중", guidance)
        self.assertIn("진행률(%)", details + guidance)
        self.assertNotIn("개인적인 프롬프트", summary + details + guidance)
        self.assertEqual(session.queue_calls, 1)

    def test_v031_guided_statuses_cover_queued_cancelling_and_idle(self):
        class Queue:
            def __init__(self, data):
                self.data = data
                self.calls = 0

            def list_queue(self):
                self.calls += 1
                return self.data

        for status, expected in (
            ("queued", "다음 행동 · 대기 중"),
            ("cancelling", "다음 행동 · 취소 처리 중"),
            ("idle", "다음 행동 · 현재 대기·실행 작업 없음"),
        ):
            with self.subTest(status=status):
                tasks = [] if status == "idle" else [{"status": status, "model_type": "image"}]
                session = Queue({"total_count": len(tasks), "running_count": 0,
                                 "queued_count": 1 if status == "queued" else 0, "tasks": tasks})
                _, details, guidance = catalog.format_queue_dashboard_guided(session)
                self.assertIn(expected, guidance)
                self.assertEqual(session.calls, 1)
                if status == "idle":
                    self.assertIn("성공·실패를 알 수 없습니다", guidance)
                    self.assertIn("갤러리", details)

    def test_v031_guided_unknown_counts_malformed_response_and_errors_are_safe(self):
        class Response:
            def __init__(self, data):
                self.data = data

            def list_queue(self):
                return self.data

        summary, details, guidance = catalog.format_queue_dashboard_guided(
            Response({"total_count": "secret-token", "running_count": True,
                      "queued_count": -1, "tasks": []})
        )
        self.assertIn("전체 ?개", summary)
        self.assertIn("상태 미확인", guidance)
        self.assertNotIn("secret-token", summary + details + guidance)
        self.assertIn("목록 확인 필요", catalog.format_queue_dashboard_guided(Response({"tasks": "oops"}))[2])
        self.assertIn("상태 미확인", catalog.format_queue_dashboard_guided(Response("not-a-dict"))[2])

        class Broken:
            def list_queue(self):
                raise ValueError("secret-token")

        self.assertIn("조회 실패", catalog.format_queue_dashboard_guided(Broken())[2])
        self.assertNotIn("secret-token", " ".join(catalog.format_queue_dashboard_guided(Broken())))
        self.assertIn("연결 확인", catalog.format_queue_dashboard_guided(None)[2])

    def test_v031_guided_optional_prompt_is_one_line_and_never_prints_objects(self):
        class Response:
            def list_queue(self):
                return {"total_count": 1, "running_count": 1, "queued_count": 0,
                        "tasks": [{"status": "running", "model_type": "image",
                                   "prompt": {"secret": "token"}}]}

        _summary, details, _guidance = catalog.format_queue_dashboard_guided(Response(), True)
        self.assertNotIn("secret", details)
        self.assertNotIn("token", details)

    def test_v032_gallery_confirmation_is_user_report_not_api_success(self):
        options = catalog.GALLERY_CONFIRM_CHOICES
        self.assertEqual(len(options), 4)
        self.assertIn("미확인", catalog.format_gallery_confirmation(options[0], False))
        self.assertIn("파일 확인 남음", catalog.format_gallery_confirmation(options[1], False))
        confirmed = catalog.format_gallery_confirmation(options[1], True)
        self.assertIn("사용자가 직접 확인", confirmed)
        self.assertIn("실제 파일", confirmed)
        self.assertIn("오류 원인 확인", catalog.format_gallery_confirmation(options[2], False))
        self.assertIn("결과 확인 필요", catalog.format_gallery_confirmation(options[3], False))
        self.assertIn("서로 맞지", catalog.format_gallery_confirmation(options[2], True))
        self.assertIn("서로 맞지", catalog.format_gallery_confirmation(options[0], True))
        self.assertIn("미확정", catalog.format_gallery_confirmation("secret-token", False))
        self.assertNotIn("secret-token", catalog.format_gallery_confirmation("secret-token", False))
        self.assertIn("미확정", catalog.format_gallery_confirmation(options[1], "yes"))

    def test_missing_api_does_not_generate_or_mutate(self):
        self.assertIn("이용할 수 없습니다", catalog.format_queue_status(None))
        self.assertIn("연결할 수 없습니다", catalog.format_model_details(None, "mock_image"))

    def test_ill_formed_response_does_not_crash(self):
        class Odd:
            def list_queue(self):
                return {"total_count": "unknown", "tasks": "wrong"}
        self.assertIn("형식이 올바르지 않습니다", catalog.format_queue_status(Odd()))

    def test_v028_model_details_does_not_reveal_paths_tokens_or_exception_text(self):
        class Sensitive(FakeSession):
            def get_model_availability(self, model_type):
                return {"files_ready": False, "local_path": r"C:\Users\private\model", "api_key": "secret-token"}

        report = catalog.format_model_details(Sensitive(), "mock_image")
        self.assertIn('"files_ready": false', report)
        self.assertNotIn("private", report)
        self.assertNotIn("secret-token", report)

        class Broken(Sensitive):
            def get_model_availability(self, model_type):
                raise RuntimeError("secret-token-from-model-api")

        failed = catalog.format_model_details(Broken(), "mock_image")
        self.assertIn("상태 조회에 실패했습니다", failed)
        self.assertNotIn("secret-token", failed)

        class BrokenCatalog(Sensitive):
            def list_model_metadata(self):
                raise OSError("secret-token-from-list")

        failed_catalog = catalog.format_model_details(BrokenCatalog(), "mock_image")
        self.assertIn("목록 조회에 실패했습니다", failed_catalog)
        self.assertNotIn("secret-token", failed_catalog)

    def test_v028_queue_errors_hidden_and_status_single_line(self):
        class Broken:
            def list_queue(self):
                raise RuntimeError("secret-token-from-queue")

        summary, details = catalog.format_queue_dashboard(Broken())
        self.assertIn("조회 실패", summary)
        self.assertNotIn("secret-token", details)

        class Odd:
            def list_queue(self):
                return {"tasks": [{"status": "custom\nnew row", "model_type": "id\nnew row"}]}

        _summary, report = catalog.format_queue_dashboard(Odd())
        self.assertIn("custom new row · id new row", report)
        self.assertNotIn("\nnew row", report)


if __name__ == "__main__":
    unittest.main()
