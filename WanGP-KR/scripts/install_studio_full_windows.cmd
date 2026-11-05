@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 곰같은여우의 AI 스튜디오 - 전체 설치 도우미

echo.
echo ===================================================
echo       곰같은여우의 AI 스튜디오 - 전체 설치
echo ===================================================
echo.
echo 한글 작업실 v0.24 개발판 - 연결 단계 진단·무결성 이중 확인
echo 이 도구는 필요할 때 공식 WanGP Manager를 다운로드하고,
echo 원본 WanGP 설치가 끝나면 한국어 스튜디오를 추가합니다.
echo 원본 출처: https://github.com/deepbeepmeep/WanGP
echo.
echo [중요] 모든 AI 모델 파일을 한 번에 받지는 않습니다.
echo 사용할 모델은 원본 WanGP에서 필요할 때 다운로드합니다.
echo 설치 중에는 인터넷 연결과 충분한 저장 공간이 필요합니다.
echo.

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
echo [설치 전 안내] 시스템 RAM과 기본 설치 드라이브 여유 공간:
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='SilentlyContinue'; $cs=Get-CimInstance Win32_ComputerSystem; if ($cs -and $cs.TotalPhysicalMemory) { Write-Output ('RAM: '+[math]::Round($cs.TotalPhysicalMemory/1GB,1)+' GB') }; $root=[IO.Path]::GetPathRoot($env:LOCALAPPDATA); if ($root) { $vol=Get-PSDrive -Name $root.Substring(0,1); if ($vol) { $free=[math]::Round($vol.Free/1GB,1); Write-Output ('기본 설치 드라이브 여유: '+$free+' GB'); if ($free -lt 15) { Write-Output '주의: 설치나 모델 다운로드에 필요한 공간이 부족할 수 있습니다.' } } }"
echo 모델 파일마다 필요한 저장 공간이 다르니 공식 설치 관리자에서 확인해 주세요.
echo.

echo [1/4] 검증된 설치 파일을 준비합니다.
set "SETUP_DIR=%TEMP%\GomFoxAIStudioSetup_%RANDOM%_%RANDOM%"
mkdir "%SETUP_DIR%" >nul 2>nul
if not exist "%SETUP_DIR%\" goto temp_error

echo [준비] 모든 PC에서 같은 검증된 한글 스튜디오 파일을 사용합니다.
echo 설치 스크립트 옆의 미검증 로컬 파일은 자동으로 재사용하지 않습니다.

:download_plugin
echo 고정된 GitHub 코드 버전의 필수 14개 파일을 받습니다.
echo GitHub 원본 버전: 5afdf5e1f78f40da95c3528cce2cf6963e07bd7b
set "PLUGIN_SOURCE=%SETUP_DIR%\wan2gp-gomfox-studio"
mkdir "%PLUGIN_SOURCE%" >nul 2>nul
if not exist "%PLUGIN_SOURCE%\" goto plugin_download_error
set "GOMFOX_PINNED_RAW=https://raw.githubusercontent.com/junl-im/meta/5afdf5e1f78f40da95c3528cce2cf6963e07bd7b/WanGP-KR/plugin/wan2gp-gomfox-studio"
call :fetch_plugin_file "__init__.py" "754b7e9e5046f2450c5fd4ea0a53d40b6ceb8671acbb6e7ddd8932a52de80066"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "plugin.py" "4f5a07a505c5871b88a429b33d7b172cea5b08d9af6ee39993910ff24078310d"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "plugin_info.json" "4edccb18bb9ec62a7b9204127aaf18224305301caa483b80192588ed22245892"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "catalog.py" "39cb365029369a6cd86d65f60a88ac4de424fd47960c0a41030d223dfb8d7de7"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "help_content.py" "67ce4cd46e76b475d43d5da239431b61f8a7ebca8482aa0db07dbc16d65e376a"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "hardware.py" "04f3ff1a05714f22f43340190cf75b1c85d4d443c6feccad34c4a6487bae66bf"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "studio_check.py" "61feb6dbcb92e143e90472fd9b85d390ab2d7ec431f7906600e5a4e7eeb89040"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "prompt_assistant.py" "555295c725610b2882d8f6efbc8e43b4da9bee25a6aa71294cb505feb3c70b1b"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "studio-hero.png" "68ed79eb62f1fa81e089a52f85a689eabb73db964fc84d63daf85bd87c264b66"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "gomfox-studio-icon.png" "ee1ccd2694f9495084e57defe3b5ddee61b13377f78a43dce819fc8fa9c2e365"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "category-video.webp" "922b041aa952592fdaf7304702425383debf442103834334581d955a08bbdbb6"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "category-image.webp" "9a92e1f873943c1e96b58dd1dea37644fe596fc040e40800e25688b86c7ca8ca"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "category-audio.webp" "77f253cefebcf8ac929d982367fc1dffd90f4ae9dffaf2652b08b87240056326"
if errorlevel 1 goto plugin_download_error
call :fetch_plugin_file "category-3d.webp" "9827269c0b33accb16c3dd95f250d9cd70429f9bed97ae47f6663febba208697"
if errorlevel 1 goto plugin_download_error
rem Signature PNG is one of the pinned-and-verified plugin files.

