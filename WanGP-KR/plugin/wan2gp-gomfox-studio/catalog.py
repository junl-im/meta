"""WanGP의 원본 모델 메타데이터를 한국어로 읽기만 하는 탐색기.

별도의 모델 목록/VRAM 추정치를 유지하지 않고 원본 API가 반환한 값만 사용한다.
GPU 생성·가중치 다운로드·외부 네트워크 호출을 하지 않는다.
"""

from __future__ import annotations

import math
from typing import Any


PAGE_SIZE = 40
CATEGORY_OUTPUTS = {
    "영상": "video",
    "이미지": "image",
    "음성": "audio",
    "3D": "3d",
    "월드": "world",
}
KNOWN_OUTPUTS = frozenset(CATEGORY_OUTPUTS.values())


def _output_names(record: dict[str, Any]) -> list[str]:
    raw = record.get("main_output") or record.get("outputs") or []
    if isinstance(raw, str):
        raw = [raw]
    elif not isinstance(raw, (list, tuple, set)):
        raw = []
    return [str(value).strip().casefold() for value in raw if str(value).strip()]


def _match_category(record: dict[str, Any], category: str) -> bool:
    outputs = _output_names(record)
    if category == "전체":
        return True
    if category == "기타":
        return not (KNOWN_OUTPUTS & set(outputs))
    return CATEGORY_OUTPUTS.get(category, "") in outputs


def _page_number(raw: object) -> int:
    try:
        n = float(raw)
        if not math.isfinite(n):
            return 1
        return max(1, int(n))
    except (TypeError, ValueError, OverflowError):
        return 1


def format_model_catalog(
    session: Any,
    category: str = "전체",
    query: str = "",
    page: object = 1,
) -> str:
    """원본 API의 전체 목록을 페이지별로 출력한다. 알 수 없는 신모델도 '전체'에 포함된다."""
    if session is None:
        return "원본 모델 API 연결을 확인할 수 없습니다. WanGP 원본 제작 화면을 이용해 주세요."

    try:
        original_records = session.list_model_metadata()
    except Exception as exc:
        return f"원본 모델 목록을 읽지 못했습니다: {type(exc).__name__}: {exc}"

    search = (query or "").strip().casefold()
    matches = []
    for record in original_records or []:
        if not isinstance(record, dict) or not _match_category(record, category):
            continue
        name = str(record.get("name") or record.get("model_type") or "이름 없음")
        model_type = str(record.get("model_type") or "")
        family = str(record.get("family_label") or record.get("family") or "")
        if search and search not in " ".join((name, model_type, family)).casefold():
            continue
        matches.append((name, model_type, _output_names(record)))

    matches.sort(key=lambda item: (item[0].casefold(), item[1].casefold()))
    page_no = _page_number(page)
    total = len(matches)
    total_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)

    if page_no > total_pages:
        return f"{category}: 검색 결과 {total}개. {page_no}페이지는 없습니다. 마지막 페이지는 {total_pages}입니다."

    start = (page_no - 1) * PAGE_SIZE
    subset = matches[start : start + PAGE_SIZE]
    rows = [f"분류: {category} / 검색 결과: {total}개 / {page_no} / {total_pages}페이지"]
    rows.append("이 목록은 원본 WanGP 메타데이터를 읽은 결과입니다. 개별 GPU에서 실행 가능한지와는 별개입니다.")
    rows.append("")
    if not subset:
        rows.append("일치하는 모델이 없습니다.")
    else:
        for index, (name, model_type, outputs) in enumerate(subset, start=start + 1):
            roles = ", ".join(outputs) if outputs else "미분류"
            rows.append(f"{index}. {name} [{model_type}] / 출력: {roles}")

    return "\n".join(rows)
