"""곰같은여우의 AI 스튜디오: 원본 API 모델 목록 필터/페이지 단위 테스트.

별도 GPU, WanGP 패키지, 그라디오 설치 없이 동작하는 순수 Python 테스트.
"""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


CATALOG_PATH = (
    Path(__file__).resolve().parents[1]
    / "plugin"
    / "wan2gp-gomfox-studio"
    / "catalog.py"
)
SPEC = importlib.util.spec_from_file_location("gomfox_studio_catalog", CATALOG_PATH)
assert SPEC is not None and SPEC.loader is not None
catalog = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(catalog)


class FakeSession:
    def __init__(self, records):
        self.records = records
        self.calls = 0

    def list_model_metadata(self):
        self.calls += 1
        return self.records


class TestModelCatalog(unittest.TestCase):
    def setUp(self):
        self.session = FakeSession(
            [
                {"name": "모델 A", "model_type": "v1", "main_output": ["video"]},
                {"name": "모델 B", "model_type": "i1", "main_output": ["image"]},
                {"name": "모델 C", "model_type": "a1", "main_output": ["audio"]},
                {"name": "모델 D", "model_type": "mesh1", "main_output": ["3d"]},
                {"name": "모델 E", "model_type": "w1", "main_output": ["world"]},
                {"name": "미래 모델", "model_type": "unknown1", "main_output": ["future"]},
                {"name": "복합 모델", "model_type": "multi1", "main_output": ["image", "video"]},
            ]
        )

    def test_entire_upstream_catalog_includes_unknown_new_model(self):
        result = catalog.format_model_catalog(self.session)
        self.assertIn("검색 결과: 7개", result)
        self.assertIn("미래 모델", result)
        self.assertEqual(self.session.calls, 1)

    def test_category_filter_does_not_hide_multimodal_models(self):
        result = catalog.format_model_catalog(self.session, "영상")
        self.assertIn("모델 A", result)
        self.assertIn("복합 모델", result)
        self.assertNotIn("모델 B", result)
        self.assertIn("검색 결과: 2개", result)

    def test_3d_and_other(self):
        self.assertIn("모델 D", catalog.format_model_catalog(self.session, "3D"))
        result = catalog.format_model_catalog(self.session, "기타")
        self.assertIn("미래 모델", result)
        self.assertNotIn("모델 D", result)

    def test_search(self):
        result = catalog.format_model_catalog(self.session, "전체", "MULTI1")
        self.assertIn("복합 모델", result)
        self.assertIn("검색 결과: 1개", result)

    def test_v029_model_picker_uses_one_read_and_matches_visible_page(self):
        report, options = catalog.format_model_catalog_page(self.session, "영상", "MULTI1")
        self.assertIn("검색 결과: 1개", report)
        self.assertEqual(options, [("복합 모델 [multi1]", "multi1")])
        self.assertEqual(self.session.calls, 1)

    def test_v029_model_picker_resets_on_errors_and_out_of_range_page(self):
        class Broken(FakeSession):
            def list_model_metadata(self):
                raise RuntimeError("secret-path")

        text, options = catalog.format_model_catalog_page(Broken([]))
        self.assertIn("조회에 실패", text)
        self.assertEqual(options, [])
        self.assertNotIn("secret-path", text)
        text, options = catalog.format_model_catalog_page(self.session, "전체", "", 5)
        self.assertIn("페이지는 없습니다", text)
        self.assertEqual(options, [])

    def test_pagination_and_invalid_page(self):
        session = FakeSession([
            {"name": f"모델 {i:03}", "model_type": str(i), "main_output": "video"}
            for i in range(43)
        ])
        first = catalog.format_model_catalog(session, "전체", "", 1)
        second = catalog.format_model_catalog(session, "전체", "", 2)
        self.assertIn("1 / 2페이지", first)
        self.assertIn("41. 모델 040", second)
        self.assertNotIn("모델 000", second)
        self.assertIn("마지막 페이지는 2", catalog.format_model_catalog(session, "전체", "", 3))
        self.assertIn("1 / 2페이지", catalog.format_model_catalog(session, "전체", "", float("nan")))
        _report, options = catalog.format_model_catalog_page(session, "전체", "", 2)
        self.assertEqual(len(options), 3)
        self.assertEqual(options[0][1], "40")

    def test_missing_api_is_safe(self):
        self.assertIn("연결을 확인할 수 없습니다", catalog.format_model_catalog(None))

    def test_v028_catalog_hides_upstream_errors_and_rejects_malformed_records(self):
        class Leaky(FakeSession):
            def list_model_metadata(self):
                raise RuntimeError(r"access denied C:\Users\private\secret-token")

        failed = catalog.format_model_catalog(Leaky([]))
        self.assertIn("조회에 실패했습니다", failed)
        self.assertNotIn("secret-token", failed)
        self.assertNotIn("C:\\Users", failed)
        malformed = catalog.format_model_catalog(FakeSession({"not": "records"}))
        self.assertIn("응답 형식", malformed)

    def test_v028_catalog_limits_line_breaks_from_upstream_metadata(self):
        session = FakeSession([{
            "name": "정상 모델\n임의 출력", "model_type": "id\nsecond", "main_output": ["image\nvideo"]
        }])
        report = catalog.format_model_catalog(session)
        self.assertIn("정상 모델 임의 출력 [id second]", report)
        self.assertNotIn("\n임의 출력", report)

    def test_v026_preflight_distinguishes_model_files_from_gpu_execution(self):
        class ModelSession(FakeSession):
            def __init__(self, records, ready):
                super().__init__(records)
                self.ready = ready
                self.availability_calls = 0

            def get_model_availability(self, model_type):
                self.availability_calls += 1
                self.last_id = model_type
                return self.ready

        session = ModelSession([
            {"name": "Mock Video", "model_type": "video-one", "main_output": ["video"]}
        ], {"files_ready": False})
        report = catalog.format_model_preflight(session, "video-one", {
            "ram_gib": 16, "gpu_devices": [{"name": "A", "vram_gib": 3.5}]
        })
        self.assertIn("아직 준비되지 않았습니다", report)
        self.assertIn("3.5GB", report)
        self.assertIn("RAM 16GB급", report)
        self.assertIn("영상·3D·월드", report)
        self.assertIn("실행 성공·속도·화질을 예측할 수 없습니다", report)
        self.assertEqual(session.calls, 1)
        self.assertEqual(session.availability_calls, 1)
        self.assertEqual(session.last_id, "video-one")

        session.ready = {"files_ready": True}
        report = catalog.format_model_preflight(session, "video-one", {
            "ram_gib": 16, "gpu_devices": []
        }, 6)
        self.assertIn("필수 모델 파일 준비됨", report)
        self.assertIn("사용자가 직접 확인했다고 입력한 전용 VRAM: 6GB", report)
        self.assertIn("실측 검증 아님", report)
        self.assertNotIn("실행 가능합니다", report)

    def test_v026_preflight_does_not_guess_vram_or_accept_bad_numbers(self):
        session = FakeSession([{"name": "Mock Image", "model_type": "img1", "main_output": "image"}])
        for value in (float("nan"), float("inf"), -1, 0, True, "4096", 10000):
            with self.subTest(value=value):
                report = catalog.format_model_preflight(session, "img1", {
                    "ram_gib": 16, "gpu_devices": [{"name": "Broken", "vram_gib": value}]
                }, value)
                self.assertIn("자동 감지한 전용 VRAM: 확인되지 않음", report)
                self.assertIn("유효하지 않아 비교에 사용하지 않았습니다", report)
                self.assertIn("작업 관리자", report)

    def test_v026_preflight_handles_missing_and_odd_upstream_data_without_echo(self):
        self.assertIn("모델 ID를 입력", catalog.format_model_preflight(None, "", None))
        self.assertIn("연결을 확인할 수 없습니다", catalog.format_model_preflight(None, "id", None))
        self.assertIn("정확한 ID", catalog.format_model_preflight(FakeSession([]), "bad-id", None))
        self.assertIn("예상한 형식", catalog.format_model_preflight(FakeSession("wrong"), "id", None))

        class Leaky(FakeSession):
            def list_model_metadata(self):
                raise RuntimeError("secret-token-from-upstream")
        result = catalog.format_model_preflight(Leaky([]), "id", None)
        self.assertIn("조회에 실패했습니다", result)
        self.assertNotIn("secret-token", result)


if __name__ == "__main__":
    unittest.main()
