"""WanGP의 원본 모델 메타데이터를 한국어로 읽기만 하는 탐색기.

별도의 모델 목록/VRAM 추정치를 유지하지 않고 원본 API가 반환한 값만 사용한다.
GPU 생성·가중치 다운로드·외부 네트워크 호출을 하지 않는다.
"""

from __future__ import annotations

import math
import json
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


def _one_line(value: object, limit: int = 120) -> str:
    """원본 API 값 중 짧은 단일 행으로 표현 가능한 기본 타입만 노출한다."""
    if not isinstance(value, (str, int, float)) or isinstance(value, bool):
        return ""
    return " ".join(str(value).split())[:limit]


def _output_names(record: dict[str, Any]) -> list[str]:
    raw = record.get("main_output") or record.get("outputs") or []
    if isinstance(raw, str):
        raw = [raw]
    elif not isinstance(raw, (list, tuple, set)):
        raw = []
    return [name.casefold() for value in raw if (name := _one_line(value, 40))]


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
    except Exception:
        return "원본 모델 목록 조회에 실패했습니다. WanGP 원본에서 연결 상태를 확인하세요."

    if not isinstance(original_records, (list, tuple)):
        return "원본 모델 목록의 응답 형식이 예상과 다릅니다. WanGP 원본에서 확인하세요."

    search = _one_line(query or "", 200).casefold()
    matches = []
    for record in original_records or []:
        if not isinstance(record, dict) or not _match_category(record, category):
            continue
        name = _one_line(record.get("name") or record.get("model_type")) or "이름 없음"
        model_type = _one_line(record.get("model_type"))
        family = _one_line(record.get("family_label") or record.get("family"))
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
    key = _one_line(model_type or "", 120)
    if not key:
        return "모델 탐색 결과에서 모델 ID를 확인하고 입력해 주세요."
    if session is None:
        return "원본 모델 API를 연결할 수 없습니다. 원본 WanGP에서 확인해 주세요."

    try:
        candidates = session.list_model_metadata()
    except Exception:
        return "모델 목록 조회에 실패했습니다. WanGP 원본에서 연결 상태를 확인하세요."
    if not isinstance(candidates, (list, tuple)):
        return "모델 목록의 응답 형식이 예상과 다릅니다. WanGP 원본에서 확인하세요."

    match = next(
        (item for item in (candidates or [])
         if isinstance(item, dict)
         and str(item.get("model_type") or "").casefold() == key.casefold()),
        None,
    )
    if match is None:
        return "일치하는 모델 ID가 없습니다. 먼저 원본 모델 목록을 새로 조회해 주세요."

    exact_id = str(match["model_type"])
    name = _one_line(match.get("name") or exact_id) or "이름 없음"
    family = _one_line(match.get("family_label") or match.get("family")) or "정보 없음"
    roles = ", ".join(_output_names(match)) or "미분류"
    rows = [
        f"모델: {name}",
        f"원본 ID: {_one_line(exact_id)}",
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
                rows.append("입력 종류: " + (", ".join(filter(None, (_one_line(v, 50) for v in inputs[:20]))) or "정보 없음"))
            caps = schema.get("capabilities") or {}
            if isinstance(caps, dict):
                enabled = [_one_line(k, 60) for k, v in caps.items() if v is True]
                if enabled:
                    rows.append("지원 기능: " + ", ".join(filter(None, enabled[:12])))
    except Exception:
        rows.append("지원 기능 조회에 실패했습니다. 원본에서 확인하세요.")

    try:
        availability = session.get_model_availability(exact_id)
        if isinstance(availability, dict):
            rows.append("")
            rows.append("원본 모델 파일 상태 (WanGP 보고):")
            # 원본 응답에는 로컬 파일 경로 등 내부 정보가 섞일 수 있으므로
            # 검증 가능한 준비 여부만 최소 허용 목록으로 노출한다.
            ready = availability.get("files_ready")
            if isinstance(ready, bool):
                rows.append(json.dumps({"files_ready": ready}, ensure_ascii=False))
            else:
                rows.append("파일 준비 여부 미확인 · 원본 WanGP에서 직접 확인해 주세요.")
        else:
            rows.append("원본 모델 파일 상태 정보 없음")
    except Exception:
        rows.append("모델 파일 상태 조회에 실패했습니다. 원본에서 확인하세요.")

    rows.extend([
        "",
        "주의: 파일이 준비되어 있어도 PC의 GPU·VRAM에서 실행 가능하다는 보장은 없습니다.",
        "이 조회는 모델 다운로드, GPU 생성, 원본 설정 변경을 하지 않습니다.",
    ])
    return "\n".join(rows)


def _validated_gib(value: object) -> float | None:
    """사용자 입력이나 장치 정보의 비정상 수치를 실제 GPU 용량으로 취급하지 않는다."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        number = float(value)
    except (OverflowError, TypeError, ValueError):
        return None
    return number if math.isfinite(number) and 0 < number <= 1024 else None


def format_model_preflight(
    session: Any, model_type: str, hardware_info: dict[str, Any] | None,
    manual_vram_gib: object = None,
) -> str:
    """선택 모델과 현재 PC의 '확인된 사실'만 표시하는 수동 사전 점검.

    원본 읽기 API 두 개 외에 모델 다운로드·생성·설정 변경을 수행하지 않는다.
    정확한 GPU 최소 요구량은 원본이 명시하지 않는 한 추정하지 않는다.
    """
    key = str(model_type or "").strip()
    if not key or len(key) > 120:
        return "먼저 모델 찾아보기 목록에서 정확한 원본 모델 ID를 입력해 주세요."
    if session is None or not callable(getattr(session, "list_model_metadata", None)):
        return "원본 모델 API 연결을 확인할 수 없습니다. WanGP 원본 화면에서 모델을 확인하세요."
    try:
        records = session.list_model_metadata()
    except Exception:
        return "원본 모델 목록 조회에 실패했습니다. 원본 WanGP에서 연결 상태를 확인하세요."
    if not isinstance(records, (list, tuple)):
        return "원본 모델 목록이 예상한 형식이 아닙니다. 원본 화면에서 확인하세요."
    match = next(
        (record for record in records if isinstance(record, dict)
         and str(record.get("model_type") or "").casefold() == key.casefold()),
        None,
    )
    if match is None:
        return "입력한 모델 ID를 찾지 못했습니다. 모델 목록을 다시 조회하고 정확한 ID를 선택하세요."

    exact_id = str(match.get("model_type") or "").replace("\n", " ")[:120]
    name = str(match.get("name") or exact_id).replace("\n", " ")[:120]
    roles = set(_output_names(match))
    rows = [f"원본 모델 사전 점검 · {name}", f"원본 모델 ID: {exact_id}", ""]
    rows.append("① 원본 모델 파일 상태 (읽기 전용)")
    method = getattr(session, "get_model_availability", None)
    if not callable(method):
        rows.append("- 이 원본 API에서 파일 상태 조회 기능을 확인하지 못했습니다.")
    else:
        try:
            availability = method(str(match.get("model_type") or ""))
        except Exception:
            rows.append("- 파일 준비 상태 조회에 실패했습니다. 원본 모델 선택 화면을 확인하세요.")
        else:
            ready = availability.get("files_ready") if isinstance(availability, dict) else None
            if ready is True:
                rows.append("- 원본 보고: 필수 모델 파일 준비됨. 추가 파일·GPU 실행 성공까지 보장하지 않습니다.")
            elif ready is False:
                rows.append("- 원본 보고: 필수 모델 파일이 아직 준비되지 않았습니다. 다운로드는 원본에서 직접 선택하세요.")
            else:
                rows.append("- 준비 여부 미확인: 원본 모델 선택 화면의 파일 상태 표시를 직접 확인하세요.")

    info = hardware_info if isinstance(hardware_info, dict) else {}
    ram = _validated_gib(info.get("ram_gib"))
    measured_devices = [
        _validated_gib(item.get("vram_gib"))
        for item in (info.get("gpu_devices") or [])
        if isinstance(item, dict)
    ] if isinstance(info.get("gpu_devices") or [], (list, tuple)) else []
    observed = [size for size in measured_devices if size is not None]
    maximum = max(observed) if observed else None
    manual = _validated_gib(manual_vram_gib)
    rows.extend(["", "② 내 PC 메모리 (안내용)"])
    rows.append(f"- 시스템 RAM: {ram:g}GB" if ram is not None else "- 시스템 RAM: 확인되지 않음")
    if maximum is not None:
        rows.append(f"- 감지한 GPU 중 최대 전용 VRAM: {maximum:g}GB (원본이 사용하는 GPU인지는 미확인)")
    else:
        rows.append("- 자동 감지한 전용 VRAM: 확인되지 않음")
    if manual is not None:
        rows.append(f"- 사용자가 직접 확인했다고 입력한 전용 VRAM: {manual:g}GB (실측 검증 아님)")
    elif manual_vram_gib is not None:
        rows.append("- 직접 입력한 VRAM 값이 유효하지 않아 비교에 사용하지 않았습니다.")

    effective = manual if manual is not None else maximum
    rows.extend(["", "③ 다음에 할 일 (실행 가능 판정 아님)"])
    if effective is None:
        rows.append("- Windows 작업 관리자 → 성능 → GPU에서 전용 VRAM을 직접 확인하세요.")
    elif effective < 4:
        rows.append("- 전용 VRAM이 적습니다. 영상·3D 모델은 특히 신중히 검토하고 작은 이미지 작업부터 확인하세요.")
    elif effective < 6:
        rows.append("- VRAM이 낮은 편입니다. 원본의 경량 모델과 최소 해상도·길이를 직접 확인하세요.")
    else:
        rows.append("- 메모리가 감지되어도 원본 모델의 실제 최소 요구 VRAM과 다른 실행 조건을 확인하세요.")
    if "video" in roles or "3d" in roles or "world" in roles:
        rows.append("- 선택 모델은 영상·3D·월드 분야입니다. 첫 생성 전에 공식 모델별 요구 사양을 확인하세요.")
    elif "image" in roles:
        rows.append("- 이미지 모델입니다. 원본이 허용하는 작은 해상도와 배치 1개부터 검토하세요.")
    elif "audio" in roles:
        rows.append("- 음성 모델입니다. 원본 지원 여부와 필요한 자원을 확인한 후 짧은 작업부터 검토하세요.")
    else:
        rows.append("- 모델 출력 분야가 명확하지 않습니다. 원본에서 지원 작업을 확인하세요.")
    if ram is not None and ram <= 16.5:
        rows.append("- RAM 16GB급: 대형 모델과 로컬 감독 LLM을 동시에 실행하지 않는 편이 좋습니다.")
    rows.extend([
        "", "원본 메타데이터의 파일 준비 상태와 PC 사양만으로 실행 성공·속도·화질을 예측할 수 없습니다.",
        "이 점검은 모델 자동 선택·다운로드·GPU 생성·파일 저장·GPT 요청을 하지 않습니다.",
    ])
    return "\n".join(rows)


def format_queue_dashboard(session: Any, show_prompts: bool = False) -> tuple[str, str]:
    """원본 큐를 한 번 읽어 간단한 상태 요약과 기존 상세 내역을 함께 반환한다."""
    if session is None or not callable(getattr(session, "list_queue", None)):
        return (
            "**연결 확인 필요** · 원본 WanGP 큐를 조회할 수 없어요.",
            "원본 큐 상태 API를 이용할 수 없습니다. WanGP 원본 제작 화면에서 확인해 주세요.",
        )
    try:
        queue = session.list_queue()
    except Exception:
        return (
            "**조회 실패** · 원본 WanGP의 큐 상태를 확인해 주세요.",
            "작업 상태 조회에 실패했습니다. WanGP 원본에서 연결 상태를 확인하세요.",
        )
    if not isinstance(queue, dict):
        return (
            "**응답 확인 필요** · 원본 WanGP에서 직접 확인해 주세요.",
            "원본 큐가 예상한 형식으로 응답하지 않았습니다.",
        )

    def count(label: str) -> str:
        raw = queue.get(label, 0)
        try:
            return str(max(0, int(raw)))
        except (ValueError, TypeError, OverflowError):
            return "?"

    total, running, queued = count("total_count"), count("running_count"), count("queued_count")
    summary = (
        f"**전체 {total}개**　·　**실행 중 {running}개**　·　**대기 {queued}개**  \n"
        "*원본 큐 조회 시점 기준 · 자동 새로고침 아님*"
    )
    rows = [
        f"전체 {total}개 · 실행 중 {running}개 · 대기 {queued}개",
        "이 숫자는 조회 시점의 현재 큐 상태이며 자동 새로고침되지 않습니다.",
        "",
    ]
    tasks = queue.get("tasks") or []
    if not isinstance(tasks, (list, tuple)):
        return summary, "\n".join(rows + ["원본 작업 목록 형식이 올바르지 않습니다."])
    status_labels = {"queued": "대기", "running": "실행 중", "cancelling": "취소 처리 중"}
    if not tasks:
        rows.append("현재 원본 큐에 대기 중이거나 실행 중인 작업이 없습니다.")
    for index, item in enumerate(tasks[:20], start=1):
        if not isinstance(item, dict):
            continue
        status = _one_line(item.get("status"), 60)
        model = _one_line(item.get("model_type"), 100) or "모델 미표시"
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
    return summary, "\n".join(rows)


def format_queue_status(session: Any, show_prompts: bool = False) -> str:
    """기존 단일 텍스트 API 호환 유지. 원본 큐 변경·GPU 작업 없음."""
    return format_queue_dashboard(session, show_prompts)[1]
