@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
title 곰같은여우의 AI 스튜디오 - Windows 실기기 정보 기록

echo.
echo ==============================================================
echo  곰같은여우의 AI 스튜디오 v0.27 - Windows 실기기 정보 기록
echo ==============================================================
echo.
echo 이 도우미는 Windows의 읽기 전용 정보만 수집합니다.
echo 원본 WanGP 실행, 모델 다운로드, GPU 생성, GPT 호출은 하지 않습니다.
echo 실제 무료 이미지 생성 성공 여부는 직접 확인하고 따로 기록해야 합니다.
echo 파일 저장은 마지막에 요청할 때만 시도합니다.
echo 보고서에는 계정, 파일 경로, 프롬프트, 비밀번호, 로그 원문을 넣지 않습니다.
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 goto missing_powershell

set "GOMFOX_CHECK_DIR=%LOCALAPPDATA%\GomFoxAIStudio\WanGP"
if exist "%GOMFOX_CHECK_DIR%\wgp.py" if exist "%GOMFOX_CHECK_DIR%\plugins\" goto directory_ready

echo 기본 위치에 원본 WanGP가 확인되지 않았습니다.
echo 설치했다면 실제 원본 폴더를 따옴표 없이 입력하세요. Enter만 누르면 미확인으로 표시합니다.
set "GOMFOX_CHECK_DIR="
set /p "GOMFOX_CHECK_DIR=원본 WanGP 폴더 (선택): "
if not defined GOMFOX_CHECK_DIR goto directory_unverified
powershell.exe -NoProfile -NonInteractive -Command "$p=$env:GOMFOX_CHECK_DIR; if($p.Contains([char]34) -or $p.Contains([char]10) -or $p.Contains([char]13)) { exit 1 }"
if errorlevel 1 goto directory_unverified

:directory_ready
if not exist "%GOMFOX_CHECK_DIR%\wgp.py" goto directory_unverified
if not exist "%GOMFOX_CHECK_DIR%\plugins\" goto directory_unverified
set "GOMFOX_SOURCE_STATUS=원본 파일 구조 발견 (실행 성공은 미검증)"
goto collect

:directory_unverified
set "GOMFOX_SOURCE_STATUS=원본 파일 구조 미확인"
set "GOMFOX_CHECK_DIR="

:collect
echo.
echo [1/2] 읽기 전용 진단 정보 확인
call :print_report
if errorlevel 1 goto probe_failed
echo.
echo [2/2] 선택형 보고서 저장
echo 이 보고서는 하드웨어 정보와 파일 존재 여부만 기록하며 자동 생성 결과가 아닙니다.
echo 다른 사람에게 보내기 전에 내용에 개인 식별 정보가 없는지 확인하세요.
choice /C YN /M "검사 내용을 이 CMD 파일과 같은 폴더의 TXT로 저장할까요?"
if errorlevel 2 goto done

set "GOMFOX_REPORT_FILE=%~dp0gomfox-v027-windows-qa.txt"
if exist "%GOMFOX_REPORT_FILE%" goto report_exists
call :print_report > "%GOMFOX_REPORT_FILE%"
if errorlevel 1 goto report_failed
if not exist "%GOMFOX_REPORT_FILE%" goto report_failed
echo [저장 요청 완료] gomfox-v027-windows-qa.txt
echo CMD 파일과 같은 폴더에 TXT가 실제로 만들어졌는지 확인하세요.
goto done

:report_exists
echo [저장 보류] 같은 이름의 TXT가 이미 있습니다. 기존 보고서를 덮어쓰지 않았습니다.
echo 기존 파일을 다른 이름으로 직접 옮긴 뒤 다시 실행하세요.
goto done

:report_failed
echo [저장 실패] 이 폴더에 쓰기 권한이 없을 수 있습니다.
echo 실패 중 새 TXT가 부분 작성됐을 수 있으니 확인해 주세요.
echo 기존 파일을 삭제하거나 덮어쓰지 않았습니다. 다른 폴더에 CMD를 복사해 실행하세요.
goto done

