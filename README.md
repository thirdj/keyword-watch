# 키워드 감시 알림 서비스

관심 키워드를 등록하면 주기적으로 검색해서, 새 결과가 있을 때만 텔레그램/이메일로 알려주는 개인용 도구.

## 시작하기

1. 이 폴더를 `create-next-app`으로 만든 프로젝트 루트에 병합 (또는 이 구조 그대로 새 프로젝트 시작)
2. 의존성 설치
   ```bash
   npm install @neondatabase/serverless fast-xml-parser
   ```
3. `.env.example`을 `.env.local`로 복사하고 값 채우기
4. Neon 콘솔에서 `schema.sql` 실행해서 테이블 생성
5. `notification_channels` 테이블에 본인 텔레그램 chat_id / 이메일 수동 등록
   ```sql
   INSERT INTO notification_channels (user_id, channel, target) VALUES
     ('me', 'telegram', '본인_chat_id'),
     ('me', 'email', '본인_이메일');
   ```
6. 로컬 실행: `npm run dev`

## 배포

1. GitHub 리포지토리 생성 후 푸시
2. Vercel에서 "Import Git Repository"로 연결 → 환경변수 등록 (`.env.example` 참고)
3. `.github/workflows/check-keywords.yml`이 인식되도록 GitHub 리포지토리 Settings → Secrets에 `APP_URL`, `CRON_SECRET` 등록
   - Vercel Hobby 플랜은 Cron을 하루 1회만 허용하기 때문에, 자체 `vercel.json` cron 대신 GitHub Actions로 30분마다 호출하는 구조입니다.

## 프로젝트 구조

```
app/
├── page.tsx                          대시보드 (키워드 목록)
└── api/
    ├── keywords/route.ts             키워드 등록/조회
    ├── keywords/[id]/route.ts        키워드 수정/삭제
    └── cron/check-keywords/route.ts  스케줄러가 호출하는 체크 실행 엔드포인트
components/
└── AddKeywordModal.tsx               키워드 추가 폼 (예상 사용량 실시간 표시)
lib/
├── db.ts                             Neon 커넥션
├── search/                           검색 어댑터 (Tavily, Naver)
├── detection/detectNewResults.ts     신규 결과 판별 로직
├── checkKeyword.ts                   검색+판별+로그 저장 흐름
├── getDueKeywords.ts                 확인할 때 된 키워드 조회
├── notify/                           텔레그램/이메일 발송
└── estimateUsage.ts                  검색 API 크레딧 사용량 예측
.github/workflows/check-keywords.yml  30분마다 체크 엔드포인트 호출
schema.sql                            DB 스키마
keyword-watch-project-summary.md      전체 설계 결정 및 진행 상황 정리
```

## 남은 작업

- Tavily 크레딧 소진 시(429) 대응 로직
- `volatile_domains` 목록 실사용하며 보강
- 이메일 발신 도메인 인증 (현재는 Resend 테스트 주소 사용)

자세한 설계 배경은 `keyword-watch-project-summary.md` 참고.
