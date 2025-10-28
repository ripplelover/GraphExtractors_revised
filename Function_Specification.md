# 기능 명세 (Image2Graph)

이 문서는 Image2Graph 애플리케이션의 최신 기능을 정리합니다.

## 1. 핵심 기능

### 1.1. 차트 생성
- 이미지 → 차트 생성
  - 로컬 이미지 업로드(드래그앤드롭/파일 선택) 후 백엔드 `POST /api/convert`로 변환합니다.
  - 필요 시 지시문(예: "막대를 초록색으로")을 함께 전송해 결과를 보정합니다.
  - 서버에 `GOOGLE_API_KEY`가 없으면 오프라인 폴백 명세를 반환하며 UI에서 그대로 렌더링됩니다.

- 지시문 → 차트 생성
  - 자연어 지시문만으로 차트를 생성합니다(`POST /api/generate`).
  - 홈/생성 화면에서 “랜덤/샘플” 차트 생성도 지원합니다.

- 템플릿 시작
  - 기본 제공 템플릿(막대, 라인, 파이/도넛, 산점도, 면적, 히트맵 등)로 즉시 프로젝트를 시작합니다.

### 1.2. 차트 편집
- AI 편집(자연어)
  - 현재 명세와 함께 지시문을 `POST /api/edit`로 보내 자동 수정합니다.
  - 모델 응답이 JSON이 아닐 경우 자동 정정/파싱 로직으로 최대한 복구합니다.

- 수동 편집(Inspector)
  - 조정 항목: 제목, X/Y 필드, 색상 필드, 배경색.
  - 전체 JSON 편집 토글, JSON 파일 열기/저장, 차트 PNG 내보내기, 원본 명세로 초기화 지원.

- 데이터 편집기(Data Editor)
  - 표 형태로 `spec.data.values`를 편집하고 행 드래그 정렬/열 추가·삭제를 지원합니다.
  - 팔레트 편집으로 `encoding.color.scale.range`에 즉시 반영됩니다.

### 1.3. 차트 질의/응답(QA)
- 현재 Vega-Lite 명세와 데이터에 관한 질문을 보내 답변을 받습니다(`POST /api/ask`).
- 앱 내 모드 전환(편집/질의)로 간단히 사용합니다.

### 1.4. 오버레이/주석·화이트보드
- 차트 오버레이(ChartOverlay)
  - 차트 위에 텍스트/사각형 주석을 배치·이동·크기조절.
  - 멀티 선택, 스냅(Grid) 정렬, 정렬/정렬축, 순서(앞/뒤로) 제어, 되돌리기/다시하기.
  - 오버레이는 프로젝트별로 자동 저장됩니다.

- 화이트보드(Excalidraw)
  - 독립적인 화이트보드에서 아이디어 스케치/주석 작성.
  - 배경: 없음/원본 이미지/현재 차트 썸네일 중 선택, 보이기/숨기기 유지.
  - 장면(씬)과 배경 선호도는 프로젝트별로 자동 저장되며 PNG 내보내기 지원.

### 1.5. 내보내기/가져오기
- JSON 내보내기/가져오기: Vega-Lite 명세 파일을 저장/열기.
- CSV 내보내기: `spec.data.values`를 CSV로 저장.
- 이미지 내보내기: 차트 PNG 저장, 캔버스/화이트보드 PNG 저장.

## 2. 화면 구성과 주요 컴포넌트
- 홈 대시보드(`web/src/components/HomeDashboard.tsx`)
  - 프로젝트 카드 목록(검색/정렬), 템플릿 갤러리, 소개/빠른 시작.

- 생성 페이지(`web/src/components/CreatePage.tsx`)
  - 이미지 업로드 미리보기, 지시문 입력, 변환/생성 버튼, 추천 프롬프트 칩.

- 사이드바(`web/src/components/Sidebar.tsx`)
  - 홈/만들기/프로젝트/템플릿 이동, 화이트보드 열기.

- 차트 뷰(`web/src/components/ChartView.tsx`)
  - Vega-Embed 기반 렌더링, 확대/축소/이동, 반응형 크기 보정, 축 레이블 가독성 개선, 팔레트 적용.
  - 렌더 완료 후 `chartRendered` 이벤트로 프로젝트 썸네일 갱신 트리거.

- 인스펙터(`web/src/components/Inspector.tsx`)
  - 핵심 속성 편집, 전체 JSON 편집, 파일 열기/저장, 차트 이미지 내보내기, 원본 복원.

- 데이터 편집기(`web/src/components/DataEditorDrawer.tsx`)
  - 표 기반 데이터/팔레트 편집과 즉시 적용.

- JSON 편집 드로어(`web/src/components/JsonEditorDrawer.tsx`)
  - 명세 텍스트 편집/적용.

- 캔버스 오버레이 편집기(`web/src/components/CanvasEditorDrawer.tsx`)
  - 오버레이 요소 추가/편집, 스냅 격자, 속성 패널, PNG 내보내기 연계.

- 화이트보드(`web/src/components/ExcalidrawEditor.tsx`)
  - 배경 모드 관리, 장면 자동 저장, 썸네일과 연동된 배경 사용.

## 3. 동작 상세(하이라이트)
- API 베이스 자동 탐지(`web/src/hooks/useApiBase.ts`)
  - `VITE_API_BASE` > 4000 헬스 체크 > 4001 헬스 체크 순으로 결정.

- 차트 렌더링 품질 개선
  - 컨테이너 기반 목표 크기 설정, 축 레이블 겹침 최소화, 카테고리 수에 따른 각도 조정.
  - 줌/팬 인터랙션(CTRL 제외 휠/드래그) 강화.

- 오프라인 폴백
  - `GOOGLE_API_KEY` 부재 시 `convert/edit/generate`는 샘플 명세로 동작(`offline: true`).

## 4. 프로젝트/저장소 구조와 저장
- 프로젝트 단위 저장 항목
  - 명세, 원본 이미지/크기, 썸네일, 오버레이, 화이트보드 장면/배경 선호도, 메시지 기록.

- 브라우저 저장 키(로컬 저장소)
  - `image2graph:projects`, `image2graph:messagesByProject`, `image2graph:overlaysByProject`,
    `image2graph:excalidrawByProject`, `image2graph:whiteboardBgByProject`,
    `image2graph:palette`, `image2graph:theme`, `image2graph:homeTab`.
  - 자동 저장/디바운스 적용(일부 항목 300ms).

## 5. 제한 사항 및 참고
- 대용량 이미지 업로드 시 브라우저 메모리에 의존하므로 성능 저하가 발생할 수 있습니다(이미지 15MB 제한).
- 차트 PNG/CSV/JSON 내보내기는 클라이언트에서 생성되며, 브라우저 다운로드 보안 정책의 영향을 받을 수 있습니다.
- 화이트보드/오버레이는 프로젝트별로만 저장되며, 협업/동기화 기능은 포함하지 않습니다.

