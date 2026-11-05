"""한 번 누를 때만 수행하는 한국어 스튜디오의 비침습적 시작 점검.

플러그인 파일과 원본 API의 읽기 전용 상태만 확인한다. 모델 다운로드,
생성, 네트워크 요청, 사용자 설정 변경, 파일 저장을 수행하지 않는다.
"""

from __future__ import annotations

from pathlib import Path
import re
from typing import Any


ART_FILES = (
    "category-video.webp",
    "category-image.webp",
    "category-audio.webp",
    "category-3d.webp",
)
BASE_FILES = ("studio-hero.png", "gomfox-studio-icon.png", "plugin_info.json")


# 원본 로그의 알려진 오류 문구를 분류하는 참고표. 입력을 재출력하거나
# 저장하지 않으며, 진단을 위해 외부 서비스·원본 엔진을 호출하지 않는다.
ERROR_HINTS = (
    (
        "저장 공간 부족", r"no space left on device|\[winerror 112\]|disk full|not enough disk space",
        "Windows에서 설치·모델 저장 드라이브의 남은 공간을 확인하세요. "
        "다운로드 중이던 작업의 상태는 원본 WanGP에서 확인하고, 기존 파일을 무작정 삭제하지 마세요.",
    ),
    (
        "GPU 또는 시스템 메모리 부족",
        r"cuda\s+out of memory|outofmemoryerror|cudnn_status_alloc_failed|"
        r"defaultcpuallocator.*can't allocate|not enough memory resources|\[winerror 8\]",
        "원본에서 지원되는 작은 모델·낮은 해상도·짧은 프레임으로 다시 시험하세요. "
        "RAM 16GB와 GPU 전용 VRAM은 다릅니다. 진행 중인 작업을 먼저 확인하고 "
        "원본의 RAM/VRAM 관리 안내를 살펴보세요.",
    ),
    (
        "GPU 드라이버·CUDA 호환성 확인",
        r"no kernel image is available|cuda driver version is insufficient|"
        r"torch not compiled with cuda|no cuda gpus are available|"
        r"cuda error: invalid device function",
        "Windows 작업 관리자에서 GPU 이름을 확인하고 원본 WanGP의 공식 지원 GPU·드라이버 안내와 대조하세요. "
        "이 안내는 드라이버를 설치하거나 CUDA 설정을 변경하지 않습니다.",
    ),
    (
        "한글 플러그인 로딩 확인",
        r"(?:failed|error|unable)\s+to\s+(?:load|import)\s+plugin|"
        r"(?:wan2gp-gomfox-studio|gomfox_studio).{0,100}(?:importerror|modulenotfounderror)",
        "원본 Apps & PlugIn Manager의 활성화 상태를 확인하고, "
        "Windows 점검 도우미에서 한글 플러그인 14개 파일의 SHA-256을 검사하세요. "
        "버전이 다른 파일을 자동 덮어쓰지 마세요.",
    ),
    (
        "Python 모듈 불러오기 실패", r"modulenotfounderror|no module named|^importerror:",
        "원본 설치 관리자에서 설치 완료 여부와 실행 환경을 확인하세요. "
        "오류의 모듈 이름은 원본 실행 창에서 확인하되 Python 패키지를 임의로 교체하지 마세요.",
    ),
    (
        "모델 다운로드·네트워크 연결 문제",
        r"connection timed out|readtimeout|connecttimeout|"
        r"connectionerror|http\s*(?:403|404|429|500|502|503)\b|"
        r"(?:download|huggingface|model).{0,60}(?:timeout|failed|error)",
        "원본 모델 다운로드 상태와 인터넷 연결·저장 공간을 확인하세요. "
        "원본 작업 큐에서 실패 여부를 확인한 뒤 공식 다운로드 경로를 이용하세요.",
    ),
    (
        "실행 포트 사용 중", r"address already in use|\[winerror 10048\]|port\s+\d+\s+is already in use",
        "이미 실행 중인 WanGP 브라우저·실행 창이 있는지 확인하세요. "
        "작업 중인 프로그램을 강제로 종료하지 말고 실행 중인 세션부터 살펴보세요.",
    ),
    (
        "필수 파일 경로 확인", r"filenotfounderror|no such file or directory|the system cannot find the file specified",
        "원본 오류 문장에 표시된 파일이 실제 설치 위치에 있는지 확인하세요. "
        "모델 파일과 한글 플러그인 파일을 구분하고 기존 폴더를 임의로 이동하지 마세요.",
    ),
)


