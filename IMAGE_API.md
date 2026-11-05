# 기사 사진 수정 API

기존 무기한 Bearer 연결을 사용한다. 본인 소유 `newsroom-` 기사에만 적용하며 공개·예약·초안 상태를 그대로 유지한다.

1. `POST /api/automation/media`: multipart `file`, `alt`. PNG/JPG/WEBP, 10MB 이하. 동일 파일은 기존 URL을 재사용한다.
2. `GET /api/automation/articles/{id}`: 현재 기사와 `content_hash`를 읽는다.
3. `PATCH /api/automation/articles/{id}/images`: `expected_hash`와 아래 사진 변경을 전송한다.

```json
{
  "expected_hash": "GET으로 받은 현재 해시",
  "hero": {
    "url": "이 연결 계정이 업로드한 HTTPS 이미지 URL",
    "alt": "장면을 설명하는 AI 생성 이미지",
    "caption": "가상 장면을 표현한 AI 생성 이미지. 실제 사건 현장 사진이 아닙니다.",
    "kind": "ai"
  },
  "operations": []
}
```

`hero` 생략은 대표사진 유지, `null`은 대표사진과 캡션 제거, 객체는 추가·교체·설명 수정이다. 실제 사진은 `kind: photo`, `license`, `license_evidence_url`, `attribution`, `commercial_use_confirmed: true`를 추가하고 표시 의무를 캡션에 반영한다. 이는 제공한 사용권 근거의 형식 검증이며 실제 이용권 검토를 대신하지 않는다.

본문 사진은 `operations`로 조작한다. `index`는 GET 결과의 `body_json.content` 전체 배열에서의 0부터 시작하는 위치이며 작업을 앞에서부터 적용한 **현재 배열** 기준이다.

- 추가: `{"action":"insert","index":2,"image":{...}}` (배열 길이와 같은 위치는 맨 뒤)
- 교체·설명 수정: `{"action":"replace","index":2,"image":{...}}`
- 제거: `{"action":"remove","index":2}`

교체·제거는 사진 블록에만 가능하다. 원고 텍스트·제목·출처·공개 상태·URL·최초 발행일은 변경하지 않는다. 최대20장, 요청당 최대20작업. 작업 전체가 검증된 뒤 한 번에 반영된다. 이미지 파일/R2 및 미디어 기록은 영구 삭제하지 않으므로 다른 기사 참조와 복구에 사용할 수 있다.

409는 동시 변경 또는 오래된 해시다. 다시 조회해 변경 내용을 비교한 뒤 새 요청을 작성한다. 응답이 유실됐으면 먼저 조회해 실제 적용 여부를 확인한다. 다른 ID로 생성하거나 자동 반복하지 않는다. 403은 이미지 소유권·연결 권한, 400은 입력 형식·이용권 필드·AI 표시 오류를 확인한다.

로컬 클라이언트:

```powershell
python publishing/direct_api.py get 37
python publishing/direct_api.py edit-images 37 changes.json --expected-hash <현재해시>
```

`changes.json`은 `hero`, `operations`만 포함한다. 이미지 객체에 `url` 대신 `path`, `sha256`을 넣으면 파일 무결성 확인 후 업로드한다. 변경 전 기사·요청·업로드 결과를 `publishing/logs/before_edit-images_*/`에 보존한다. 기존 `edit-body`는 사진 변경용 명령이 아니다.
