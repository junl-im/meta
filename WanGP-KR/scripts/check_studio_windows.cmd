@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 곰같은여우의 AI 스튜디오 - 설치 후 읽기 전용 점검

echo.
echo =====================================================
echo   곰같은여우의 AI 스튜디오 v0.15 - Windows 설치 점검
echo =====================================================
echo.
echo [안내] 이 도구는 설치 여부와 v0.14 기준 파일 무결성만 검사합니다.
echo 프로그램 실행, 모델 다운로드, 이미지 생성, 파일 수정은 하지 않습니다.
echo 원본 WanGP가 지원하는 모든 모델의 실행 성공을 보장하지 않습니다.
echo.

set "GOMFOX_CHECK_DIR=%LOCALAPPDATA%\GomFoxAIStudio\WanGP"
if exist "%GOMFOX_CHECK_DIR%\wgp.py" if exist "%GOMFOX_CHECK_DIR%\plugins\" goto original_found

echo 기본 위치에서 WanGP 원본을 찾지 못했습니다.
echo 원본 WanGP를 이미 설치했다면 폴더를 직접 입력하세요.
echo 예: C:\WanGP
echo 설치하지 않았다면 입력 없이 Enter를 누르세요.
set /p "GOMFOX_CHECK_DIR=원본 WanGP 설치 폴더: "
if "%GOMFOX_CHECK_DIR%"=="" goto missing_original
set "GOMFOX_CHECK_DIR=%GOMFOX_CHECK_DIR:"=%"

:original_found
if not exist "%GOMFOX_CHECK_DIR%\wgp.py" goto missing_original
if not exist "%GOMFOX_CHECK_DIR%\plugins\" goto missing_original
echo [정상] 원본 WanGP 기본 구조 확인

set "GOMFOX_PLUGIN_DIR=%GOMFOX_CHECK_DIR%\plugins\wan2gp-gomfox-studio"
if not exist "%GOMFOX_PLUGIN_DIR%\" goto missing_plugin
echo [확인] 한글 스튜디오 파일 SHA-256 대조 중...
echo 소스 기준: 11f2c8d94e0408329df5eedd194d4418c0b2d97f
set "GOMFOX_ISSUES=0"

call :verify_file "__init__.py" "754b7e9e5046f2450c5fd4ea0a53d40b6ceb8671acbb6e7ddd8932a52de80066"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "plugin.py" "b5ef98ec2f67edc51c40fd0a93329b9abdfc968697438e78fcfcf520c4dd7c84"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "plugin_info.json" "9fbb42e19b33c0fa13c6ac7a58b13466f0e1b96b9f3a6888da57323d1698fca9"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "catalog.py" "995f6d12271bff59da0a64318133e788ffbc08560bfeb0bede2aa8fc14e20b9d"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "help_content.py" "d7cb8e51d6049d128b9e62c1ff775c9228af0d8d035de4fcd4ccce5fb7ee2fcb"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "hardware.py" "65048b0d8a7e19a0d702337b991ea54e86ef4114904a227bc01c34cf68bb24f4"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "studio_check.py" "60f256bd29061b27580d0e7bbd48a75ab3696072343e70484b0b9659ac080360"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "prompt_assistant.py" "555295c725610b2882d8f6efbc8e43b4da9bee25a6aa71294cb505feb3c70b1b"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "studio-hero.png" "68ed79eb62f1fa81e089a52f85a689eabb73db964fc84d63daf85bd87c264b66"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "gomfox-studio-icon.png" "ee1ccd2694f9495084e57defe3b5ddee61b13377f78a43dce819fc8fa9c2e365"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "category-video.webp" "922b041aa952592fdaf7304702425383debf442103834334581d955a08bbdbb6"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "category-image.webp" "9a92e1f873943c1e96b58dd1dea37644fe596fc040e40800e25688b86c7ca8ca"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "category-audio.webp" "77f253cefebcf8ac929d982367fc1dffd90f4ae9dffaf2652b08b87240056326"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "category-3d.webp" "9827269c0b33accb16c3dd95f250d9cd70429f9bed97ae47f6663febba208697"
if errorlevel 1 set "GOMFOX_ISSUES=1"

