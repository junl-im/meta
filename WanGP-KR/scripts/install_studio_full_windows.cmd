@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 곰같은여우의 AI 스튜디오 - 전체 설치 도우미

echo.
echo ===================================================
echo       곰같은여우의 AI 스튜디오 - 전체 설치
echo ===================================================
echo.
echo 이 도구는 공식 WanGP Manager를 다운로드하고,
echo 원본 WanGP 설치가 끝나면 한국어 스튜디오를 추가합니다.
echo 원본 출처: https://github.com/deepbeepmeep/WanGP
echo.
echo [중요] 모든 AI 모델 파일을 한 번에 받지는 않습니다.
echo 사용할 모델은 원본 WanGP에서 필요할 때 다운로드합니다.
echo 설치 중에는 인터넷 연결과 충분한 저장 공간이 필요합니다.
echo.

for %%I in ("%~dp0..") do set "STUDIO_ROOT=%%~fI"
set "PLUGIN_SOURCE=%STUDIO_ROOT%\plugin\wan2gp-gomfox-studio"
set "DEFAULT_WANGP=%LOCALAPPDATA%\GomFoxAIStudio\WanGP"

powershell.exe -NoProfile -NonInteractive -Command "if ([Environment]::Is64BitOperatingSystem) { exit 0 } else { exit 1 }" >nul
if errorlevel 1 goto need_64bit
where curl.exe >nul 2>nul
if errorlevel 1 goto need_curl

echo [설치 전 안내] 현재 Windows에 표시된 그래픽카드:
powershell.exe -NoProfile -NonInteractive -Command "Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ('GPU: ' + $_.Name) }"
echo.
echo 그래픽카드가 감지되어도 모든 영상/3D 모델 실행이 보장되지는 않습니다.
echo 실제 권장 프로필은 공식 WanGP Manager가 제안합니다.
echo.

echo [1/4] 공식 설치 관리자 다운로드를 준비합니다.
set "SETUP_DIR=%TEMP%\GomFoxAIStudioSetup_%RANDOM%_%RANDOM%"
mkdir "%SETUP_DIR%" >nul 2>nul
if not exist "%SETUP_DIR%\" goto temp_error

echo [준비] 한글 스튜디오 파일을 확인합니다.
if not exist "%PLUGIN_SOURCE%\__init__.py" goto download_plugin
if not exist "%PLUGIN_SOURCE%\plugin.py" goto download_plugin
if not exist "%PLUGIN_SOURCE%\plugin_info.json" goto download_plugin
if not exist "%PLUGIN_SOURCE%\catalog.py" goto download_plugin
if not exist "%PLUGIN_SOURCE%\help_content.py" goto download_plugin
if not exist "%PLUGIN_SOURCE%\hardware.py" goto download_plugin
if not exist "%PLUGIN_SOURCE%\prompt_assistant.py" goto download_plugin
if not exist "%PLUGIN_SOURCE%\studio-hero.png" goto download_plugin
goto plugin_source_ready

:download_plugin
echo 현재 폴더에 한글 플러그인이 없으므로 고정 버전을 받습니다.
echo GitHub 원본 버전: c265e03182915a75a88e3ee9875ebf391d37c395
set "PLUGIN_SOURCE=%SETUP_DIR%\wan2gp-gomfox-studio"
mkdir "%PLUGIN_SOURCE%" >nul 2>nul
if not exist "%PLUGIN_SOURCE%\" goto plugin_download_error
set "GOMFOX_PINNED_RAW=https://raw.githubusercontent.com/junl-im/meta/c265e03182915a75a88e3ee9875ebf391d37c395/WanGP-KR/plugin/wan2gp-gomfox-studio"
call :fetch_plugin_file "__init__.py" "754b7e9e5046f2450c5fd4ea0a53d40b6ceb8671acbb6e7ddd8932a52de80066"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "plugin.py" "977a233c7238e5cf7647feac556d21f5abdd8400ccd9627f607aea7c88381d47"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "plugin_info.json" "457008bf9f6b91f85999d38517f1f9a7fd44c4b858dc641d1c55fe724da399a7"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "catalog.py" "e934ab7822dedf138dee89c6299553b87671669c62ac7c10541c263010848c10"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "help_content.py" "d7cb8e51d6049d128b9e62c1ff775c9228af0d8d035de4fcd4ccce5fb7ee2fcb"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "hardware.py" "f6a4eb010ae10b5a6529d54a10d78c9da314caad656b65fc0411f4bb9f0824bb"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "prompt_assistant.py" "7b37ad8d89dc95f8fe92818d30d654c2613523f16a83233ab12be767e7a3c76c"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "studio-hero.png" "68ed79eb62f1fa81e089a52f85a689eabb73db964fc84d63daf85bd87c264b66"
if errorlevel 1 goto plugin_download_error

:plugin_source_ready
echo 한글 플러그인 준비가 끝났습니다.
echo.

