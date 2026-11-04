"""Windows 전체 설치 배치 파일의 비파괴·공식 출처 조건 정적 검사.

Windows 프로세스를 실제 실행하지 않으며 Linux/Python에서도 검사할 수 있다.
"""

from __future__ import annotations

import hashlib
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "install_studio_full_windows.cmd"
PLUGIN_DIR = SCRIPT_PATH.parents[1] / "plugin" / "wan2gp-gomfox-studio"
PINNED_COMMIT = "1301ff4dbb4392ccff981d8686b49410c3d33359"
REQUIRED_FILES = (
    "__init__.py", "plugin.py", "plugin_info.json", "catalog.py",
    "help_content.py", "hardware.py", "studio_check.py", "prompt_assistant.py",
    "studio-hero.png", "gomfox-studio-icon.png",
    "category-video.webp", "category-image.webp", "category-audio.webp", "category-3d.webp",
)


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

    def test_confirmed_existing_wangp_can_skip_manager_only_by_choice(self):
        self.assertIn('if not exist "%WANGP_DIR%\\wgp.py" goto manager_download', self.script)
        self.assertIn('if not exist "%WANGP_DIR%\\plugins\\" goto manager_download', self.script)
        self.assertIn('choice /C YN /M "원본 설치 관리자를 건너뛰고 한글 스튜디오 연결로 이동할까요?"', self.script)
        self.assertIn('if errorlevel 2 goto manager_download', self.script)
        self.assertIn('goto connect_plugin', self.script)
        self.assertLess(self.script.index(':manager_download'), self.script.index(':connect_plugin'))
        self.assertIn('if exist "%PLUGIN_DEST%" goto plugin_exists', self.script)

    def test_failed_install_explains_safe_retry_without_cache_reuse(self):
        self.assertIn("검증하지 않은 이전 다운로드 파일을 자동 재사용하지 않습니다", self.script)
        self.assertIn("검증 과정을 건너뛰지 말고", self.script)
        self.assertIn("이 도우미는 자동 업데이트 프로그램이 아닙니다", self.script)
        self.assertIn("임시 폴더를 자동 삭제하지 않습니다", self.script)

    def test_staged_copy_keeps_partial_plugin_outside_plugins(self):
        self.assertIn('set "PLUGIN_STAGE=%WANGP_DIR%\\_gomfox_staging_', self.script)
        self.assertIn('robocopy "%PLUGIN_SOURCE%" "%PLUGIN_STAGE%"', self.script)
        self.assertIn('move "%PLUGIN_STAGE%" "%PLUGIN_DEST%"', self.script)
        self.assertLess(self.script.index('robocopy "%PLUGIN_SOURCE%" "%PLUGIN_STAGE%"'), self.script.index('move "%PLUGIN_STAGE%" "%PLUGIN_DEST%"'))
        self.assertLess(self.script.index('if exist "%PLUGIN_DEST%" goto plugin_exists'), self.script.index('move "%PLUGIN_STAGE%" "%PLUGIN_DEST%"'))
        for filename in REQUIRED_FILES:
            self.assertIn('if not exist "%PLUGIN_STAGE%\\' + filename + '" goto plugin_copy_error', self.script)

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
        self.assertIn(PINNED_COMMIT, self.script)
        self.assertIn("Get-FileHash -Algorithm SHA256 -LiteralPath $env:GOMFOX_FILE_PATH", self.script)
        self.assertLess(self.script.index("call :fetch_plugin_file"), self.script.index('start "" /wait'))
        self.assertIn("goto plugin_download_error", self.lower)
        for filename in REQUIRED_FILES:
            expected_sha = hashlib.sha256((PLUGIN_DIR / filename).read_bytes()).hexdigest()
            self.assertIn('call :fetch_plugin_file "' + filename + '" "' + expected_sha + '"', self.script)
        self.assertIn("미검증 로컬 파일은 자동으로 재사용하지 않습니다", self.script)
        self.assertNotIn('set "PLUGIN_SOURCE=%STUDIO_ROOT%', self.script)

    def test_preflight_reports_resources_without_changing_settings(self):
        self.assertIn("Get-CimInstance Win32_ComputerSystem", self.script)
        self.assertIn("Get-PSDrive -Name", self.script)
        self.assertIn("모델 파일마다 필요한 저장 공간", self.script)
        self.assertNotIn("Set-ExecutionPolicy", self.script)
        self.assertNotIn("Set-CimInstance", self.script)

    def test_optional_shortcut_does_not_override_existing_file(self):
        self.assertIn('if not exist "%GOMFOX_SHORTCUT_TARGET%" goto shortcut_unavailable', self.script)
        self.assertIn(r"\scripts\run.bat", self.script)
        self.assertIn("choice /C YN /M", self.script)
        self.assertIn("if ([IO.File]::Exists($path)) { exit 4 }", self.script)
        self.assertIn("WanGP Manager에서 Start WanGP를 이용하세요", self.script)

    def test_signature_icon_is_pinned_and_applied_only_to_new_shortcut(self):
        self.assertIn('call :fetch_plugin_file "gomfox-studio-icon.png"', self.script)
        self.assertIn('if not exist "%PLUGIN_STAGE%\\gomfox-studio-icon.png" goto plugin_copy_error', self.script)
        self.assertIn("GOMFOX_ICON_ICO", self.script)
        self.assertIn("[System.Drawing.Imaging.ImageFormat]::Png", self.script)
        self.assertIn("$link.IconLocation=$env:GOMFOX_SHORTCUT_ICON + ',0'", self.script)
        self.assertLess(self.script.index("if ([IO.File]::Exists($path)) { exit 4 }"), self.script.index("$link.IconLocation="))
        self.assertNotIn("<svg", self.lower)

    def test_no_automatic_cloud_or_gpt_connection(self):
        self.assertIn("GPT나 Claude 로그인은 기본 생성에 필요하지 않습니다", self.script)
        self.assertNotIn("api.openai.com", self.lower)


if __name__ == "__main__":
    unittest.main()
