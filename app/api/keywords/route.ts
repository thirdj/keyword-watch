import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const MAX_KEYWORDS = 10;
const MIN_INTERVAL_MIN = 60; // 최소 1시간 — 크레딧 보호용 하한선

export async function POST(req: Request) {
  const body = await req.json();
  const { keyword, searchEngine, intervalMin } = body;

  if (!keyword?.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
  }
  if (intervalMin < MIN_INTERVAL_MIN) {
    return NextResponse.json(
      { error: `확인 주기는 최소 ${MIN_INTERVAL_MIN}분(1시간) 이상이어야 해요.` },
      { status: 400 }
    );
  }

  const [{ count }] = await sql`
    SELECT COUNT(*)::int as count FROM keywords WHERE is_active = true
  `;
  if (count >= MAX_KEYWORDS) {
    return NextResponse.json(
      { error: `키워드는 최대 ${MAX_KEYWORDS}개까지 등록 가능해요.` },
      { status: 400 }
    );
  }

  const [newKeyword] = await sql`
    INSERT INTO keywords (user_id, keyword, search_engine, interval_min, is_active)
    VALUES ('me', ${keyword.trim()}, ${searchEngine}, ${intervalMin}, true)
    RETURNING id, keyword, search_engine, interval_min
  `;

  return NextResponse.json(newKeyword, { status: 201 });
}

export async function GET() {
  try {
    const keywords = await sql`
      SELECT
        k.id, k.keyword, k.search_engine, k.interval_min, k.last_checked_at, k.is_active,
        latest.is_new AS last_check_is_new
      FROM keywords k
      LEFT JOIN LATERAL (
        SELECT is_new
        FROM check_logs
        WHERE check_logs.keyword_id = k.id
        ORDER BY checked_at DESC
        LIMIT 1
      ) latest ON true
      WHERE k.is_active = true
      ORDER BY k.created_at DESC
    `;
    return NextResponse.json(keywords);
  } catch (err: any) {
    console.error('GET /api/keywords 실패:', err);
    return NextResponse.json({ error: err.message ?? '알 수 없는 오류' }, { status: 500 });
  }
}