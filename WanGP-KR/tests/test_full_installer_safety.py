"""Windows 전체 설치 배치 파일의 비파괴·공식 출처 조건 정적 검사.

Windows 프로세스를 실제 실행하지 않으며 Linux/Python에서도 검사할 수 있다.
"""

from __future__ import annotations

import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "install_studio_full_windows.cmd"


class TestFullInstallerSafety(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.script = SCRIPT_PATH.read_text(encoding="utf-8")
        cls.lower = cls.script.casefold()

    def test_official_manager_and_checksum_source(self):
        self.assertIn("https://github.com/deepbeepmeep/WanGP/releases/latest/download", self.script)
        self.assertIn("WanGPManager.exe.sha256", self.script)
        self.assertIn("WanGPManager.exe", self.script)

    def test_checksum_before_execution(self):
        self.assertLess(self.script.index("Get-FileHash -Algorithm SHA256"), self.script.index('start "" /wait'))
        self.assertIn("if errorlevel 1 goto checksum_error", self.lower)

    def test_existing_plugin_is_not_overwritten(self):
        self.assertIn('if exist "%PLUGIN_DEST%" goto plugin_exists', self.script)
        self.assertLess(self.script.index('if exist "%PLUGIN_DEST%" goto plugin_exists'), self.script.index("robocopy"))
        self.assertIn("goto original_not_installed", self.lower)

    def test_no_destructive_or_policy_bypass_commands(self):
        for forbidden in (
            "rmdir ",
            "del /",
            "rd /s",
            "/mir ",
            "/purge",
            "-executionpolicy bypass",
            "remove-item",
            "format.com",
        ):
            self.assertNotIn(forbidden, self.lower)

    def test_standalone_plugin_download_is_pinned_and_verified(self):
        self.assertIn("https://raw.githubusercontent.com/junl-im/meta/", self.script)
        self.assertIn("GOMFOX_PINNED_RAW", self.script)
        self.assertIn("Get-FileHash -Algorithm SHA256 -LiteralPath $env:GOMFOX_FILE_PATH", self.script)
        self.assertLess(self.script.index("call :fetch_plugin_file"), self.script.index('start "" /wait'))
        self.assertIn("goto plugin_download_error", self.lower)
        for filename in (
            "__init__.py",
            "plugin.py",
            "plugin_info.json",
            "catalog.py",
            "help_content.py",
            "hardware.py",
        ):
            self.assertIn('call :fetch_plugin_file "' + filename + '"', self.script)

    def test_no_automatic_cloud_or_gpt_connection(self):
        self.assertIn("GPT나 Claude 로그인은 기본 생성에 필요하지 않습니다", self.script)
        self.assertNotIn("api.openai.com", self.lower)


if __name__ == "__main__":
    unittest.main()
