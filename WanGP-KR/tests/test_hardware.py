"""GPU 없이 저사양 안내·알 수 없는 하드웨어 동작을 검사한다."""

from __future__ import annotations

import importlib.util
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
        self.assertNotIn("RAM 16GB급", result)

    def test_report_does_not_mutate_input(self):
        original = {"operating_system": "Windows", "ram_gib": 16, "gpu_devices": [], "gpu_names": []}
        snapshot = {key: value.copy() if isinstance(value, list) else value for key, value in original.items()}
        hardware.format_hardware_report(original)
        self.assertEqual(original, snapshot)


if __name__ == "__main__":
    unittest.main()
