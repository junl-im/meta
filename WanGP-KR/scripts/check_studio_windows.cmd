@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 곰같은여우의 AI 스튜디오 - 설치 후 읽기 전용 점검

echo.
echo =====================================================
echo   곰같은여우의 AI 스튜디오 v0.36 - Windows 설치 점검
echo =====================================================
echo.
echo [안내] 이 도구는 설치 여부와 v0.36 기준 파일 무결성만 검사합니다.
echo 프로그램 실행, 모델 다운로드, 이미지 생성, 파일 수정은 하지 않습니다.
echo 원본 WanGP가 지원하는 모든 모델의 실행 성공을 보장하지 않습니다.
echo 검사 결과는 설치 준비 상태일 뿐, 실제 생성 성공 판정이 아닙니다.
echo.

echo [1/3] 원본 WanGP 설치 폴더 확인
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

echo.
echo [2/3] 한글 스튜디오 15개 파일 확인
set "GOMFOX_PLUGIN_DIR=%GOMFOX_CHECK_DIR%\plugins\wan2gp-gomfox-studio"
if not exist "%GOMFOX_PLUGIN_DIR%\" goto missing_plugin
echo [확인] 한글 스튜디오 파일 SHA-256 대조 중...
echo 소스 기준: 5ff6f69ca151ad9703d2a9493329dea5d6a2d5cc
set "GOMFOX_ISSUES=0"

call :verify_file "__init__.py" "754b7e9e5046f2450c5fd4ea0a53d40b6ceb8671acbb6e7ddd8932a52de80066"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "plugin.py" "1384c8e014c759dc848071d1bd8f99b0817aba81cad445ca128a177826b6c26c"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "plugin_info.json" "42b7a85e241d9328bdc35de2f4d00addeb50c1b7d391d0b9421f9d856a94af18"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "catalog.py" "462af34704a1a280884c9b63a559177e5cf5bd65241f9b1c1626c1eb9b1821c2"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "help_content.py" "bde676370e57d3af9cddd4a65d3bf392a882202168250275a717307725eac38c"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "hardware.py" "04f3ff1a05714f22f43340190cf75b1c85d4d443c6feccad34c4a6487bae66bf"
if errorlevel 1 set "GOMFOX_ISSUES=1"
call :verify_file "studio_check.py" "019c85badd72e4154f141099e2a2834722b215b8528187d17bbb13271e409d73"
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
call :verify_file "first-run-helper-v036.webp" "fc7d79cb284d3ad5737075f59750e58924e4bf17997300cf0c31164931efe06d"
if errorlevel 1 set "GOMFOX_ISSUES=1"

echo.
echo [3/3] Windows 및 RAM/GPU 읽기 전용 조회
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_OperatingSystem | ForEach-Object { Write-Output ('Windows: '+$_.Caption+' / Build '+$_.BuildNumber) }; $pc=Get-CimInstance Win32_ComputerSystem; if ($pc -and $pc.TotalPhysicalMemory) { Write-Output ('RAM: '+[math]::Round($pc.TotalPhysicalMemory/1GB,1)+' GB') }; Get-CimInstance Win32_VideoController | ForEach-Object { Write-Output ('GPU: '+$_.Name) }"
echo 조회 결과가 비어 있다면 Windows 권한이나 WMI 상태를 확인하세요. 비어 있는 정보는 합격으로 간주하지 않습니다.
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
echo [검사 통과] 원본 구조와 한글 스튜디오 필수 파일 15개가 v0.36 기준과 일치합니다.
echo [미검증] 실제 실행, 브라우저 화면, GPU 생성, 결과 저장은 아직 확인하지 않았습니다.
echo [실기기 검수 1] WanGP Manager에서 Start WanGP를 눌러 원본 실행 확인
echo [실기기 검수 2] 브라우저에서 한글 스튜디오 탭과 네 분야 원화 표시 확인
echo [실기기 검수 3] 원본에서 지원하는 작은 이미지 1장을 직접 생성 후 저장 확인
echo [실기기 검수 4] 실제 GPU VRAM, 모델명, 생성 시간과 오류를 따로 기록
echo GPT 로그인이나 유료 API는 기본 생성에 필요하지 않습니다.
echo 검수 기록 방법: WanGP-KR\docs\V019_VISUAL_QA_KO.md
echo [추가] v0.20 오프라인 실기기 기록장: WanGP-KR\docs\V020_WINDOWS_SMOKE_WORKBOOK.html
echo 이 기록장은 모델 생성 없이 측정 시간과 직접 확인한 결과를 TXT로 정리합니다.
echo 설치 점검 통과와 실제 무료 생성 성공은 별개입니다.
pause
exit /b 0

:missing_original
echo [점검 불가] 원본 WanGP의 wgp.py 또는 plugins 폴더를 확인하지 못했습니다.
echo 설치 도우미로 원본을 설치하고 다시 점검하세요. 파일은 변경하지 않았습니다.
echo 원본을 다른 드라이브에 설치했다면 원본 WanGP의 실제 폴더를 다시 입력하세요.
echo 공식 Manager 설치가 아직 끝나지 않았다면 먼저 설치를 완료하세요.
goto failed

:missing_plugin
echo [점검 불가] 한글 스튜디오 폴더를 확인하지 못했습니다.
echo 한글 플러그인이 없거나 다른 위치에 설치됐을 수 있습니다. 파일은 변경하지 않았습니다.
echo 원본 plugins 폴더 안의 wan2gp-gomfox-studio 이름을 확인하세요.
echo 기존 폴더를 지우지 말고 설치 도우미와 현재 버전을 먼저 대조하세요.
goto failed

:integrity_failed
echo [점검 필요] 필수 파일의 누락 또는 SHA-256 불일치가 발견됐습니다.
echo 원본과 기존 플러그인을 자동 교체하지 않았습니다. 버전을 먼저 확인하세요.
echo 이번 검사 기준은 v0.36 고정 소스이며 이전 버전 정상 파일도 불일치할 수 있습니다.
echo 어떤 파일에서 누락 또는 불일치가 났는지 확인하고 수동 삭제 없이 보고해 주세요.
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
