"""한 번 누를 때만 수행하는 한국어 스튜디오의 비침습적 시작 점검.

플러그인 파일과 원본 API의 읽기 전용 상태만 확인한다. 모델 다운로드,
생성, 네트워크 요청, 사용자 설정 변경, 파일 저장을 수행하지 않는다.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any


ART_FILES = (
    "category-video.webp",
    "category-image.webp",
    "category-audio.webp",
    "category-3d.webp",
)
BASE_FILES = ("studio-hero.png", "gomfox-studio-icon.png", "plugin_info.json")


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
