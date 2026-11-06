"""v0.36 Windows 설치 점검 도우미의 정적 안전·무결성 기준 검사.

Linux에서 CMD 스크립트를 실제 실행하지 않으며 파일 자체의 계약만 확인한다.
"""

from __future__ import annotations

import hashlib
import re
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CHECK_PATH = PROJECT_ROOT / "scripts" / "check_studio_windows.cmd"
INSTALL_PATH = PROJECT_ROOT / "scripts" / "install_studio_full_windows.cmd"
PLUGIN_DIR = PROJECT_ROOT / "plugin" / "wan2gp-gomfox-studio"
FILE_PATTERN = r'call :{method} "([^"]+)" "([a-f0-9]{{64}})"'


class TestWindowsReadOnlyChecker(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.script = CHECK_PATH.read_text(encoding="utf-8")
        cls.installer = INSTALL_PATH.read_text(encoding="utf-8")

    def test_checker_shas_match_all_pinned_installer_files(self):
        source_files = dict(re.findall(FILE_PATTERN.format(method="fetch_plugin_file"), self.installer))
        checked_files = dict(re.findall(FILE_PATTERN.format(method="verify_file"), self.script))
        self.assertEqual(len(source_files), 15)
        self.assertEqual(checked_files, source_files)
        for filename, sha256 in source_files.items():
            self.assertEqual(hashlib.sha256((PLUGIN_DIR / filename).read_bytes()).hexdigest(), sha256)

    def test_installer_and_checker_pin_same_immutable_source_commit(self):
        commit = "5ff6f69ca151ad9703d2a9493329dea5d6a2d5cc"
        self.assertIn("https://raw.githubusercontent.com/junl-im/meta/" + commit, self.installer)
        self.assertIn("소스 기준: " + commit, self.script)
        self.assertIn("v0.36 기준 파일 무결성", self.script)

    def test_checks_original_and_plugin_before_hashing(self):
        self.assertIn(r'if not exist "%GOMFOX_CHECK_DIR%\wgp.py" goto missing_original', self.script)
        self.assertIn(r'if not exist "%GOMFOX_CHECK_DIR%\plugins\" goto missing_original', self.script)
        self.assertIn(r'if not exist "%GOMFOX_PLUGIN_DIR%\" goto missing_plugin', self.script)
        self.assertLess(self.script.index(':original_found'), self.script.index('call :verify_file'))
        self.assertIn("Get-FileHash -Algorithm SHA256 -LiteralPath $env:GOMFOX_VERIFY_PATH", self.script)

    def test_read_only_no_download_or_execution_side_effects(self):
        low = self.script.casefold()
        forbidden = (
            "curl.exe", "invoke-webrequest", "remove-item", "rmdir ", "del /", "robocopy ",
            "copy /", "xcopy ", "move ", "mkdir ", "md ", "start \"\"", "set-executionpolicy",
            "-executionpolicy bypass", "api.openai.com", ".save()", "<svg",
        )
        for token in forbidden:
            self.assertNotIn(token, low)
        self.assertIn("Get-CimInstance Win32_ComputerSystem", self.script)
        self.assertIn("Get-CimInstance Win32_VideoController", self.script)

    def test_clear_exit_codes_and_no_gpu_success_claims(self):
        self.assertIn("exit /b 0", self.script)
        self.assertIn("exit /b 1", self.script)
        self.assertIn("실제 실행, 브라우저 화면, GPU 생성, 결과 저장은 아직 확인하지 않았습니다", self.script)
        self.assertIn("AdapterRAM은 일부 GPU에서 부정확", self.script)
        self.assertIn("파일은 변경하지 않았습니다", self.script)

    def test_guides_first_run_without_claiming_a_real_render(self):
        for phrase in (
            "[1/3] 원본 WanGP 설치 폴더 확인",
            "[2/3] 한글 스튜디오 15개 파일 확인",
            "[3/3] Windows 및 RAM/GPU 읽기 전용 조회",
            "[실기기 검수 1]",
            "[실기기 검수 2]",
            "[실기기 검수 3]",
            "[실기기 검수 4]",
            "V019_VISUAL_QA_KO.md",
            "V020_WINDOWS_SMOKE_WORKBOOK.html",
            "검사 결과는 설치 준비 상태일 뿐, 실제 생성 성공 판정이 아닙니다",
        ):
            self.assertIn(phrase, self.script)

    def test_failure_branches_offer_non_destructive_recovery_guidance(self):
        self.assertIn("원본을 다른 드라이브에 설치했다면", self.script)
        self.assertIn("기존 폴더를 지우지 말고", self.script)
        self.assertIn("수동 삭제 없이 보고해 주세요", self.script)
        self.assertIn("Get-CimInstance Win32_OperatingSystem", self.script)


if __name__ == "__main__":
    unittest.main()
