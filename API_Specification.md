# API 명세서

이 문서는 Image2Graph 애플리케이션의 백엔드 API를 설명합니다.

## 1. 기본 정보

- **엔드포인트 기본 URL**: `http://localhost:4000`
- **응답 형식**: JSON (UTF-8 인코딩)

## 2. API 엔드포인트

### 2.1. 헬스 체크

- **엔드포인트**: `GET /api/health`
- **설명**: 서버의 상태를 확인합니다.
- **요청**: 없음
- **성공 응답 (200 OK)**:
  ```json
  {
    "ok": true
  }
  ```

### 2.2. 이미지 → Vega-Lite 변환

- **엔드포인트**: `POST /api/convert`
- **설명**: 업로드된 차트 이미지를 분석하여 Vega-Lite JSON 명세로 변환합니다.
- **요청 형식**: `multipart/form-data`
- **요청 파라미터**:
  - `image`: (필수) 차트 이미지 파일 (PNG, JPG 등)
  - `instruction`: (선택) 변환 시 참고할 추가 지시사항 (예: "파이 차트로 만들어줘")
- **성공 응답 (200 OK)**:
  ```json
  {
    "spec": {
      "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
      "description": "...",
      "data": { "values": [...] },
      "mark": "...",
      "encoding": { ... }
    }
  }
  ```
- **오류 응답**:
  - `400 Bad Request`: `image` 파일이 누락된 경우
  - `500 Internal Server Error`: 서버 내부 오류 또는 Gemini API 키가 설정되지 않은 경우

### 2.3. Vega-Lite 명세 편집

- **엔드포인트**: `POST /api/edit`
- **설명**: 주어진 Vega-Lite 명세에 자연어 지시사항을 적용하여 수정합니다.
- **요청 형식**: `application/json`
- **요청 본문**:
  ```json
  {
    "spec": { "...기존 Vega-Lite 명세..." },
    "instruction": "색상을 파란색으로 변경해줘"
  }
  ```
- **성공 응답 (200 OK)**:
  ```json
  {
    "spec": { "...수정된 Vega-Lite 명세..." }
  }
  ```
- **오류 응답**:
  - `400 Bad Request`: `spec` 또는 `instruction`이 누락된 경우
  - `500 Internal Server Error`: 모델 응답이 유효한 JSON이 아니거나 서버 오류가 발생한 경우

### 2.4. 차트 데이터 질의응답

- **엔드포인트**: `POST /api/ask`
- **설명**: 주어진 Vega-Lite 명세에 대해 자연어 질문에 답변합니다.
- **요청 형식**: `application/json`
- **요청 본문**:
  ```json
  {
    "spec": { "...Vega-Lite 명세..." },
    "question": "가장 높은 값은 무엇이야?"
  }
  ```
- **성공 응답 (200 OK)**:
  ```json
  {
    "answer": "가장 높은 값은 OOO입니다."
  }
  ```
- **오류 응답**:
  - `400 Bad Request`: `spec` 또는 `question`이 누락된 경우
  - `500 Internal Server Error`: 서버 오류가 발생한 경우

### 2.5. 사용 가능한 모델 목록 조회

- **엔드포인트**: `GET /api/models`
- **설명**: 사용 가능한 Google AI 모델 목록을 조회합니다.
- **요청**: 없음
- **성공 응답 (200 OK)**:
  ```json
  {
    "models": [
      {
        "name": "models/gemini-1.5-pro-latest",
        "displayName": "Gemini 1.5 Pro",
        "description": "...",
        "inputTokenLimit": 1048576,
        "outputTokenLimit": 8192,
        "supportedGenerationMethods": ["generateContent", "embedContent"]
      },
      ...
    ]
  }
  ```
- **오류 응답**:
  - `500 Internal Server Error`: Gemini API 키가 설정되지 않은 경우

### 2.6. 디버그 정보 조회

- **엔드포인트**: `GET /api/debug`
- **설명**: API 키 존재 여부 및 Gemini API와의 연결 상태 등 디버그 정보를 확인합니다.
- **요청**: 없음
- **성공 응답 (200 OK)**:
  ```json
  {
    "apiKeyPresent": true,
    "model": "gemini-1.5-pro",
    "ping": {
      "ok": true,
      "status": 200,
      "text": "..."
    }
  }
  ```
- **오류 응답**:
  - `500 Internal Server Error`: 서버 오류가 발생한 경우
