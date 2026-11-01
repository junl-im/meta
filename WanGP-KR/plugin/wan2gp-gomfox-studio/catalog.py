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


def format_model_details(session: Any, model_type: str = "") -> str:
    """원본 WanGP API가 제공하는 모델 정보만 표시한다. 다운로드/설정 변경 없음."""
    key = str(model_type or "").strip()
    if not key:
        return "모델 탐색 결과에서 모델 ID를 확인하고 입력해 주세요."
    if session is None:
        return "원본 모델 API를 연결할 수 없습니다. 원본 WanGP에서 확인해 주세요."

    try:
        candidates = session.list_model_metadata()
    except Exception as exc:
        return f"모델 목록을 읽지 못했습니다: {type(exc).__name__}: {exc}"

    match = next(
        (item for item in (candidates or [])
         if isinstance(item, dict)
         and str(item.get("model_type") or "").casefold() == key.casefold()),
        None,
    )
    if match is None:
        return "일치하는 모델 ID가 없습니다. 먼저 원본 모델 목록을 새로 조회해 주세요."

    exact_id = str(match["model_type"])
    name = str(match.get("name") or exact_id)
    family = str(match.get("family_label") or match.get("family") or "정보 없음")
    roles = ", ".join(_output_names(match)) or "미분류"
    rows = [
        f"모델: {name}",
        f"원본 ID: {exact_id}",
        f"계열: {family}",
        f"출력 종류: {roles}",
        "",
    ]
    try:
        schema = session.get_model_schema(exact_id)
        if isinstance(schema, dict):
            inputs = schema.get("inputs") or []
            if isinstance(inputs, str):
                inputs = [inputs]
            if isinstance(inputs, (list, tuple)):
                rows.append("입력 종류: " + (", ".join(map(str, inputs)) or "정보 없음"))
            caps = schema.get("capabilities") or {}
            if isinstance(caps, dict):
                enabled = [str(k) for k, v in caps.items() if v is True]
                if enabled:
                    rows.append("지원 기능: " + ", ".join(enabled[:12]))
    except Exception as exc:
        rows.append(f"지원 기능 조회 실패: {type(exc).__name__}")

    try:
        availability = session.get_model_availability(exact_id)
        if isinstance(availability, dict):
            import json
            summary = json.dumps(availability, ensure_ascii=False, default=str, sort_keys=True)
            rows.append("")
            rows.append("원본 모델 파일 상태 (WanGP 보고):")
            rows.append(summary[:1800] + ("…" if len(summary) > 1800 else ""))
        else:
            rows.append("원본 모델 파일 상태 정보 없음")
    except Exception as exc:
        rows.append(f"모델 파일 상태 조회 실패: {type(exc).__name__}")

    rows.extend([
        "",
        "주의: 파일이 준비되어 있어도 PC의 GPU·VRAM에서 실행 가능하다는 보장은 없습니다.",
        "이 조회는 모델 다운로드, GPU 생성, 원본 설정 변경을 하지 않습니다.",
    ])
    return "\n".join(rows)


def format_queue_status(session: Any, show_prompts: bool = False) -> str:
    """WanGP가 관리하는 현재 공용 큐를 읽는다. 취소·재실행·파일 접근 없음."""
    if session is None or not callable(getattr(session, "list_queue", None)):
        return "원본 큐 상태 API를 이용할 수 없습니다. WanGP 원본 제작 화면에서 확인해 주세요."
    try:
        queue = session.list_queue()
    except Exception as exc:
        return f"작업 상태 조회 실패: {type(exc).__name__}: {exc}"
    if not isinstance(queue, dict):
        return "원본 큐가 예상한 형식으로 응답하지 않았습니다."

    def count(label: str) -> str:
        raw = queue.get(label, 0)
        try:
            return str(max(0, int(raw)))
        except (ValueError, TypeError, OverflowError):
            return "?"

    rows = [
        f"전체 {count('total_count')}개 · 실행 중 {count('running_count')}개 · 대기 {count('queued_count')}개",
        "이 숫자는 조회 시점의 현재 큐 상태이며 자동 새로고침되지 않습니다.",
        "",
    ]
    tasks = queue.get("tasks") or []
    if not isinstance(tasks, (list, tuple)):
        return "\n".join(rows + ["원본 작업 목록 형식이 올바르지 않습니다."])
    status_labels = {"queued": "대기", "running": "실행 중", "cancelling": "취소 처리 중"}
    if not tasks:
        rows.append("현재 원본 큐에 대기 중이거나 실행 중인 작업이 없습니다.")
    for index, item in enumerate(tasks[:20], start=1):
        if not isinstance(item, dict):
            continue
        status = str(item.get("status") or "")
        model = str(item.get("model_type") or "모델 미표시").replace("\n", " ")[:100]
        rows.append(f"{index}. {status_labels.get(status, status or '상태 미표시')} · {model}")
        if show_prompts:
            prompt = " ".join(str(item.get("prompt") or "").split())[:180]
            if prompt:
                rows.append(f"   내용: {prompt}")
    if len(tasks) > 20:
        rows.append(f"그 외 {len(tasks) - 20}개 작업은 원본 큐 화면에서 확인하세요.")
    rows.extend([
        "",
        "개별 작업의 실시간 진행률(%)은 이 목록 API에 포함되지 않습니다.",
        "완료한 결과물은 원본 WanGP의 갤러리에서 확인하세요.",
    ])
    return "\n".join(rows)
