# 1.12.0 — AI 놀이터 브랜드 / 플랫폼 기반

## 브랜드 전환
- 전체 서비스명을 `곰같은여우의 AI 놀이터`로 변경했다.
- `AI 글 다듬기`, `AI 이미지 검사`, `블로그 팩토리`는 개별 도구명으로 유지한다.
- 기존 `/ai-cleaner/` URL, PWA `id`/`scope`, 저장소 구조는 유지해 링크/설치 호환성을 지킨다.

## 플랫폼 메타데이터
- HTML title/description, application name, Apple web-app title, Open Graph title/description을 새 플랫폼 브랜드에 맞췄다.
- PWA `name`을 `곰같은여우의 AI 놀이터`, `short_name`을 `AI 놀이터`로 변경했다.
- 루트 redirect 화면과 footer/header도 동일한 브랜드를 사용한다.

## 현재 도구 문서 제목
- 활성 도구에 따라 브라우저 title이 `도구명 | 곰같은여우의 AI 놀이터 v버전` 형식으로 바뀐다.
- 키보드/클릭 도구 전환 E2E에 title 동기화 검증을 추가했다.

## CSS 정리
- 420px/340px toolnav 규칙에서 역사적으로 중복된 grid/font 선언을 제거했다.
- 최종 1.11 responsive contract가 실제 렌더 값을 명시하도록 정리해 cascade 의존성을 낮췄다.

## 보호 경로
- `OPTION/**`은 읽기/수정/이동/삭제/rename/패키징하지 않는다.
- 기존 `OPTION/SS_OPTION.txt` Pages public bridge 정책은 변경하지 않는다.