set "GOMFOX_MANAGER_EXE=%SETUP_DIR%\WanGPManager.exe"
set "GOMFOX_CHECK_FILE=%SETUP_DIR%\WanGPManager.exe.sha256"
set "OFFICIAL_RELEASE=https://github.com/deepbeepmeep/WanGP/releases/latest/download"

echo 공식 GitHub에서 WanGPManager.exe를 받습니다...
curl.exe --fail --location --retry 2 --connect-timeout 30 --max-time 900 --output "%GOMFOX_MANAGER_EXE%" "%OFFICIAL_RELEASE%/WanGPManager.exe"
if errorlevel 1 goto download_error
if not exist "%GOMFOX_MANAGER_EXE%" goto download_error

echo 공식 SHA-256 검증 파일을 받습니다...
curl.exe --fail --location --retry 2 --connect-timeout 30 --max-time 120 --output "%GOMFOX_CHECK_FILE%" "%OFFICIAL_RELEASE%/WanGPManager.exe.sha256"
if errorlevel 1 goto download_error
if not exist "%GOMFOX_CHECK_FILE%" goto download_error

echo [2/4] 다운로드 파일의 SHA-256을 검사합니다...
powershell.exe -NoProfile -NonInteractive -Command "$expected = ((Get-Content -LiteralPath $env:GOMFOX_CHECK_FILE -Raw).Trim() -split '\s+')[0]; if ($expected -notmatch '^[A-Fa-f0-9]{64}$') { exit 4 }; $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $env:GOMFOX_MANAGER_EXE).Hash; if ($actual -ne $expected) { exit 5 }"
if errorlevel 1 goto checksum_error

echo [확인] 공식 체크섬과 다운로드한 설치 관리자가 일치합니다.
echo.
echo [3/4] 공식 WanGP Manager를 실행합니다.
echo 다음 화면에서 원본 WanGP 설치를 완료해 주세요.
echo Manager의 Install 화면에서 하드웨어 추천 설정을 확인하세요.
echo 아래 경로를 설치 폴더로 선택하면 다음 단계가 쉬워집니다.
echo "%DEFAULT_WANGP%"
echo.
echo 원본 설치가 끝나면 WanGP Manager를 닫아 주세요.
echo 이 도구는 Manager가 닫힐 때까지 기다립니다.
echo.
choice /C YN /M "공식 WanGP Manager를 실행할까요?"
if errorlevel 2 goto cancelled

start "" /wait "%GOMFOX_MANAGER_EXE%"

echo.
echo [4/4] 원본 설치를 찾고 한글 스튜디오를 연결합니다.
set "WANGP_DIR=%DEFAULT_WANGP%"
if exist "%WANGP_DIR%\wgp.py" goto check_wangp

echo 기본 위치에 설치된 WanGP가 보이지 않습니다.
echo WanGP Manager에서 설치한 폴더를 입력해 주세요.
echo 예: C:\WanGP
echo 폴더를 선택하지 않았거나 설치를 끝내지 않았다면 빈칸으로 두세요.
set /p "WANGP_DIR=WanGP 설치 폴더: "
if "%WANGP_DIR%"=="" goto original_not_installed
set "WANGP_DIR=%WANGP_DIR:"=%"

:check_wangp
if not exist "%WANGP_DIR%\wgp.py" goto original_not_installed
if not exist "%WANGP_DIR%\plugins\" goto original_not_installed

set "PLUGIN_DEST=%WANGP_DIR%\plugins\wan2gp-gomfox-studio"
if exist "%PLUGIN_DEST%" goto plugin_exists

echo.
echo 원본 WanGP: "%WANGP_DIR%"
echo 설치할 한글 스튜디오: "%PLUGIN_DEST%"
choice /C YN /M "원본은 그대로 두고 한글 스튜디오를 새로 추가할까요?"
if errorlevel 2 goto cancelled

robocopy "%PLUGIN_SOURCE%" "%PLUGIN_DEST%" /E /R:0 /W:0 /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto plugin_copy_error

if not exist "%PLUGIN_DEST%\plugin.py" goto plugin_copy_error
if not exist "%PLUGIN_DEST%\plugin_info.json" goto plugin_copy_error
if not exist "%PLUGIN_DEST%\help_content.py" goto plugin_copy_error
if not exist "%PLUGIN_DEST%\prompt_assistant.py" goto plugin_copy_error
if not exist "%PLUGIN_DEST%\studio-hero.png" goto plugin_copy_error

