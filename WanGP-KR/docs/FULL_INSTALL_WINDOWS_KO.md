# 곰같은여우의 AI 스튜디오 — Windows 전체 설치 안내

> **2026-11-01 기준 개발용 설치 도우미**입니다. 설치 파일 코드와 공식 저장소·체크섬 URL을 확인했지만, 사용자의 Windows 컴퓨터에서 처음부터 끝까지 실행 검증한 상태는 아닙니다. 실제 실행 전 중요 파일을 백업해 주세요.

## 목표

**원본 WanGP 프로그램 + Python/필수 라이브러리 + 한글 스튜디오 플러그인**을 설치합니다. 원본 WanGP Community License 2.0과 각 AI 모델 라이선스는 그대로 적용합니다.

**모든 AI 모델을 한꺼번에 받지는 않습니다.** 모델별 가중치가 매우 클 수 있으므로 원본 WanGP에서 사용할 모델을 선택할 때 다운로드하는 방식입니다. 이게 기능을 삭제하는 것은 아닙니다.

## 시작 전 준비

- Windows 64비트 컴퓨터
- 인터넷 연결, 설치 및 모델 다운로드에 필요한 충분한 SSD/HDD 여유 공간
- 가능하면 [작업 관리자 → 성능 → GPU]에서 GPU 모델과 전용 VRAM 확인
- 시스템 RAM 16GB는 확인했지만, 지원 가능한 실제 영상 모델과 성능은 GPU에 따라 다릅니다.
- 공식 원본: https://github.com/deepbeepmeep/WanGP
- 공식 설치 관리자: https://github.com/deepbeepmeep/WanGP/releases/latest/download/WanGPManager.exe

## 가장 쉬운 설치 순서