def format_error_diagnosis(error_text: str | None) -> str:
    """사용자가 붙여넣은 오류를 로컬 문자열 비교로만 분류한다.

    메시지는 출력·기록하지 않아 경로/토큰/개인정보의 재노출을 줄인다.
    정확한 원인 판정이나 원본 실행 성공 여부를 추정하지 않는다.
    """
    if not isinstance(error_text, str) or not error_text.strip():
        return "오류 문장을 입력한 뒤 **한국어 진단 보기**를 눌러 주세요. 외부 서비스로 전송하거나 별도 파일로 저장하지 않습니다."
    # Traceback의 마지막 줄에 실제 예외가 오는 경우가 많다. 길이 제한으로 처리 비용을 묶는다.
    sample = error_text[-20_000:]
    for title, pattern, advice in ERROR_HINTS:
        if re.search(pattern, sample, flags=re.IGNORECASE | re.MULTILINE):
            return (
                f"### 가능한 문제: {title}\n\n"
                "**판정 범위:** 붙여넣은 오류 문구와 알려진 유형이 일치합니다. "
                "실제 원인이나 GPU 호환성을 자동 확인한 것은 아닙니다.\n\n"
                f"**안전한 다음 행동:** {advice}\n\n"
                "이 진단은 입력 로그를 다시 표시하거나 별도 저장·외부 서비스 전송하지 않으며 "
                "파일 삭제·설정 변경·모델 다운로드를 수행하지 않습니다."
            )
    return (
        "### 원인을 아직 구분할 수 없습니다\n\n"
        "입력 문구에서 알려진 오류 유형을 찾지 못했습니다. 원본 WanGP의 실행 창과 "
        "작업 큐를 먼저 확인하고, 위의 **상황별 해결 안내**에서 가장 가까운 항목을 골라 주세요.\n\n"
        "오류 문구·개인 경로·토큰은 이 결과에 재출력되지 않으며 별도 저장·외부 서비스 전송하지 않습니다."
    )


def _raster_ok(path: Path) -> bool:
    """Tiny signature check; the installer separately performs real SHA-256 checks."""
    try:
        if not path.is_file() or not 0 < path.stat().st_size < 4_000_000:
            return False
        with path.open("rb") as stream:
            header = stream.read(12)
        if path.suffix == ".webp":
            return header[:4] == b"RIFF" and header[8:12] == b"WEBP"
        if path.suffix == ".png":
            return header[:8] == b"\x89PNG\r\n\x1a\n"
    except OSError:
        return False
    return False


def format_studio_readiness(session: Any, plugin_root: Path | None = None) -> str:
    """Never mutate a session. Avoid exposing local paths and exception details."""
    root = plugin_root if plugin_root is not None else Path(__file__).resolve().parent
    available_art = sum(_raster_ok(root / filename) for filename in ART_FILES)
    missing_assets = [
        name for name in BASE_FILES
        if not (_raster_ok(root / name) if name.endswith(".png") else (root / name).is_file())
    ]

    rows = [
        "곰같은여우의 AI 스튜디오 · 시작 점검 (읽기 전용)",
        f"- 분야별 WebP 원화: {available_art}/4개 파일 형식 확인",
    ]
    if available_art != 4:
        rows.append("  일부 그림이 없거나 손상되었습니다. 기본 색상 버튼으로 표시될 수 있습니다.")
    if missing_assets:
        rows.append("- 기본 화면 파일: 확인 필요 (" + ", ".join(missing_assets) + ")")
    else:
        rows.append("- 기본 화면 파일: 배너·아이콘·플러그인 정보 존재")

    metadata = getattr(session, "list_model_metadata", None) if session is not None else None
    if not callable(metadata):
        rows.append("- 원본 모델 API: 연결 확인 불가 · WanGP 원본 화면에서 직접 확인")
    else:
        try:
            records = metadata()
            if not isinstance(records, (list, tuple)):
                rows.append("- 원본 모델 API: 예상과 다른 응답 형식")
            else:
                count = sum(isinstance(item, dict) for item in records)
                rows.append(f"- 원본 모델 API: 응답 확인 · 메타데이터 {count}개")
                if count == 0:
                    rows.append("  모델 메타데이터가 비어 있습니다. 원본 WanGP 설치 상태를 확인하세요.")
        except Exception as exc:
            rows.append(f"- 원본 모델 API: 조회 실패 ({type(exc).__name__})")

    queue = getattr(session, "list_queue", None) if session is not None else None
    rows.append("- 원본 작업 큐: 조회 API 있음" if callable(queue) else "- 원본 작업 큐: 연결 확인 불가")

    rows.extend([
        "",
        "이 점검은 생성 성공·GPU 호환성·모델 다운로드 완료를 보증하지 않습니다.",
        "지원되는 모델을 원본 WanGP에서 골라 작은 이미지 한 장부터 시험해 주세요.",
        "원본 설정 변경, 유료 API 연결, 개인정보 외부 전송은 수행하지 않았습니다.",
    ])
    return "\n".join(rows)
