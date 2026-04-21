# Admin Separation Plan

## 목표

- 운영 사이트와 관리자 사이트를 분리한다.
- 두 사이트는 독립적인 계정 시스템을 가진다.
- 콘텐츠는 관리자 사이트에서 발행하고, 운영 사이트는 공개 API만 읽는다.

## 권장 구조

### 1. 운영 사이트

- 사용자 로그인
- 사용자 프로필, 프로젝트 페이지, 뉴스 조회
- 관리자 기능 없음
- 읽는 대상:
  - `GET {ADMIN_SITE_URL}/api/public/news`
  - `GET {ADMIN_SITE_URL}/api/public/news/:id`

### 2. 관리자 사이트

- 관리자 전용 로그인
- 콘텐츠 발행
- 유저 관리
- 운영 메모
- 분석 대시보드

## 마이그레이션 순서

1. 새 관리자 프로젝트 `mir-partner-admin` 준비
2. 관리자 인증을 별도 Supabase 프로젝트 또는 별도 auth 정책으로 분리
3. 관리자 사이트에서 뉴스 CRUD 완성
4. 운영 사이트의 뉴스 API를 외부 공개 API 호출 방식으로 교체
5. 현재 사이트 내부 `/admin` 제거

## 운영 사이트 수정 포인트

### 기존

- `app/api/home/featured-news/route.ts`
- `app/api/notices/route.ts`
- `app/api/notices/[id]/route.ts`

### 목표

- 위 API들이 직접 DB를 읽지 않고 관리자 사이트 공개 API를 프록시하거나,
- 프론트에서 직접 관리자 사이트 공개 API를 읽도록 전환

## 환경변수 초안

운영 사이트:

- `ADMIN_PUBLIC_API_BASE_URL=https://admin.example.com`

관리자 사이트:

- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## 다음 구현 권장

1. 관리자 사이트에 뉴스 CRUD 화면 완성
2. 운영 사이트 뉴스 API를 `ADMIN_PUBLIC_API_BASE_URL` 기반으로 전환
3. 관리자 사이트에 배너 관리와 유저 메타데이터 관리 추가