:plugin_source_ready
echo 한글 플러그인 준비가 끝났습니다.
echo.

rem A confirmed existing installation may skip the official Manager UI by choice.
rem Neither the original installation nor any existing plugin is upgraded here.
set "WANGP_DIR=%DEFAULT_WANGP%"
if not exist "%WANGP_DIR%\wgp.py" goto manager_download
if not exist "%WANGP_DIR%\plugins\" goto manager_download
echo [기존 설치 확인] 기본 폴더에 원본 WanGP가 있습니다.
echo "%WANGP_DIR%"
echo 이미 설치된 원본을 유지하는 경우 공식 Manager 설치 단계를 생략할 수 있습니다.
choice /C YN /M "원본 설치 관리자를 건너뛰고 한글 스튜디오 연결로 이동할까요?"
if errorlevel 2 goto manager_download
echo [선택] 기존 WanGP를 그대로 두고 한글 스튜디오 연결을 확인합니다.
goto connect_plugin

:manager_download
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

:connect_plugin
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

rem Copy into a unique staging folder OUTSIDE plugins, then move it into place.
rem If copying fails, no partially installed plugin appears in WanGP.
set "PLUGIN_STAGE=%WANGP_DIR%\_gomfox_staging_%RANDOM%_%RANDOM%"
if exist "%PLUGIN_STAGE%" goto plugin_stage_collision
echo [준비] 원본 설치 폴더에 검증용 임시 작업 폴더를 만듭니다.
robocopy "%PLUGIN_SOURCE%" "%PLUGIN_STAGE%" /E /R:0 /W:0 /NFL /NDL /NJH /NJS >nul
if errorlevel 8 goto plugin_copy_error

if not exist "%PLUGIN_STAGE%\__init__.py" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\plugin.py" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\plugin_info.json" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\catalog.py" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\help_content.py" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\hardware.py" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\studio_check.py" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\prompt_assistant.py" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\studio-hero.png" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\gomfox-studio-icon.png" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\category-video.webp" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\category-image.webp" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\category-audio.webp" goto plugin_copy_error
if not exist "%PLUGIN_STAGE%\category-3d.webp" goto plugin_copy_error

rem Recheck staged bytes after robocopy; a successful download does not prove a sound copy.
echo [검증] 임시 복사된 14개 파일의 SHA-256을 다시 확인합니다.
call :verify_stage_file "__init__.py" "754b7e9e5046f2450c5fd4ea0a53d40b6ceb8671acbb6e7ddd8932a52de80066"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "plugin.py" "4f5a07a505c5871b88a429b33d7b172cea5b08d9af6ee39993910ff24078310d"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "plugin_info.json" "4edccb18bb9ec62a7b9204127aaf18224305301caa483b80192588ed22245892"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "catalog.py" "39cb365029369a6cd86d65f60a88ac4de424fd47960c0a41030d223dfb8d7de7"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "help_content.py" "67ce4cd46e76b475d43d5da239431b61f8a7ebca8482aa0db07dbc16d65e376a"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "hardware.py" "04f3ff1a05714f22f43340190cf75b1c85d4d443c6feccad34c4a6487bae66bf"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "studio_check.py" "61feb6dbcb92e143e90472fd9b85d390ab2d7ec431f7906600e5a4e7eeb89040"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "prompt_assistant.py" "555295c725610b2882d8f6efbc8e43b4da9bee25a6aa71294cb505feb3c70b1b"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "studio-hero.png" "68ed79eb62f1fa81e089a52f85a689eabb73db964fc84d63daf85bd87c264b66"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "gomfox-studio-icon.png" "ee1ccd2694f9495084e57defe3b5ddee61b13377f78a43dce819fc8fa9c2e365"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "category-video.webp" "922b041aa952592fdaf7304702425383debf442103834334581d955a08bbdbb6"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "category-image.webp" "9a92e1f873943c1e96b58dd1dea37644fe596fc040e40800e25688b86c7ca8ca"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "category-audio.webp" "77f253cefebcf8ac929d982367fc1dffd90f4ae9dffaf2652b08b87240056326"
if errorlevel 1 goto plugin_stage_integrity_error
call :verify_stage_file "category-3d.webp" "9827269c0b33accb16c3dd95f250d9cd70429f9bed97ae47f6663febba208697"
if errorlevel 1 goto plugin_stage_integrity_error
echo [확인] 임시 복사 14개 파일의 무결성이 모두 일치합니다.