echo.
echo [읽기 전용] RAM과 GPU 이름:
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='SilentlyContinue'; $pc=Get-CimInstance Win32_ComputerSystem; if ($pc -and $pc.TotalPhysicalMemory) { Write-Output ('RAM: '+[math]::Round($pc.TotalPhysicalMemory/1GB,1)+' GB') }; Get-CimInstance Win32_VideoController | ForEach-Object { Write-Output ('GPU: '+$_.Name) }"
echo 전용 VRAM은 Windows 작업 관리자 - 성능 - GPU에서 직접 확인하세요.
echo AdapterRAM은 일부 GPU에서 부정확하므로 합격 판정에 사용하지 않습니다.
echo.
if exist "%GOMFOX_CHECK_DIR%\scripts\run.bat" (
    echo [참고] 원본 실행 스크립트 존재. 실제 동작은 별도 확인이 필요합니다.
) else (
    echo [참고] 원본 실행 스크립트 미확인. 공식 WanGP Manager의 Start WanGP를 사용하세요.
)

if "%GOMFOX_ISSUES%"=="1" goto integrity_failed
echo.
echo [검사 통과] 원본 구조와 한글 스튜디오 필수 파일 14개가 v0.14 기준과 일치합니다.
echo [미검증] 실제 실행, 브라우저 화면, GPU 생성, 결과 저장은 아직 확인하지 않았습니다.
echo 다음 단계: WanGP Manager에서 실행 후 원본이 지원하는 작은 이미지 1장을 직접 생성해 보세요.
echo GPT 로그인이나 유료 API는 기본 생성에 필요하지 않습니다.
pause
exit /b 0

:missing_original
echo [점검 불가] 원본 WanGP의 wgp.py 또는 plugins 폴더를 확인하지 못했습니다.
echo 설치 도우미로 원본을 설치하고 다시 점검하세요. 파일은 변경하지 않았습니다.
goto failed

:missing_plugin
echo [점검 불가] 한글 스튜디오 폴더를 확인하지 못했습니다.
echo 한글 플러그인이 없거나 다른 위치에 설치됐을 수 있습니다. 파일은 변경하지 않았습니다.
goto failed

:integrity_failed
echo [점검 필요] 필수 파일의 누락 또는 SHA-256 불일치가 발견됐습니다.
echo 원본과 기존 플러그인을 자동 교체하지 않았습니다. 버전을 먼저 확인하세요.
goto failed

:failed
echo 이 도구는 읽기 전용이며 프로그램을 복구하거나 삭제하지 않습니다.
pause
exit /b 1

:verify_file
set "GOMFOX_VERIFY_NAME=%~1"
set "GOMFOX_VERIFY_EXPECTED=%~2"
set "GOMFOX_VERIFY_PATH=%GOMFOX_PLUGIN_DIR%\%GOMFOX_VERIFY_NAME%"
if not exist "%GOMFOX_VERIFY_PATH%" goto verify_missing
powershell.exe -NoProfile -NonInteractive -Command "try { $actual=(Get-FileHash -Algorithm SHA256 -LiteralPath $env:GOMFOX_VERIFY_PATH -ErrorAction Stop).Hash; if ($actual -ieq $env:GOMFOX_VERIFY_EXPECTED) { exit 0 } else { exit 3 } } catch { exit 4 }"
if errorlevel 1 goto verify_mismatch
echo [일치] %GOMFOX_VERIFY_NAME%
exit /b 0

:verify_missing
echo [누락] %GOMFOX_VERIFY_NAME%
exit /b 1

:verify_mismatch
echo [불일치] %GOMFOX_VERIFY_NAME%
exit /b 1
