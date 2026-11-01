# WanGP 원본 기능 보존 매트릭스

조사 기준 `deepbeepmeep/WanGP@e9d8dd7dfb6ff5675697158b13c40a25f06fa638`. **지원 확인**은 공식 문서에서 기술된 기능이라는 뜻이지, 이 사용자의 PC에서 구동을 검증했다는 뜻은 아닙니다.

| 영역 | 원본에서 확인한 기능 | 한국어 개인판 구현 원칙 | 1차 보존 테스트 |
|---|---|---|---|
| 영상 | T2V/I2V, 참조/제어 영상, 인페인팅·아웃페인팅, 캐릭터·동작·립싱크, 샷 연결 | 모든 원본 모델/세부 옵션 선택 가능 | 원본 설정 파일로 같은 샷 재실행 |
| 이미지 | 생성·편집·참조·마스크·텍스트 중심 이미지 | 레퍼런스·해상도·시드·모델 설정 통과 | 샘플 이미지 및 편집 |
| 음성·음악 | 음성/음악 생성 지원 모델, 배경음·목소리 교체·독립 음성 후처리 | 음성 프로세서 선택과 파일 입출력 보존 | 음성 작업 및 영상 리믹스 |
| 3D | 이미지→메시, 텍스처·리파인·분할·애니메이트, 사진/영상→장면, 스플랫/포인트클라우드 | 3D 모델·원본 출력 형식·후처리 전체 보존 | 메시 출력 및 재열기 |
| 감독 자동화 | Showrunner의 브리프·캐스팅·스토리보드·샷 재생성·검수·조립 | 원본 기능 보존. 감독에는 Deepy Prime(로컬 또는 선택한 원격 LLM)이 필요 | 브리프→보드→샷→조립(감독 연결 시) |
| GPT/다중 LLM | Codex CLI, Claude Code, OpenCode를 Deepy Prime의 원격 감독자로 사용 | **기본 꺼짐**. GPT/Codex는 사용자가 켜는 옵션. 원본의 다른 엔진 호환성은 삭제하지 않음 | GPT OFF에서 로컬 생성, GPT ON에서 감독 지시 |
| 화질·보정 | Media Flow: 복원·아웃페인트·업스케일·프레임 보간·SDR→HDR·폴더 배치 | 한글 메뉴 + 원본 작업 재사용 | 영상 1개·배치 1개 |
| VRAM·속도 | WanGP 원본의 오프로딩, 메모리 프로필, 양자화/가속 모델, 타일링 등 | 모델 실행 코드 무변경; 원본 설정 모두 노출 | 같은 GPU, 같은 설정의 VRAM/시간 비교 |
| 확장 | 앱·플러그인, 모델·처리기, Apps 갤러리 | 개인 한글 플러그인을 외부 계층으로 유지 | 원본 플러그인과 동시 활성화 |
| 큐/API | 웹 큐, 설정/ZIP 입력, Python API, MCP v2.1, `--mcp-webui` | 공용 큐 재사용, 중복 모델 프로세스 방지 | 추가 작업·중단·결과 조회 |
| 자료 관리 | 이미지·영상·음성·3D 파일, 갤러리, Workspace, 독립 폴더 | 원본 폴더 구조 및 내보내기 유지 | 파일 저장/복구/재시작 |

## 절대 삭제하지 않을 고급 설정

- 모델, 체크포인트, 스케줄러, 스텝, 시드, FPS, 해상도, 길이, 영상 프레임, 배치
- 이미지/오디오/영상/3D 참조 입력, 컨트롤 비디오, 마스크, 포즈/깊이, LoRA 및 프리셋
- VRAM/성능/양자화 관련 옵션, 메모리 해제·오프로딩
- 업스케일/보간/오디오 리믹스/복원/후처리
- 작업 취소·재시도·저장·내보내기 및 원본 UI로 돌아가는 경로

## 번역·확장 시 주의

1. 번역된 명칭은 UX 계층에서만 바꾼다. `model_type`, 파라미터 키, 파일 형식, API 요청 본문을 번역하지 않는다.
2. 새 원본 모델이 등장하면 원본 메타데이터에서 자동 노출한다. 목록에 없는 모델을 숨기는 정적 화이트리스트를 사용하지 않는다.
3. 모든 원본 기능이 별도 한글 화면에 즉시 표시되지 않을 때도 **원본의 고급 화면 접근 경로를 항상 제공**한다.
4. 모델별 가중치·다운로드·상용 이용 조건은 각각 다르다. 특히 3D 텍스처링 등 일부 구성요소에 비상업 조건이 있을 수 있어 기능 제공과 상업 사용 권리는 별도로 관리한다.
5. “원본보다 더 좋음”은 새 자동화·편의성과 실제 측정으로 입증할 수 있고, 렌더 품질 향상은 별도 모델·프롬프트·설정의 A/B 결과가 있을 때만 주장한다.

## 공식 근거

- [모델: 영상·이미지·음성·3D](https://github.com/deepbeepmeep/WanGP/blob/main/docs/MODELS.md)
- [Showrunner](https://github.com/deepbeepmeep/WanGP/blob/main/docs/SHOWRUNNER.md)
- [Media Flow](https://github.com/deepbeepmeep/WanGP/blob/main/docs/MEDIA_FLOW.md)
- [Remote LLMs](https://github.com/deepbeepmeep/WanGP/blob/main/docs/REMOTE_LLMS.md)
- [Plugin System](https://github.com/deepbeepmeep/WanGP/blob/main/docs/PLUGINS.md)
- [Python API](https://github.com/deepbeepmeep/WanGP/blob/main/docs/API.md)
- [CLI + MCP](https://github.com/deepbeepmeep/WanGP/blob/main/docs/CLI.md)
- [Audio Processors](https://github.com/deepbeepmeep/WanGP/blob/main/docs/AUDIO_PROCESSORS.md)
- [Workspaces](https://github.com/deepbeepmeep/WanGP/blob/main/docs/WORKSPACES.md)