rem Avoid overwriting even if another installer created the destination meanwhile.
if exist "%PLUGIN_DEST%" goto plugin_exists
move "%PLUGIN_STAGE%" "%PLUGIN_DEST%" >nul
if errorlevel 1 goto plugin_copy_error
if not exist "%PLUGIN_DEST%\plugin.py" goto plugin_copy_error
echo [확인] 한글 스튜디오를 검증 후 설치 폴더에 연결했습니다.

rem Copy the verified artwork only into a newly created plugin folder.
rem Convert to a PNG-backed 256px ICO through built-in .NET; no external converter or SVG.
set "GOMFOX_SHORTCUT_ICON="
set "GOMFOX_ICON_PNG=%PLUGIN_DEST%\gomfox-studio-icon.png"
if not exist "%GOMFOX_ICON_PNG%" goto icon_unavailable
set "GOMFOX_ICON_ICO=%PLUGIN_DEST%\gomfox-studio-icon.ico"
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Drawing; $img=[System.Drawing.Image]::FromFile($env:GOMFOX_ICON_PNG); try { $bmp=[System.Drawing.Bitmap]::new(256,256); try { $gfx=[System.Drawing.Graphics]::FromImage($bmp); try { $gfx.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $gfx.Clear([System.Drawing.Color]::Transparent); $gfx.DrawImage($img,0,0,256,256) } finally { $gfx.Dispose() }; $mem=[System.IO.MemoryStream]::new(); try { $bmp.Save($mem,[System.Drawing.Imaging.ImageFormat]::Png); $payload=$mem.ToArray() } finally { $mem.Dispose() }; $fs=[System.IO.File]::Create($env:GOMFOX_ICON_ICO); try { $w=[System.IO.BinaryWriter]::new($fs); $w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]1); $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([byte]0); $w.Write([uint16]1); $w.Write([uint16]32); $w.Write([uint32]$payload.Length); $w.Write([uint32]22); $w.Write($payload); $w.Flush() } finally { $fs.Dispose() } } finally { $bmp.Dispose() } } finally { $img.Dispose() }"
if errorlevel 1 goto icon_unavailable
if not exist "%GOMFOX_ICON_ICO%" goto icon_unavailable
set "GOMFOX_SHORTCUT_ICON=%GOMFOX_ICON_ICO%"
echo [완료] 전용 Windows 아이콘 파일을 만들었습니다.
goto icon_ready_for_shortcut

:icon_unavailable
echo [안내] 전용 아이콘 적용을 건너뜁니다. 원본 WanGP 실행 기능은 유지됩니다.

:icon_ready_for_shortcut

rem Only offer a shortcut for the official documented run.bat launcher.
rem Manager-specific launch profiles may differ; skipping a shortcut is safe.
set "GOMFOX_SHORTCUT_TARGET=%WANGP_DIR%\scripts\run.bat"
if not exist "%GOMFOX_SHORTCUT_TARGET%" goto shortcut_unavailable
echo.
echo [선택] WanGP 실행 바로가기를 바탕화면에 추가할 수 있습니다.
echo 공식 실행 스크립트가 확인되었습니다: "%GOMFOX_SHORTCUT_TARGET%"
choice /C YN /M "곰같은여우의 AI 스튜디오 바로가기를 만들까요?"
if errorlevel 2 goto shortcut_done
powershell.exe -NoProfile -NonInteractive -Command "$desktop=[Environment]::GetFolderPath('DesktopDirectory'); if ([string]::IsNullOrWhiteSpace($desktop)) { exit 3 }; $path=Join-Path $desktop '곰같은여우의 AI 스튜디오.lnk'; if ([IO.File]::Exists($path)) { exit 4 }; $shell=New-Object -ComObject WScript.Shell; $link=$shell.CreateShortcut($path); $link.TargetPath=$env:GOMFOX_SHORTCUT_TARGET; $link.WorkingDirectory=$env:WANGP_DIR; $link.Description='원본 WanGP 무료 로컬 제작 실행'; if ($env:GOMFOX_SHORTCUT_ICON -and [IO.File]::Exists($env:GOMFOX_SHORTCUT_ICON)) { $link.IconLocation=$env:GOMFOX_SHORTCUT_ICON + ',0' }; $link.Save()"
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
echo 첫 화면에서 영상/이미지/음악/3D 원화 카드를 누르면 분야별 안내가 나옵니다.
echo RAM 16GB 환경이라면 첫 화면에서 사양을 확인하고 작은 이미지 1장부터 시험하세요.
echo.
pause
exit /b 0

