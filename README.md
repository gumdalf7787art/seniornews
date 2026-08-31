# 시니어 뉴스

50~70대 독자를 위한 편집형 온라인 뉴스 MVP입니다. React/Vite 프런트엔드와 Cloudflare Pages Functions, D1, R2를 사용합니다.

## 주요 기능

- 주요·최신·카테고리·인기 뉴스, 검색, 기사 상세
- 글자 확대, 고대비, 키보드 탐색, 기사 읽어주기
- 이메일 및 카카오·네이버·구글 로그인
- 서버 저장 북마크와 마이페이지
- editor/admin 역할 기반 기사 작성·발행 CMS
- 기사별 서버 HTML 메타데이터, JSON-LD, sitemap, RSS
- PBKDF2 비밀번호, HttpOnly JWT, OAuth state, 로그인 제한, 본인 확인 탈퇴

## 로컬 실행

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

Vite 개발 서버에서는 샘플 기사로 공개 화면을 확인할 수 있습니다. D1/R2/API까지 포함한 검증은 Cloudflare 로컬 또는 미리보기 환경에서 진행합니다.

## 새 Cloudflare 프로젝트 연결

1. `wrangler.toml`의 `database_id`를 새 D1 ID로 교체합니다.
2. 새 R2 버킷 이름과 공개 미디어 도메인을 설정합니다.
3. D1에 `schema.sql`을 적용합니다.
4. 다음 Secret/환경변수를 Cloudflare에 설정합니다.

```text
JWT_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
PUBLIC_MEDIA_URL
KAKAO_CLIENT_ID
KAKAO_CLIENT_SECRET
NAVER_CLIENT_ID
NAVER_CLIENT_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

5. 최초 관리자는 D1의 `users.role`을 `admin`으로 변경합니다. 이후 권한 관리는 관리자 기능으로 확장할 수 있습니다.

## 배포 전 교체 항목

- 서비스명, 로고, favicon, OG 이미지
- 실제 발행인·등록번호·주소·연락처
- 개인정보 보호책임자와 약관 전문
- 새 GitHub 원격 주소와 Cloudflare 프로젝트 식별자
- 샘플 기사 및 외부 이미지 URL
