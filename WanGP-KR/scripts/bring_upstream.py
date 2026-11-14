#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""공식 WanGP 소스를 지정된 검증 기준 커밋으로 가져오는 비파괴 실행 도구.

Usage:
    python WanGP-KR/scripts/bring_upstream.py

기존 runtime/WanGP 폴더는 덮어쓰거나 삭제하지 않습니다.
이 스크립트는 소스를 가져오기만 하며, 의존성 설치/모델 다운로드/GPU 실행을 하지 않습니다.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path


UPSTREAM_URL = "https://github.com/deepbeepmeep/WanGP.git"
UPSTREAM_SHA = "e9d8dd7dfb6ff5675697158b13c40a25f06fa638"


def main() -> int:
    studio_root = Path(__file__).resolve().parent.parent
    runtime_root = studio_root / "runtime"
    target = runtime_root / "WanGP"

    if shutil.which("git") is None:
        print("오류: Git이 설치되지 않았습니다. 먼저 Git을 설치해 주세요.", file=sys.stderr)
        return 2

    if target.exists():
        print(f"안전 중지: 대상 폴더가 이미 있습니다: {target}", file=sys.stderr)
        print("기존 파일을 덮어쓰거나 삭제하지 않았습니다.", file=sys.stderr)
        return 3

    runtime_root.mkdir(parents=True, exist_ok=True)
    print(f"공식 원본에서 가져옵니다: {UPSTREAM_URL}")
    print(f"기준 버전: {UPSTREAM_SHA}")
    print("원본을 설치하지 않고 소스만 가져옵니다. 다운로드 시간이 걸릴 수 있습니다.")

    try:
        subprocess.run(
            ["git", "clone", "--filter=blob:none", "--no-checkout", UPSTREAM_URL, str(target)],
            check=True,
        )
        subprocess.run(["git", "-C", str(target), "checkout", "--detach", UPSTREAM_SHA], check=True)
        subprocess.run(["git", "-C", str(target), "rev-parse", "HEAD"], check=True)
    except subprocess.CalledProcessError as exc:
        print(f"원본 다운로드/체크아웃 실패: {exc}", file=sys.stderr)
        print(f"대상 폴더가 남아 있다면 직접 상태를 확인하세요: {target}", file=sys.stderr)
        print("안전을 위해 폴더를 자동 삭제하지 않았습니다.", file=sys.stderr)
        return 1

    print(f"소스 가져오기 완료: {target}")
    print("다음 단계: PC 사양을 확인한 후 공식 설치 문서에 따라 실행·성능 테스트를 진행합니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
