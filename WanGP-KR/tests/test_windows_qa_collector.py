"""v0.27 Windows 환경 진단 도우미 정적 계약 시험.

Linux에서는 실제 Windows CIM/NVIDIA 드라이버를 실행할 수 없으므로,
출력·동의·비파괴성·오판 방지 구조만 검사한다.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "collect_studio_windows_qa.cmd"
CHECKER = Path(__file__).resolve().parents[1] / "scripts" / "check_studio_windows.cmd"


class TestWindowsQACollector(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = SCRIPT.read_text(encoding="utf-8")
        cls.lower = cls.source.casefold()

    def test_single_file_no_other_project_modules_required(self):
        self.assertTrue(self.source.startswith("@echo off\n"))
        self.assertIn("setlocal EnableExtensions DisableDelayedExpansion", self.source)
        self.assertIn("chcp 65001 >nul", self.source)
        self.assertIn("where powershell.exe", self.source)
        self.assertNotIn(".ps1", self.lower)

    def test_optional_export_only_after_user_choice(self):
        consent = self.source.index('choice /C YN /M "검사 내용을')
        refusal = self.source.index("if errorlevel 2 goto done", consent)
        file_guard = self.source.index('if exist "%GOMFOX_REPORT_FILE%" goto report_exists', refusal)
        write = self.source.index('call :print_report > "%GOMFOX_REPORT_FILE%"', file_guard)
        self.assertLess(consent, refusal)
        self.assertLess(refusal, file_guard)
        self.assertLess(file_guard, write)
        self.assertIn("기존 보고서를 덮어쓰지 않았습니다", self.source)

    def test_hardware_is_observed_not_assumed(self):
        for expected in (
            "Get-CimInstance Win32_OperatingSystem",
            "Get-CimInstance Win32_VideoController",
            "Get-Command nvidia-smi.exe -CommandType Application",
            "--query-gpu=index,name,memory.total,driver_version",
            "NVIDIA VRAM: 지원 도구 없음 / 직접 확인 필요",
            "GPU 메모리 총량은 생성 시 남은 가용량 또는 모델 지원을 보증하지 않음",
        ):
            self.assertIn(expected, self.source)
        self.assertNotIn("AdapterRAM", self.source)
        self.assertNotIn("지원 모델: 성공", self.source)

    def test_no_download_execution_or_sensitive_data_automation(self):
        for forbidden in (
            "curl.exe", "invoke-webrequest", "invoke-restmethod", "remove-item",
            "rmdir ", "del /", "robocopy ", "xcopy ", "move ",
            "start \"\"", "-executionpolicy bypass", "api.openai.com",
            "set-ciminstance", "<svg", "get-clipboard", "set-clipboard",
        ):
            self.assertNotIn(forbidden, self.lower)
        self.assertIn("원본 WanGP 실행, 모델 다운로드, GPU 생성, GPT 호출은 하지 않습니다", self.source)

    def test_original_directory_not_exposed_in_report(self):
        self.assertIn('set "GOMFOX_CHECK_DIR=%LOCALAPPDATA%\\GomFoxAIStudio\\WanGP"', self.source)
        self.assertIn("$p.Contains([char]34)", self.source)
        report = self.source.split(":print_report\n", 1)[1]
        self.assertNotIn("echo %GOMFOX_CHECK_DIR%", report)
        self.assertIn("원본 구조: %GOMFOX_SOURCE_STATUS%", report)
        self.assertIn("파일 무결성(SHA-256): 별도 점검 필요", report)

    def test_all_called_labels_exist_and_fail_closed(self):
        labels = set(re.findall(r"^:([a-z_]+)$", self.source, flags=re.MULTILINE))
        self.assertTrue({"directory_unverified", "collect", "done", "print_report", "probe_failed"}.issubset(labels))
        self.assertIn("if errorlevel 1 goto probe_failed", self.source)
        self.assertIn("if errorlevel 1 goto report_failed", self.source)
        self.assertIn("실제 WanGP 실행/원본 API/무료 이미지 생성/파일 저장: 미검증", self.source)
        self.assertIn("exit /b 1", self.source)

    def test_keeps_existing_checker_separate_and_unchanged(self):
        existing = CHECKER.read_text(encoding="utf-8")
        self.assertIn("소스 기준: ac2e92b2e41d26a6d8b8da2ceaaad20693641c37", existing)
        self.assertIn("점검 파일 일치 여부는 기존 check_studio_windows.cmd", self.source)


if __name__ == "__main__":
    unittest.main()
