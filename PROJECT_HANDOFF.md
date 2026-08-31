# 시니어 라이프 뉴스 작업 인수인계

작성일: 2026-08-31

## 프로젝트 개요

- 프로젝트명: 시니어 라이프 뉴스
- 저장소: https://github.com/gumdalf7787art/seniornews.git
- 브랜치: main
- 기술 스택: React, Vite, React Router, Cloudflare Pages Functions, D1, R2
- 주요 대상: 50~70대 시니어 독자
- 서비스 방향: 기자·편집자가 직접 작성하는 편집형 온라인 뉴스 MVP

## 지금까지 완료한 작업

- 기존 홈페이지 뼈대에서 홍보/견적/프로젝트성 화면을 제거하고 뉴스 서비스 구조로 전환
- 공통 레이아웃 구성
  - 헤더, 카테고리 내비게이션, 검색, 로그인 진입
  - 글자 크기 확대, 고대비 모드
  - 푸터 법인/발행 정보 반영
- 메인 페이지 구성
  - 오늘의 주요 뉴스
  - 히어로 오른쪽 주요 뉴스 리스트
  - 카테고리별 뉴스 섹션
  - 각 카테고리별 대표 기사 1개와 하위 기사 4개
- 카테고리 페이지 구성
  - 건강, 복지·정책, 생활·금융, 일자리, 디지털, 문화·여가
  - 카테고리별 뉴스 리스트
  - 오른쪽 사이드바에 많이 본 뉴스 5개, 최신뉴스 5개 추가
- 검색 페이지 구성
  - 검색어 기반 뉴스 리스트 표시
- 기사 상세 페이지 구성
  - 본문 영역과 오른쪽 사이드바 분리
  - 오른쪽에 많이 본 뉴스 5개, 최신뉴스 5개 표시
  - 기사 저장, 공유, 브라우저 음성 읽기 지원
  - 기사 하단 기자명, 공용 이메일, 저작권 문구 공통 적용
- 마이페이지 구성
  - 회원정보, 저장한 기사, 글자 크기/고대비 설정, 로그아웃, 회원 탈퇴
- 관리자 CMS 기초 구성
  - 기사 목록
  - 기사 작성
  - 발행 처리
- 인증/보안 구조 보완
  - PBKDF2 비밀번호 해시
  - HttpOnly JWT 쿠키
  - OAuth state 검증 구조
  - 본인 기준 회원 탈퇴
  - 관리자 API 역할 검증
  - 이메일 인증, 비밀번호 재설정 기초 구조
- SEO/배포 보조 파일 추가
  - sitemap
  - RSS
  - robots.txt
  - 보안 헤더

## 주요 파일

- `src/components/NewsLayout.jsx`: 전체 레이아웃, 헤더, 푸터
- `src/components/NewsSidebar.jsx`: 많이 본 뉴스/최신뉴스 공통 사이드바
- `src/components/ArticleCard.jsx`: 뉴스 카드
- `src/components/CategoryNewsBlock.jsx`: 메인 카테고리별 뉴스 블록
- `src/pages/HomePage.jsx`: 메인 화면
- `src/pages/CategoryPage.jsx`: 카테고리 페이지
- `src/pages/SearchPage.jsx`: 검색 결과 페이지
- `src/pages/ArticlePage.jsx`: 기사 상세 페이지
- `src/pages/MyPage.jsx`: 마이페이지
- `src/pages/AdminPage.jsx`: 관리자 CMS 기초 화면
- `src/data/articles.js`: 현재 샘플 기사 데이터
- `functions/api/`: Cloudflare Pages Functions API
- `schema.sql`: D1 데이터베이스 스키마
- `wrangler.toml`: Cloudflare 바인딩 설정

## 현재 배포 상태와 Cloudflare 설정

Cloudflare Pages에서 `npm ci` 사용법 에러가 반복되어, 자동 의존성 설치를 우회하는 빌드 스크립트를 추가했다.

현재 Cloudflare Pages 설정 권장값:

```text
Framework preset: React (Vite)
Build command: npm run cf:build
Build output directory: dist
Root directory: 비워두기
```

환경변수:

```text
NODE_VERSION = 22.16.0
SKIP_DEPENDENCY_INSTALL = 1
```

`package.json`에는 아래 스크립트가 추가되어 있다.

```json
"cf:build": "npm install && vite build"
```

로컬에서 `npm run cf:build`, `npm run lint`, `npm run build`, `npm test`는 통과 확인했다.

## Git 커밋 기록

- `ee08a30 Build senior news MVP`
- `66e7331 Fix Cloudflare Pages build settings`
- `f439bd0 Add Cloudflare Pages build fallback`

## 아직 교체해야 할 값

- 실제 로고, favicon, OG 이미지
- 실제 Cloudflare D1 database_id
- 실제 R2 bucket 이름과 공개 미디어 도메인
- 실제 서비스 도메인
- OAuth 앱 키
  - Kakao
  - Naver
  - Google
- 메일 발신 정보
  - RESEND_API_KEY
  - RESEND_FROM_EMAIL
- 발행 등록번호와 등록일
- 샘플 기사 이미지와 본문을 실제 기사로 교체

## 다음 작업 후보

- Cloudflare Pages 배포 재시도 후 새 로그 확인
- D1 데이터베이스 생성 및 `wrangler.toml`의 `database_id` 교체
- R2 버킷 생성 및 미디어 업로드 API 실제 연결
- 관리자 CMS 기사 작성/수정/예약 발행 기능 강화
- 로고와 대표 이미지 교체
- 약관, 개인정보처리방침, 편집 원칙 전문 작성
- 모바일 화면 세부 QA
- 실제 기사 데이터 입력 방식 결정

## 작업 시 주의사항

- 내부 요청 헤더 `X-Requested-With: SeniorNews`는 기능 식별자이므로 서비스명 변경과 별개로 유지한다.
- `package.json`의 패키지명 `senior-news`와 Cloudflare 리소스명은 내부 식별자이므로 실제 필요가 생길 때만 변경한다.
- 현재 기사 데이터는 `src/data/articles.js`의 샘플 데이터다. 운영 데이터는 D1 CMS 구조로 이전해야 한다.
- 실제 D1·R2가 준비되기 전 배포가 실패하지 않도록 `wrangler.toml`의 바인딩은 주석 예시로 보관되어 있다.
