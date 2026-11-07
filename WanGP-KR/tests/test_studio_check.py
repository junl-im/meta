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
        self.assertIn("1단계 · 한글 화면", report)
        self.assertIn("2단계 · 원본 연결", report)
        self.assertIn("3단계 · 실제 생성: 미검증", report)

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
        self.assertIn("원본 모델 목록 조회 API가 응답했습니다", report)
        self.assertIn("작업 내용을 읽지 않았습니다", report)
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
        self.assertIn("조회 중 오류가 발생했습니다", report)

    def test_connection_triage_does_not_confuse_empty_or_invalid_metadata_with_success(self):
        class EmptySession:
            def list_model_metadata(self):
                return []

        class WrongShapeSession:
            def list_model_metadata(self):
                return {"models": ["a"]}

        empty = check.format_studio_readiness(EmptySession())
        invalid = check.format_studio_readiness(WrongShapeSession())
        self.assertIn("원본 모델 목록 응답은 받았지만 메타데이터가 비었습니다", empty)
        self.assertIn("예상과 다릅니다", invalid)
        self.assertIn("3단계 · 실제 생성: 미검증", empty)
        self.assertIn("3단계 · 실제 생성: 미검증", invalid)

        class WrongItemsSession:
            def list_model_metadata(self):
                return [{"model_type": "a"}, "broken-record"]

        mixed = check.format_studio_readiness(WrongItemsSession())
        self.assertIn("예상과 다른 항목", mixed)
        self.assertNotIn("메타데이터 1개", mixed)

    def test_connection_check_recovers_from_property_errors_without_leaking_details(self):
        class BrokenProperties:
            @property
            def list_model_metadata(self):
                raise RuntimeError("PRIVATE_TOKEN_IN_PROPERTY")

            @property
            def list_queue(self):
                raise RuntimeError("PRIVATE_TOKEN_IN_QUEUE")

        result = check.format_studio_readiness(BrokenProperties())
        self.assertIn("원본 API 세션 또는 모델 목록 함수가 제공되지 않았습니다", result)
        self.assertIn("원본 작업 큐: 연결 확인 불가", result)
        self.assertNotIn("PRIVATE_TOKEN", result)


class ErrorDiagnosisTests(unittest.TestCase):
    def test_v034_error_patterns_route_to_fixed_recovery_topics_without_log_leaks(self):
        examples = {
            "CUDA out of memory": "모델 다운로드·생성이 멈춘 것 같아요",
            "No space left on device": "모델 다운로드·생성이 멈춘 것 같아요",
            "RuntimeError: CUDA driver version is insufficient": "모델 다운로드·생성이 멈춘 것 같아요",
            "Failed to load plugin wan2gp-gomfox-studio": "한글 스튜디오 탭이 안 보여요",
            "ModuleNotFoundError: No module named gradio": "원본 WanGP가 열리지 않아요",
            "HTTP 403 download failed": "모델 다운로드·생성이 멈춘 것 같아요",
            "[WinError 10048] address already in use": "원본 WanGP가 열리지 않아요",
            "FileNotFoundError: model not found": "원본 WanGP가 열리지 않아요",
        }
        for sample, target in examples.items():
            with self.subTest(sample=sample):
                self.assertEqual(check.suggest_recovery_topic(sample + "\nSECRET_TOKEN_981"), target)
        self.assertIsNone(check.suggest_recovery_topic("unknown error SECRET_TOKEN_981"))
        self.assertIsNone(check.suggest_recovery_topic(""))
        self.assertIsNone(check.suggest_recovery_topic(None))
        self.assertIsNone(check.suggest_recovery_topic(12345))
        self.assertEqual(
            check.suggest_recovery_topic("CUDA out of memory\nNo space left on device"),
            "모델 다운로드·생성이 멈춘 것 같아요",
        )

    def test_clear_pasted_log_does_not_echo_or_retry_it(self):
        value, hint = check.clear_error_diagnosis()
        self.assertEqual(value, "")
        self.assertIn("입력란을 비웠습니다", hint)

    def test_known_errors_are_classified_without_echoing_user_log(self):
        samples = {
            "RuntimeError: CUDA out of memory": "GPU 또는 시스템 메모리 부족",
            "OSError: [WinError 112] Not enough space": "저장 공간 부족",
            "RuntimeError: CUDA driver version is insufficient": "GPU 드라이버·CUDA 호환성",
            "Failed to load plugin wan2gp-gomfox-studio": "한글 플러그인 로딩",
            "ModuleNotFoundError: No module named 'gradio'": "Python 모듈",
            "HTTP 403 download model failed": "모델 다운로드·네트워크",
            "OSError: [WinError 10048] address already in use": "실행 포트",
            "FileNotFoundError: C:\\Users\\Name\\model.safetensors": "필수 파일 경로",
        }
        for error, expected in samples.items():
            with self.subTest(error=error):
                output = check.format_error_diagnosis(error + "\nSECRET_TOKEN_981")
                self.assertIn(expected, output)
                self.assertIn("실제 원인이나 GPU 호환성을 자동 확인한 것은 아닙니다", output)
                self.assertNotIn("SECRET_TOKEN_981", output)
                self.assertNotIn(error, output)

    def test_disk_full_is_more_specific_than_memory_message(self):
        report = check.format_error_diagnosis("CUDA out of memory\nNo space left on device")
        self.assertIn("저장 공간 부족", report)

    def test_unknown_or_empty_does_not_invent_a_successful_diagnosis(self):
        self.assertIn("원인을 아직 구분할 수 없습니다", check.format_error_diagnosis("hello world"))
        self.assertIn("오류 문장을 입력", check.format_error_diagnosis(""))
        self.assertIn("오류 문장을 입력", check.format_error_diagnosis(None))

    def test_long_untrusted_input_is_bounded_to_last_twenty_thousand_characters(self):
        long_message = "x" * 50000 + "\nCUDA out of memory"
        output = check.format_error_diagnosis(long_message)
        self.assertIn("메모리 부족", output)
        self.assertLess(len(output), 900)


if __name__ == "__main__":
    unittest.main()
