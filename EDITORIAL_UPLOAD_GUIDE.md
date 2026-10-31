# 기사 업로드 기능 — 2026-10-31

로컬 소스에 구현 완료. 운영 배포는 하지 않았습니다.

1. 관리자 로그인 후 /admin → 새 기사 작성.
2. 검수 완료 기사 JSON 불러오기 → article.json 선택.
3. 대표·본문 이미지를 선택하고 캡션·ALT·AI 표시·출처를 확인.
4. 임시 저장 또는 발행 요청.
5. admin 계정으로 원고 확인 후 관리자 승인 후 공개. 예약은 저장된 원고를 다시 열어 미래 시각을 선택하고 승인·예약.

불러온 기사의 작성자 표시는 시니어 라이프 뉴스입니다. 로그인 사용자의 소유권·감사 이력은 유지합니다.
JSON 불러오기 자체로 서버 저장이나 공개되지 않습니다. 같은 기사 ID는 같은 slug를 사용합니다. 409 응답은 목록에서 기존 기사를 열어 확인하세요.

API: /api/admin/articles, /api/admin/articles/{id}, /api/admin/articles/{id}/publish, /api/admin/media.
공개는 admin + editorial_approved:true. 별도 publish는 expected_updated_at 필수. 예약은 scheduled_at에 시간대 포함 ISO 8601.
예약은 기존 published_at 공개 조건을 사용하므로 DB 상태는 published이며 미래 시각 동안 관리 목록에서 예약으로 표시합니다. 예약 취소·변경은 임시 저장 후 재승인합니다. 공개 캐시 때문에 수분 지연될 수 있습니다.

DB 스키마·패키지 의존성·인증 키 변경 없음. body_json.editorial에 표시 작성자, 부제, SEO, 태그, 대표 이미지 캡션을 보존합니다. 태그 관계 테이블 자동 연결과 로컬 상태 동기화는 미구현입니다.

검증: npm test (20개), npm run build 통과. npm run lint는 기존 경고만 있습니다.
운영 로그인/D1/R2/예약 노출 실연결은 미확인입니다. Cloudflare 미리보기에서 비공개 테스트 후 운영 배포하세요. 이번 코드 작업은 운영 DB에 접근하지 않았습니다.

자료조사·작성 프로젝트의 PUBLISHING_WORKFLOW.md, API_INTEGRATION.md에 상세 절차가 있습니다. 해당 프로젝트 publishing/logs/site_backup_*에 변경 전 소스를 보관했습니다.
