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

    def test_missing_api_is_safe(self):
        self.assertIn("연결을 확인할 수 없습니다", catalog.format_model_catalog(None))


if __name__ == "__main__":
    unittest.main()
