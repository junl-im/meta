"""WanGP가 실행되는 컴퓨터의 사양을 읽기 전용으로 표시하는 진단 도구.

원격 API, 장치 설정 변경, GPU 벤치마크, 드라이버 설치, 파일 저장을 수행하지 않는다.
기본 진단은 버튼을 누른 경우에만 실행한다.
"""

from __future__ import annotations

import math
import os
import platform
import subprocess
from typing import Any


_GIB = 1024 ** 3


def _safe_gib(value: Any, maximum: float) -> float | None:
    """잘못된 센서값을 GPU 가용 메모리로 오인하지 않는다."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    try:
        numeric = float(value)
    except (OverflowError, ValueError):
        return None
    return numeric if math.isfinite(numeric) and 0 < numeric <= maximum else None


def _observed_vram(info: dict[str, Any]) -> float | None:
    values = [
        safe for device in (info.get("gpu_devices") or [])
        if isinstance(device, dict)
        if (safe := _safe_gib(device.get("vram_gib"), 1024)) is not None
    ]
    return max(values) if values else None


def _system_ram_gib() -> float | None:
    if platform.system() == "Windows":
        try:
            import ctypes

            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]

            status = MEMORYSTATUSEX()
            status.dwLength = ctypes.sizeof(status)
            if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
                return round(status.ullTotalPhys / _GIB, 1)
        except (AttributeError, ImportError, OSError, ValueError):
            pass
        return None

    try:
        pages = os.sysconf("SC_PHYS_PAGES")
        size = os.sysconf("SC_PAGE_SIZE")
        return round((pages * size) / _GIB, 1) if pages > 0 and size > 0 else None
    except (AttributeError, OSError, ValueError):
        return None


def _windows_gpu_names() -> list[str]:
    if platform.system() != "Windows":
        return []
    # WMI의 AdapterRAM은 일부 카드에서 4GB로 잘리므로 VRAM 용량에 사용하지 않는다.
    try:
        completed = subprocess.run(
            [
                "powershell.exe",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name",
            ],
            capture_output=True,
            text=True,
            timeout=6,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        if completed.returncode == 0:
            return [line.strip() for line in completed.stdout.splitlines() if line.strip()]
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired):
        pass
    return []


def detect_hardware() -> dict[str, Any]:
    """원격 전송 없이 현재 WanGP를 구동한 장치의 이름·RAM·가능한 VRAM을 읽는다."""
    info: dict[str, Any] = {
        "operating_system": platform.system(),
        "ram_gib": _system_ram_gib(),
        "gpu_devices": [],
        "gpu_names": [],
    }

    try:
        import torch

        if torch.cuda.is_available():
            for index in range(torch.cuda.device_count()):
                device = torch.cuda.get_device_properties(index)
                name = str(getattr(device, "name", "") or f"GPU {index}")
                total_memory = getattr(device, "total_memory", None)
                vram = (
                    round(valid / _GIB, 1)
                    if total_memory is not None
                    and (valid := _safe_gib(total_memory, 1024 * _GIB)) is not None
                    else None
                )
                info["gpu_devices"].append({"name": name, "vram_gib": vram})
    except (ImportError, RuntimeError, OSError, ValueError, OverflowError, AssertionError):
        pass

    if not info["gpu_devices"]:
        info["gpu_names"] = _windows_gpu_names()

    return info


def _recommend_vram(vram_gib: float | None) -> str:
    vram_gib = _safe_gib(vram_gib, 1024)
    if vram_gib is None:
        return (
            "전용 VRAM 용량을 자동 확인하지 못했습니다. "
            "Windows 작업 관리자 → 성능 → GPU에서 '전용 GPU 메모리'를 확인해 주세요."
        )
    if vram_gib < 4:
        return (
            "VRAM이 매우 적습니다. 영상·3D 생성은 어려울 수 있으므로 "
            "먼저 가벼운 작업과 원본 모델 지원 여부를 확인하세요."
        )
    if vram_gib < 6:
        return (
            "약 4GB급 VRAM입니다. 원본은 일부 경량 모델의 실행 가능성을 안내하지만 "
            "일반 영상 생성이나 속도를 보장하지 않습니다. 짧은 작업부터 시험하세요."
        )
    if vram_gib < 10:
        return (
            "약 6~8GB급 VRAM입니다. 원본의 작은 영상 모델이나 "
            "짧은 저해상도 작업부터 시험하고 단계적으로 늘리세요."
        )
    return (
        "전용 VRAM 여유가 있어도 큰 영상·3D 모델이 모두 동작하는 것은 아닙니다. "
        "원본 모델별 메모리 요구와 시스템 RAM을 함께 확인하세요."
    )


def format_first_run_plan(info: dict[str, Any]) -> str:
    """지원 모델을 추측하거나 설정을 바꾸지 않는 저사양 첫 제작 순서."""
    vram = _observed_vram(info)
    ram = _safe_gib(info.get("ram_gib"), 4096)
    rows = ["첫 무료 제작 · 권장 확인 순서 (원본 설정을 자동 변경하지 않음)"]
    if vram is None:
        rows.append("① Windows 작업 관리자에서 전용 GPU 메모리를 확인하세요. GPU 지원 여부는 아직 미확인입니다.")
    elif vram < 4:
        rows.append("① 전용 VRAM이 적습니다. 무거운 영상·3D 모델 다운로드 전 공식 모델 요구 사양을 먼저 확인하세요.")
    else:
        rows.append("① 원본 모델 목록에서 이미지 모델의 GPU·VRAM 최소 요구 사항과 설치 용량을 확인하세요.")
    rows.append("② 요구 사양이 맞는 모델이 확인될 때만 원본 Media Generator에서 작은 이미지 1장을 생성해 보세요.")
    if vram is None or vram < 6:
        rows.append("③ 영상·3D는 바로 실행하지 말고, 원본 지원 정보 및 실제 여유 메모리를 확인한 후 선택하세요.")
    else:
        rows.append("③ 이미지가 정상 저장되면 원본의 지원 영상 모델에서 짧고 낮은 해상도 작업을 검토하세요.")
    rows.append("④ 결과 파일·작업 시간·GPU 메모리 사용량을 확인하고 다음 작업 크기를 결정하세요.")
    if ram is not None and ram <= 16.5:
        rows.append("RAM 16GB급: 영상 모델과 로컬 감독 LLM을 동시에 실행하는 것은 피하세요.")
    rows.append("메모리 부족 시 다른 GPU 사용 프로그램을 종료하고, 원본에서 공식 지원하는 더 작은 모델을 직접 골라 재시도하세요.")
    rows.append("GPT 로그인·유료 API 연결은 이 순서의 어느 단계에도 필요하지 않습니다.")
    rows.append("이것은 실행 성공 보증이나 자동 모델 선택이 아닌 안내입니다.")
    return "\n".join(rows)


def format_hardware_report(info: dict[str, Any]) -> str:
    """시스템 정보만으로 조심스러운 한국어 안내를 만든다. 원본 설정을 변경하지 않는다."""
    system = str(info.get("operating_system") or "확인 불가")
    ram = _safe_gib(info.get("ram_gib"), 4096)
    ram_text = f"{ram:g}GB" if ram is not None else "확인 불가"
    devices = info.get("gpu_devices") or []
    names = [str(d.get("name") or "알 수 없음") for d in devices if isinstance(d, dict)]
    if not names:
        names = [str(name) for name in (info.get("gpu_names") or []) if name]
    if not names:
        names = ["자동 확인 실패"]

    vram = _observed_vram(info)
    lines = [
        "현재 WanGP가 실행 중인 컴퓨터의 정보 (읽기 전용)",
        f"- 운영체제: {system}",
        f"- 시스템 RAM: {ram_text}",
        f"- 탐지한 GPU: {', '.join(names)}",
        f"- 전용 VRAM: {vram}GB" if vram is not None else "- 전용 VRAM: 자동 확인 실패",
    ]
    if devices:
        for index, device in enumerate(devices):
            if not isinstance(device, dict):
                continue
            detected = _safe_gib(device.get("vram_gib"), 1024)
            label = f"{detected:g}GB" if detected is not None else "용량 확인 불가"
            lines.append(f"- CUDA GPU {index}: {device.get('name') or '알 수 없음'} · {label}")
        if len(devices) > 1:
            lines.append("※ 표기된 최대 VRAM은 안내용이며, 원본 WanGP가 그 GPU를 사용한다는 의미는 아닙니다.")
    elif info.get("gpu_names"):
        lines.append("※ Windows에서 GPU 이름만 확인했으며, 전용 VRAM과 실제 생성 지원은 확인되지 않았습니다.")
    lines.extend(["", "저사양 시작 안내:", _recommend_vram(vram)])
    if ram is not None and ram <= 16.5:
        lines.append("RAM 16GB급 환경에서는 대형 영상 모델과 로컬 감독 LLM의 동시 실행을 피하는 편이 좋습니다.")
    lines.extend(["", format_first_run_plan(info)])
    lines.extend(
        [
            "",
            "이 진단은 사양을 읽어 안내할 뿐 모델 설치·GPU 설정·유료 연결을 실행하지 않습니다.",
            "실제 지원 모델과 처리 속도는 원본 WanGP에서 짧은 샘플로 확인해야 합니다.",
        ]
    )
    return "\n".join(lines)


def read_hardware_report() -> str:
    return format_hardware_report(detect_hardware())
