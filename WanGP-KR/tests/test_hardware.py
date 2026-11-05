"""GPU 없이 저사양 안내·알 수 없는 하드웨어 동작을 검사한다."""

from __future__ import annotations

import importlib.util
import math
import unittest
from pathlib import Path


HARDWARE_PATH = (
    Path(__file__).resolve().parents[1]
    / "plugin"
    / "wan2gp-gomfox-studio"
    / "hardware.py"
)
SPEC = importlib.util.spec_from_file_location("gomfox_studio_hardware", HARDWARE_PATH)
assert SPEC is not None and SPEC.loader is not None
hardware = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(hardware)


class TestHardwareGuidance(unittest.TestCase):
    def test_six_gb_reports_low_vram(self):
        result = hardware.format_hardware_report({
            "operating_system": "Windows",
            "ram_gib": 16,
            "gpu_devices": [{"name": "Example GPU", "vram_gib": 6}],
            "gpu_names": [],
        })
        self.assertIn("Example GPU", result)
        self.assertIn("6GB", result)
        self.assertIn("짧은 저해상도", result)
        self.assertIn("RAM 16GB급", result)

    def test_four_gb_caution(self):
        self.assertIn("보장하지 않습니다", hardware._recommend_vram(4))
        self.assertIn("어려울 수", hardware._recommend_vram(2))

    def test_unknown_vram_has_manual_fallback(self):
        result = hardware.format_hardware_report({
            "operating_system": "Windows",
            "ram_gib": 16,
            "gpu_devices": [],
            "gpu_names": ["Intel UHD Graphics"],
        })
        self.assertIn("Intel UHD Graphics", result)
        self.assertIn("전용 GPU 메모리", result)
        self.assertIn("모델 설치·GPU 설정·유료 연결을 실행하지 않습니다", result)

    def test_multi_gpu_uses_highest_observed_vram(self):
        result = hardware.format_hardware_report({
            "operating_system": "Windows",
            "ram_gib": 32,
            "gpu_devices": [
                {"name": "GPU A", "vram_gib": 2},
                {"name": "GPU B", "vram_gib": 12},
            ],
            "gpu_names": [],
        })
        self.assertIn("12.0GB", result)
        self.assertIn("GPU B", result)
        self.assertIn("CUDA GPU 0: GPU A · 2GB", result)
        self.assertIn("CUDA GPU 1: GPU B · 12GB", result)
        self.assertIn("원본 WanGP가 그 GPU를 사용한다는 의미는 아닙니다", result)
        self.assertNotIn("RAM 16GB급", result)

    def test_invalid_vram_values_are_never_mistaken_for_large_gpu(self):
        for invalid in (math.nan, math.inf, -math.inf, -1, 0, True, 99999, "16"):
            with self.subTest(invalid=invalid):
                info = {"operating_system": "Windows", "ram_gib": 16,
                        "gpu_devices": [{"name": "Invalid GPU", "vram_gib": invalid}]}
                report = hardware.format_hardware_report(info)
                plan = hardware.format_first_run_plan(info)
                self.assertIn("전용 VRAM: 자동 확인 실패", report)
                self.assertIn("용량 확인 불가", report)
                self.assertIn("GPU 지원 여부는 아직 미확인", plan)
                self.assertIn("전용 GPU 메모리", hardware._recommend_vram(invalid))

    def test_invalid_ram_does_not_claim_sixteen_gb_limit(self):
        for invalid in (math.nan, math.inf, -8, 0, True, 99999, "16"):
            with self.subTest(invalid=invalid):
                report = hardware.format_hardware_report({
                    "operating_system": "Windows", "ram_gib": invalid, "gpu_devices": [],
                    "gpu_names": []})
                self.assertIn("시스템 RAM: 확인 불가", report)
                self.assertNotIn("RAM 16GB급 환경", report)

    def test_unknown_windows_gpu_names_do_not_imply_measured_vram(self):
        report = hardware.format_hardware_report({
            "operating_system": "Windows", "ram_gib": 32,
            "gpu_devices": [], "gpu_names": ["Integrated Graphics"]})
        self.assertIn("GPU 이름만 확인", report)
        self.assertIn("전용 VRAM과 실제 생성 지원은 확인되지 않았습니다", report)

    def test_mixed_valid_invalid_gpu_uses_only_observed_capacity(self):
        report = hardware.format_hardware_report({
            "operating_system": "Windows", "ram_gib": 16,
            "gpu_devices": [
                {"name": "Bad GPU", "vram_gib": math.inf},
                {"name": "Small GPU", "vram_gib": 3.5},
            ]})
        self.assertIn("전용 VRAM: 3.5GB", report)
        self.assertIn("Bad GPU · 용량 확인 불가", report)
        self.assertIn("전용 VRAM이 적습니다", report)

    def test_low_memory_guidance_does_not_change_original_settings(self):
        plan = hardware.format_first_run_plan({"ram_gib": 16, "gpu_devices": []})
        self.assertIn("다른 GPU 사용 프로그램을 종료", plan)
        self.assertIn("공식 지원하는 더 작은 모델을 직접 골라", plan)
        self.assertIn("원본 설정을 자동 변경하지 않음", plan)

    def test_report_does_not_mutate_input(self):
        original = {"operating_system": "Windows", "ram_gib": 16, "gpu_devices": [], "gpu_names": []}
        snapshot = {key: value.copy() if isinstance(value, list) else value for key, value in original.items()}
        hardware.format_hardware_report(original)
        self.assertEqual(original, snapshot)

    def test_16gb_low_vram_first_run_plan_keeps_video_optional(self):
        plan = hardware.format_first_run_plan({
            "ram_gib": 16, "gpu_devices": [{"name": "Example", "vram_gib": 3}],
        })
        self.assertIn("무거운 영상·3D 모델 다운로드 전", plan)
        self.assertIn("작은 이미지 1장", plan)
        self.assertIn("원본 Media Generator", plan)
        self.assertIn("RAM 16GB급", plan)
        self.assertIn("GPT 로그인·유료 API 연결", plan)

    def test_unknown_gpu_warns_without_asserting_cpu_support(self):
        plan = hardware.format_first_run_plan({"ram_gib": None, "gpu_devices": [], "gpu_names": []})
        self.assertIn("GPU 지원 여부는 아직 미확인", plan)
        self.assertIn("요구 사양이 맞는 모델이 확인될 때만", plan)
        self.assertNotIn("CPU만으로 생성 가능", plan)

    def test_high_vram_remains_conditional_not_a_guarantee(self):
        plan = hardware.format_first_run_plan({
            "ram_gib": 32, "gpu_devices": [{"name": "Example", "vram_gib": 12}],
        })
        self.assertIn("지원 영상 모델", plan)
        self.assertIn("실행 성공 보증", plan)
        self.assertNotIn("RAM 16GB급", plan)


if __name__ == "__main__":
    unittest.main()
