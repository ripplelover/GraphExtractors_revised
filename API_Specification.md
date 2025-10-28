# API 명세 (Image2Graph)

이 문서는 Image2Graph 백엔드 API의 최신 명세입니다.

## 1. 기본 정보

- 기본 URL: `http://localhost:4000` (미러: `http://localhost:4001`)
- 응답 형식: JSON, UTF-8 인코딩(서버가 `Content-Type: application/json; charset=utf-8` 설정)
- 인증: 없음. 단, 서버 환경에 `GOOGLE_API_KEY`가 없으면 일부 엔드포인트는 오프라인 폴백으로 동작하며 응답에 `offline: true`가 포함될 수 있음
- 요청 크기 제한: JSON 본문 최대 10MB, 이미지 업로드 최대 15MB
- 프론트엔드 오버라이드: 프론트는 `VITE_API_BASE`를 설정해 API 베이스를 지정할 수 있음

참고: 루트 경로 `GET /`는 텍스트로 서비스 상태 안내를 반환합니다.

## 2. 엔드포인트

### 2.1. 헬스 체크
- 메서드/경로: `GET /api/health`
- 설명: 서버 상태 확인
- 요청 본문: 없음
- 성공 응답 200:
  ```json
  { "ok": true }
  ```

### 2.2. 이미지 → Vega-Lite 변환
- 메서드/경로: `POST /api/convert`
- 설명: 업로드된 차트 이미지를 분석해 Vega-Lite v5 JSON 명세로 변환
- 요청 형식: `multipart/form-data`
- 폼 필드:
  - `image` (필수): 차트 이미지 파일(권장: PNG/JPEG, 최대 15MB)
  - `instruction` (선택): 변환 시 참고할 추가 지시사항(예: "막대 색상을 녹색으로")
- 성공 응답 200:
  ```json
  {
    "spec": { "$schema": "https://vega.github.io/schema/vega-lite/v5.json", "description": "...", "data": { "values": [] }, "mark": "...", "encoding": { } },
    "offline": true
  }
  ```
  - `offline` 키는 서버에 `GOOGLE_API_KEY`가 없을 때만 포함됩니다.
- 오류 응답:
  - 400: `image` 누락 시 `{ "error": "image required" }`
  - 500: 변환 실패 시 `{ "error": "convert failed", "stack": "..." }`

### 2.3. Vega-Lite 명세 편집
- 메서드/경로: `POST /api/edit`
- 설명: 주어진 Vega-Lite 명세에 자연어 지시사항을 적용하여 수정
- 요청 형식: `application/json`
- 요청 본문:
  ```json
  { "spec": { /* 기존 명세 */ }, "instruction": "배경을 초록색으로" }
  ```
- 성공 응답 200:
  ```json
  { "spec": { /* 수정된 명세 */ }, "offline": true }
  ```
  - `offline` 키는 서버에 `GOOGLE_API_KEY`가 없을 때만 포함됩니다.
- 오류 응답:
  - 400: `spec` 또는 `instruction` 누락
  - 500: 편집 실패(모델 응답 JSON 파싱 실패 등) — `{ "error": "edit failed", "hint": "모델 응답이 JSON이 아닙니다..." }`

### 2.4. 텍스트 → Vega-Lite 생성
- 메서드/경로: `POST /api/generate`
- 설명: 자연어 지시사항을 바탕으로 Vega-Lite v5 JSON 명세 생성
- 요청 형식: `application/json`
- 요청 본문:
  ```json
  { "instruction": "분기 매출 막대 차트" }
  ```
- 성공 응답 200:
  ```json
  { "spec": { /* 생성된 명세 */ }, "offline": true }
  ```
  - `offline` 키는 서버에 `GOOGLE_API_KEY`가 없을 때만 포함됩니다.
- 오류 응답:
  - 400: `instruction` 누락
  - 500: 생성 실패 — `{ "error": "generate failed" }`

### 2.5. 차트 질의/응답(QA)
- 메서드/경로: `POST /api/ask`
- 설명: 주어진 Vega-Lite 명세에 대해 질문에 답변
- 요청 형식: `application/json`
- 요청 본문:
  ```json
  { "spec": { /* 명세 */ }, "question": "가장 큰 값은?" }
  ```
- 성공 응답 200:
  ```json
  { "answer": "..." }
  ```
- 오류 응답:
  - 400: `spec` 또는 `question` 누락
  - 500: `{ "error": "ask failed" }`

### 2.6. 사용 가능한 모델 목록
- 메서드/경로: `GET /api/models`
- 설명: Google AI Studio 모델 목록 조회
- 성공 응답 200:
  ```json
  { "models": [ { "name": "models/gemini-1.5-pro-latest", "displayName": "Gemini 1.5 Pro", "description": "...", "inputTokenLimit": 1048576, "outputTokenLimit": 8192, "supportedGenerationMethods": ["generateContent"] } ] }
  ```
- 오류 응답:
  - 500: `GOOGLE_API_KEY` 누락 또는 상위 API 오류(상태/본문 패스스루 가능)

### 2.7. 디버그 정보
- 메서드/경로: `GET /api/debug`
- 설명: API 키 존재, 사용 중인 모델, 간단한 핑 결과 확인
- 성공 응답 200:
  ```json
  { "apiKeyPresent": true, "model": "gemini-1.5-pro", "ping": { "ok": true, "status": 200, "text": "..." } }
  ```
  - `apiKeyPresent`가 false이면 `ping`은 `null`일 수 있음
- 오류 응답:
  - 500: `{ "error": "debug failed" }`

## 3. 요청/응답 예시

- Convert(이미지 업로드):
  - curl
    ```bash
    curl -X POST "http://localhost:4000/api/convert" \
      -F "image=@chart.png" \
      -F "instruction=막대를 파란색으로"
    ```
- Edit(명세 편집):
  ```bash
  curl -X POST "http://localhost:4000/api/edit" \
    -H "Content-Type: application/json" \
    -d '{"spec": {"$schema":"https://vega.github.io/schema/vega-lite/v5.json","data":{"values":[{"x":"A","y":1}]},"mark":"bar","encoding":{"x":{"field":"x","type":"nominal"},"y":{"field":"y","type":"quantitative"}}}, "instruction": "제목을 Sales로"}'
  ```

## 4. 환경 변수

- `PORT`: 서버 포트(기본 4000). 서버는 포트 충돌 방지를 위해 4001에서도 미러 시도
- `GOOGLE_API_KEY`: Google AI Studio API 키(없으면 오프라인 폴백 동작)
- `MODEL_ID`: 사용할 모델 ID(예: `gemini-1.5-pro`, 일부 경우 정규화되어 사용됨)

## 5. 주의 사항

- JSON 본문은 최대 10MB, 업로드 이미지는 최대 15MB를 초과하면 거절될 수 있습니다.
- 오프라인 폴백 응답에는 `offline: true`가 포함되며, 샘플 데이터/스타일이 적용될 수 있습니다.
- 루트 경로 `GET /`는 간단한 텍스트를 반환하며 API 헬스 체크는 `GET /api/health`를 사용하세요.