:missing_powershell
echo [점검 불가] Windows PowerShell을 찾지 못했습니다.
echo 공식 Windows에서 PowerShell 사용 가능 여부를 확인하세요.
pause
exit /b 1

:probe_failed
echo [점검 미완료] Windows 정보 조회 명령이 정상적으로 완료되지 않았습니다.
echo 지금 출력된 정보로 호환성을 판정하지 마세요.
pause
exit /b 1

:done
echo.
echo [다음 단계] v0.27 검수표에서 원본 실행, 모델 선택, 실제 무료 이미지 생성 및 저장을 직접 확인하세요.
echo 점검 파일 일치 여부는 기존 check_studio_windows.cmd 도우미로 따로 확인하세요.
echo 이번 진단만으로 WanGP 작동/모델 지원/GPU 생성 성공을 판단하지 마세요.
pause
exit /b 0

:print_report
echo 곰같은여우의 AI 스튜디오 - v0.27 Windows 환경 진단 (읽기 전용)
echo 사용 플러그인 기준: v0.32.0-dev / 설치·점검 파일 14개 무결성은 별도 확인
echo 원본 구조: %GOMFOX_SOURCE_STATUS%
powershell.exe -NoProfile -NonInteractive -Command "$ErrorActionPreference='SilentlyContinue'; $os=Get-CimInstance Win32_OperatingSystem; if($os) { Write-Output ('Windows: '+$os.Caption+' / Build '+$os.BuildNumber); if($os.TotalVisibleMemorySize) { Write-Output ('사용 가능 RAM(GB): '+[math]::Round($os.FreePhysicalMemory/1MB,1)+' / 총 RAM(GB): '+[math]::Round($os.TotalVisibleMemorySize/1MB,1)) } } else { Write-Output 'Windows/RAM: 조회 실패' }; $g=Get-CimInstance Win32_VideoController; if($g) { $g | ForEach-Object { Write-Output ('GPU 이름: '+$_.Name+' / 드라이버: '+$_.DriverVersion) } } else { Write-Output 'GPU 이름: 조회 실패' }; $smi=Get-Command nvidia-smi.exe -CommandType Application -ErrorAction SilentlyContinue; if($smi) { $data= & $smi.Source '--query-gpu=index,name,memory.total,driver_version' '--format=csv,noheader,nounits' 2>$null; if($LASTEXITCODE -eq 0 -and $data) { $data | ForEach-Object { Write-Output ('NVIDIA 실제 장치 보고 (번호,이름,총 VRAM MiB,드라이버): '+$_) } } else { Write-Output 'NVIDIA VRAM: 조회 불가' } } else { Write-Output 'NVIDIA VRAM: 지원 도구 없음 / 직접 확인 필요' }; if($env:GOMFOX_CHECK_DIR) { $root=$env:GOMFOX_CHECK_DIR; $plugin=Join-Path $root 'plugins\wan2gp-gomfox-studio'; Write-Output ('한글 플러그인 폴더: '+$(if(Test-Path -LiteralPath $plugin -PathType Container) { '발견' } else { '미확인' })); $info=Join-Path $plugin 'plugin_info.json'; if(Test-Path -LiteralPath $info -PathType Leaf) { try { $meta=Get-Content -LiteralPath $info -Raw | ConvertFrom-Json; if($meta.version) { Write-Output ('플러그인 버전 표기: '+$meta.version) } else { Write-Output '플러그인 버전: 확인되지 않음' } } catch { Write-Output '플러그인 버전: 읽기 실패' } } else { Write-Output '플러그인 버전: 확인되지 않음' } } else { Write-Output '한글 플러그인: 원본 위치 미확인' }"
if errorlevel 1 exit /b 1
echo 파일 무결성(SHA-256): 별도 점검 필요
echo 실제 WanGP 실행/원본 API/무료 이미지 생성/파일 저장: 미검증
echo 전용 VRAM은 NVIDIA 도구 보고가 없으면 작업 관리자에서 직접 확인
echo GPU 메모리 총량은 생성 시 남은 가용량 또는 모델 지원을 보증하지 않음
exit /b 0