1. **추천 방법: [전체 설치 도우미 파일](https://github.com/junl-im/meta/blob/feat/wangp-kr-planning-20261101/WanGP-KR/scripts/install_studio_full_windows.cmd)**에서 **Download raw file**을 눌러 `install_studio_full_windows.cmd` 파일 하나를 저장합니다. 코드를 먼저 확인할 수 있습니다. Windows 보안 경고를 무조건 무시하지 말고 출처를 확인하세요.
   - **다른 방법:** [전체 프로젝트 ZIP 받기](https://github.com/junl-im/meta/archive/refs/heads/feat/wangp-kr-planning-20261101.zip) → 압축 풀기 → `WanGP-KR/scripts/`에서 같은 설치 파일을 사용해도 됩니다.
2. 저장한 `install_studio_full_windows.cmd`를 **더블클릭**합니다. 외부 관리자 권한이나 이미 설치된 Git/Python이 필요하지 않도록, 공식 Manager를 이용하는 경로입니다. 기본 Windows의 `curl.exe`·PowerShell은 필요합니다.
3. 설치 도우미는 먼저 한글 플러그인 코드 6개와 전용 PNG 배너 1개를 네 GitHub의 **고정 커밋(0db6b58)**에서 내려받아 각각 SHA-256을 검사합니다(같은 폴더에 이미 있으면 재사용). 그다음 공식 GitHub의 **WanGPManager.exe**와 **WanGPManager.exe.sha256**을 다운로드해 무결성을 확인합니다. 검사 실패 시 실행하지 않습니다.
4. 질문이 나오면 **Y**를 선택해 공식 WanGP Manager를 실행합니다. Manager의 **Install** 메뉴에서 전체 WanGP를 설치하고 GPU에 맞는 추천 프로필을 확인합니다.
5. 가능하면 설치 도우미 화면에 표시된 기본 폴더를 WanGP 설치 위치로 선택하세요. 다른 경로도 가능하지만 이후 폴더를 한 번 입력해야 합니다.
6. Python 및 필요한 라이브러리 설치가 모두 끝나면 **WanGP Manager를 닫습니다**. 설치 도우미가 다음 단계로 넘어갑니다.
7. 한글 플러그인 추가 질문이 나오면 경로를 확인한 뒤 **Y**를 누릅니다. 이미 플러그인 폴더가 있다면 덮어쓰지 않고 중단합니다.
8. 설치가 끝나면 **바탕화면 바로가기 생성**을 선택할 수 있습니다. 설치 폴더에 공식 `scripts\\run.bat` 파일이 확인될 때만 제안하며, 기존 바로가기는 덮어쓰지 않습니다. 이 실행 방식이 Manager가 설치한 환경과 맞지 않으면 **WanGP Manager → Start WanGP**를 사용하세요.
9. WanGP를 실행한 뒤 원본 **Apps & PlugIn Manager**에서 **곰같은여우의 AI 스튜디오**를 찾아 활성화합니다. 원본에서 재시작을 요구하면 따라 주세요.
10. 새 한국어 탭의 **처음 실행 · 따라 하기**에서 작업을 고르고(1단계), 필요하면 PC 사양을 확인한 뒤(2단계), 무료 제작 화면으로 이동하세요(3단계). 처음에는 작은 이미지 또는 짧은 영상부터 시험합니다.

## v0.6 첫 실행 안내와 바로가기

- 첫 실행 화면은 **한글 3단계 안내**입니다. 작업별 사용법이 바뀌며, **사양 확인 버튼은 읽기 전용**입니다.
- 이 안내를 열었다고 AI 모델 다운로드·실행·GPU 설정 변경·GPT 연결이 자동 시작되지 않습니다.
- 바탕화면 바로가기는 **옵션**입니다. 실제로 `scripts\\run.bat`가 있는 설치에서만 생성 시도를 하며 기존 `.lnk` 파일을 보호합니다.
- 공식 Manager 설치 방식과 바로가기의 실행 환경 연동은 **Windows 실기 검증 전**입니다. 문제가 생기면 공식 Manager의 **Start WanGP**로 실행할 수 있습니다.
- 원본의 전체 기능은 삭제하지 않지만 모든 모델의 가중치를 한 번에 설치하거나 저사양에서 모든 모델의 실행을 보장하는 뜻은 아닙니다.

## 설치 도우미가 하지 않는 것

- GPU 드라이버·Windows 설정 변경
- 기존 WanGP 소스·모델·사용자 파일 삭제 또는 강제 덮어쓰기
- GPT/Claude/유료 API 로그인 또는 자동 과금
- 모델 가중치 전부를 무조건 다운로드
- 인터넷에 사용자 사진·영상·토큰 업로드
- 검증에 실패한 설치 관리자를 실행

## 왜 공식 Manager를 사용하나요?

공식 WanGP Manager는 GPU에 맞는 환경과 실행 프로필을 안내하고 Python/의존성 설치, 버전별 업데이트·롤백을 지원합니다. 프로젝트 자체 installer를 새로 만들면서 원본의 드라이버/라이브러리 호환성을 훼손하지 않으려는 선택입니다.

다만 현재 공식 Manager는 **실험적(Experimental)** 윈도우 도구입니다. GPU 지원 여부는 원본 설치 문서를 확인해야 합니다.

## 처음 무료로 사용하기

- WanGP 기본 미디어 생성은 GPT 없이 로컬로 처리할 수 있습니다(호환되는 GPU·모델에 한함).
- `GPT 감독` 영역은 기본으로 꺼져 있습니다.
- 자동 영상 감독 Showrunner는 **Deepy Prime**이 필요한 별도 기능입니다. 로컬 LLM 또는 사용자가 선택한 원격 Codex로 이용하며, 어떤 방식이 가능한지는 PC 사양에 따라 다릅니다.
- 저사양 PC는 짧은 영상·낮은 해상도·소형 모델을 먼저 시험하세요.

## 문제가 생기면

| 현상 | 안내 |
|---|---|
| 공식 Manager 다운로드 실패 | 네트워크 확인. 공식 [Releases](https://github.com/deepbeepmeep/WanGP/releases)에서 직접 받을 수도 있습니다 |
| 체크섬 불일치 | 실행을 중단하는 것이 정상입니다. 다운로드 파일을 실행하지 마세요 |
| WanGP 폴더를 찾지 못함 | Manager에서 설치한 실제 폴더 경로를 입력하세요. `wgp.py`와 `plugins` 폴더가 있어야 합니다 |
| 한글 플러그인 이미 있음 | 기존 파일을 보호하려고 자동으로 중단합니다. 덮어쓰기/삭제하지 않습니다 |
| 메모리 부족 | 다른 앱을 닫고 원본의 가벼운 모델·RAM/VRAM 프로필을 검토하세요 |
| GPU가 지원되지 않음 | 설치가 되더라도 일부 AI 모델은 실행되지 않습니다. 지원 기종 확인이 필요합니다 |

## 공식 근거

- [WanGP README — 4가지 설치 방식 및 Manager](https://github.com/deepbeepmeep/WanGP)
- [Windows/Linux 설치 가이드](https://github.com/deepbeepmeep/WanGP/blob/main/docs/INSTALLATION.md)
- [시작 가이드 — GPU/VRAM 요건](https://github.com/deepbeepmeep/WanGP/blob/main/docs/GETTING_STARTED.md)
- [원본 라이선스](https://github.com/deepbeepmeep/WanGP/blob/main/LICENSE.txt)
