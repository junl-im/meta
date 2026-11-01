# 사용 환경 메모 — Windows / RAM 16GB / 저사양 GPU(모델 미확인)

2026-11-01 사용자가 확인한 사실: **Windows, 시스템 RAM 16GB, 그래픽 성능이 낮음**. GPU 제조사·모델·전용 VRAM 용량은 아직 미확인이다. 따라서 GPU 호환성, 실제 렌더 속도, 3D 지원 가능 범위는 확정하지 않는다.

## 실무 결정

1. **원본 엔진 유지:** 고속/저VRAM 최적화 코드를 변경하지 않는다. 첫날에는 고화질 장편 렌더를 목표로 삼지 않는다.
2. **GPT 감독자는 Codex CLI 우선:** 원격 엔진의 계산은 로컬 WanGP 미디어용 GPU VRAM을 점유하지 않는다는 공식 안내를 활용. 프롬프트/참조/프레임이 인터넷으로 전송될 수 있으므로 민감자료는 별도 확인.
3. **RAM 16GB 맞춤:** 동시에 여러 생성 모델과 로컬 LLM을 띄우지 않는다. 공식 Troubleshooting의 RAM 최소화 프로필(5)과 VRAM 절감 프로필(4), 적절한 페이지 파일을 **실측 기반 옵션**으로 검토한다. 먼저 관리자가 추천한 프로필을 따른다.
4. **초기 테스트:** 작은 이미지 1개 → 짧은 2초급 영상 1개(공식 시작 문서 기준 Wan 2.1 T2V 1.3B, 49프레임) → Showrunner 단일 샷 자동 지시 → 결과 저장/복구.
5. **고화질·장편·무거운 3D:** 먼저 호환성과 속도를 측정하고, 필요한 경우 로컬 장면 제작+외부 렌더 GPU를 **선택적 유료 옵션**으로 표시. 무조건 0원/무제한이라고 홍보하지 않는다.
6. **Windows 설치 후보:** WanGP 공식 실험적 Manager 설치 도우미가 GPU를 감지해 프로필 추천·업데이트·롤백을 지원. GPU 확인 후 공식 설치 절차로 진행.

## VRAM별 *가설* (GPU 제조사/아키텍처 지원도 확인해야 함)

| 전용 VRAM | 초기 판단 |
|---|---|
| 내장 GPU 또는 2GB 등 | WanGP 고성능 영상 생성의 실사용 가능성 낮음. CPU나 클라우드 대안 검토 필요 |
| 4GB | 공식 README는 일부 모델의 최소 4GB 가능성을 언급. 모든 모델 지원이나 실사용 속도는 미보장 |
| 6~8GB | 공식 Getting Started의 기본 모델 최소 VRAM 6GB 가이드를 참고해 소형 모델·짧은 영상부터 |
| 10~12GB | 중형/대형 선택지 확대 가능. 여전히 RAM 16GB 및 세부 설정에 제한 |
| 16GB 이상 | VRAM 여유가 커도 시스템 RAM 16GB와 모델별 필요 메모리를 따로 확인 |

**명확히 구분:** 4/6/8GB는 **그래픽카드 전용 VRAM**이며, 사용자 PC의 **시스템 RAM 16GB**와 다르다.

## 정확한 카드 확인 (Windows)

1. `Ctrl + Shift + Esc` → **작업 관리자**.
2. **성능** 탭 → 왼쪽의 **GPU 0** 또는 **GPU 1** 클릭.
3. 오른쪽 위 **GPU 모델명**과 아래의 **전용 GPU 메모리** 용량을 확인해 캡처하거나 알려주기.
4. 노트북에서 GPU 0이 내장 그래픽이고 GPU 1이 외장 그래픽일 수 있으므로 두 항목을 모두 확인.

확인 후 설치 방법·최적 프로필·최소 시범 모델과 대략적 예상 처리량을 다시 정한다.

## 공식 근거

- [WanGP Getting Started — 최소 VRAM, 모델별 시작 설정](https://github.com/deepbeepmeep/WanGP/blob/main/docs/GETTING_STARTED.md)
- [WanGP README — 일부 모델 4GB, 구형 NVIDIA/AMD 지원](https://github.com/deepbeepmeep/WanGP)
- [WanGP Troubleshooting — RAM/VRAM 프로필](https://github.com/deepbeepmeep/WanGP/blob/main/docs/TROUBLESHOOTING.md)
- [WanGP Manager 및 설치 설명](https://github.com/deepbeepmeep/WanGP/blob/main/docs/INSTALLATION.md)
