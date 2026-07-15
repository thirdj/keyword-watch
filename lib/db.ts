import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
}

// sql`SELECT ...` 형태의 태그드 템플릿으로 쿼리 실행
export const sql = neon(process.env.DATABASE_URL);