rem Only offer a shortcut for the official documented run.bat launcher.
rem Manager-specific launch profiles may differ; skipping a shortcut is safe.
set "GOMFOX_SHORTCUT_TARGET=%WANGP_DIR%\scripts\run.bat"
if not exist "%GOMFOX_SHORTCUT_TARGET%" goto shortcut_unavailable
echo.
echo [선택] WanGP 실행 바로가기를 바탕화면에 추가할 수 있습니다.
echo 공식 실행 스크립트가 확인되었습니다: "%GOMFOX_SHORTCUT_TARGET%"
choice /C YN /M "곰같은여우의 AI 스튜디오 바로가기를 만들까요?"
if errorlevel 2 goto shortcut_done
powershell.exe -NoProfile -NonInteractive -Command "$desktop=[Environment]::GetFolderPath('DesktopDirectory'); if ([string]::IsNullOrWhiteSpace($desktop)) { exit 3 }; $path=Join-Path $desktop '곰같은여우의 AI 스튜디오.lnk'; if ([IO.File]::Exists($path)) { exit 4 }; $shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut($path); $link.TargetPath=$env:GOMFOX_SHORTCUT_TARGET; $link.WorkingDirectory=$env:WANGP_DIR; $link.Description='원본 WanGP 무료 로컬 제작 실행'; $link.Save()"
if errorlevel 1 goto shortcut_failed
echo [완료] 바탕화면 바로가기를 만들었습니다.
goto shortcut_done

:shortcut_unavailable
echo [안내] 공식 run.bat 실행 파일을 찾지 못해 바로가기 생성을 건너뜁니다.
echo 공식 WanGP Manager에서 Start WanGP를 이용하세요.
goto shortcut_done

:shortcut_failed
echo [안내] 기존 바로가기 또는 Windows 제한 때문에 새 바로가기를 만들지 못했습니다.
echo 기존 바로가기는 덮어쓰지 않았습니다. WanGP Manager에서 실행할 수 있습니다.

:shortcut_done
echo.
echo ===================================================
echo [완료] 원본 WanGP와 한글 스튜디오 연결 단계가 끝났습니다.
echo ===================================================
echo WanGP Manager에서 Start WanGP를 실행하세요.
echo Apps ^& PlugIn Manager에서 "곰같은여우의 AI 스튜디오"를 켜세요.
echo 앱에서 "도움말 - 처음 시작하기"를 따라 해 보세요.
echo.
echo GPT나 Claude 로그인은 기본 생성에 필요하지 않습니다.
echo GPU 모델에 따라 일부 모델은 실행되지 않을 수 있습니다.
echo.
pause
exit /b 0

:plugin_download_error
echo [안전 중단] 한글 플러그인을 다운로드하거나 SHA-256 검증하지 못했습니다.
echo 확인되지 않은 코드는 설치하지 않았습니다.
goto finish_error

:need_64bit
echo [중단] 공식 WanGP Manager는 Windows 64비트 환경용입니다.
goto finish_error

:need_curl
echo [중단] Windows의 curl.exe 명령을 찾지 못했습니다.
echo 공식 GitHub releases 페이지에서 WanGPManager.exe를 직접 받으세요.
goto finish_error

:temp_error
echo [중단] 설치 파일을 받을 임시 폴더를 만들지 못했습니다.
goto finish_error

:download_error
echo [중단] 공식 WanGP Manager 또는 체크섬 다운로드에 실패했습니다.
echo 네트워크와 https://github.com/deepbeepmeep/WanGP/releases 를 확인하세요.
goto finish_error

:checksum_error
echo [안전 중단] 다운로드한 파일의 SHA-256 검증에 실패했습니다.
echo 검증하지 못한 설치 관리자는 실행하지 않았습니다.
goto finish_error

:original_not_installed
echo [중단] 원본 WanGP가 설치된 폴더를 확인하지 못했습니다.
echo Manager에서 설치를 완료한 후 다시 실행해 주세요.
echo 임의의 위치에 플러그인을 설치하지 않았습니다.
goto finish_error

:plugin_exists
echo [안전 중단] 해당 위치에 한글 플러그인이 이미 있습니다.
echo "%PLUGIN_DEST%"
echo 기존 파일을 덮어쓰거나 삭제하지 않았습니다.
goto finish_error

:plugin_copy_error
echo [중단] 플러그인 복사 또는 확인 단계에서 문제가 발생했습니다.
echo 일부 새 파일이 남아 있을 수 있지만 자동 삭제하지 않았습니다.
goto finish_error

:cancelled
echo 사용자가 설치를 취소했습니다.
pause
exit /b 2

:finish_error
echo.
echo 원본 및 개인 데이터를 삭제하지 않았습니다.
pause
exit /b 1

:fetch_plugin_file
set "GOMFOX_FILE=%~1"
set "GOMFOX_EXPECTED_SHA=%~2"
set "GOMFOX_FILE_PATH=%PLUGIN_SOURCE%\%GOMFOX_FILE%"
echo 받는 중: %GOMFOX_FILE%
curl.exe --fail --location --retry 2 --connect-timeout 30 --max-time 120 --output "%GOMFOX_FILE_PATH%" "%GOMFOX_PINNED_RAW%/%GOMFOX_FILE%"
if errorlevel 1 exit /b 1
if not exist "%GOMFOX_FILE_PATH%" exit /b 1
powershell.exe -NoProfile -NonInteractive -Command "$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $env:GOMFOX_FILE_PATH).Hash; if ($actual -ne $env:GOMFOX_EXPECTED_SHA) { exit 5 }"
if errorlevel 1 exit /b 1
exit /b 0