:plugin_download_error
echo [안전 중단] 한글 플러그인을 다운로드하거나 SHA-256 검증하지 못했습니다.
echo 확인되지 않은 코드는 설치하지 않았습니다.
echo 인터넷 연결을 확인하고 이 설치 도우미를 다시 실행하세요.
echo 다음 실행에서도 검증하지 않은 이전 다운로드 파일을 자동 재사용하지 않습니다.
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
echo 공식 배포 파일 또는 체크섬이 없을 때는 우회 설치하지 않고 나중에 다시 실행하세요.
goto finish_error

:checksum_error
echo [안전 중단] 다운로드한 파일의 SHA-256 검증에 실패했습니다.
echo 검증하지 못한 설치 관리자는 실행하지 않았습니다.
echo 검증 과정을 건너뛰지 말고, 공식 배포 상태 확인 후 처음부터 다시 시도하세요.
goto finish_error

:original_not_installed
echo [중단] 원본 WanGP가 설치된 폴더를 확인하지 못했습니다.
echo Manager에서 설치를 완료한 후 다시 실행해 주세요.
echo 임의의 위치에 플러그인을 설치하지 않았습니다.
echo 기본 폴더에 정상 설치되어 있다면 다음 실행에서 Manager 단계를 생략할 수 있습니다.
goto finish_error

:plugin_exists
echo [안전 중단] 해당 위치에 한글 플러그인이 이미 있습니다.
echo "%PLUGIN_DEST%"
echo 기존 파일을 덮어쓰거나 삭제하지 않았습니다.
echo 기존 설치를 유지하세요. 이 도우미는 자동 업데이트 프로그램이 아닙니다.
goto finish_error

:plugin_stage_collision
echo [중단] 임시 작업 폴더 이름이 중복되었습니다. 다시 실행해 주세요.
goto finish_error

:plugin_copy_error
echo [중단] 한글 스튜디오의 임시 복사·확인·폴더 이동 단계에서 문제가 발생했습니다.
echo WanGP의 기존 플러그인 폴더는 덮어쓰지 않았습니다.
echo 임시 작업 폴더가 남았다면 사용자 확인 후 정리하세요: "%PLUGIN_STAGE%"
echo 임시 폴더를 자동 삭제하지 않습니다. 상태 확인 후 다시 실행하세요.
goto finish_error

:plugin_stage_integrity_error
echo [안전 중단] 복사된 플러그인 파일의 SHA-256이 원본 검증값과 일치하지 않습니다.
echo 원본 plugins 폴더에 플러그인을 연결하지 않았습니다.
echo 검증을 건너뛰거나 기존 파일을 교체하지 마세요.
echo 문제가 난 임시 작업 폴더를 확인해 주세요: "%PLUGIN_STAGE%"
echo 임시 폴더는 자동 삭제하지 않습니다. 내려받기부터 다시 시도하세요.
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

:verify_stage_file
set "GOMFOX_STAGE_NAME=%~1"
set "GOMFOX_STAGE_EXPECTED_SHA=%~2"
set "GOMFOX_STAGE_CHECK_PATH=%PLUGIN_STAGE%\%GOMFOX_STAGE_NAME%"
if not exist "%GOMFOX_STAGE_CHECK_PATH%" exit /b 1
powershell.exe -NoProfile -NonInteractive -Command "try { $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $env:GOMFOX_STAGE_CHECK_PATH -ErrorAction Stop).Hash; if ($actual -ieq $env:GOMFOX_STAGE_EXPECTED_SHA) { exit 0 } else { exit 5 } } catch { exit 6 }"
if errorlevel 1 (
  echo [불일치] %GOMFOX_STAGE_NAME%
  exit /b 1
)
echo [일치] %GOMFOX_STAGE_NAME%
exit /b 0
