import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const MAX_KEYWORDS = 10;
const MIN_INTERVAL_MIN = 60; // 최소 1시간 — 크레딧 보호용 하한선

export async function POST(req: Request) {
  const body = await req.json();
  const { keyword, searchEngine, intervalMin } = body;

  // 입력 검증
  if (!keyword?.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
  }
  if (intervalMin < MIN_INTERVAL_MIN) {
    return NextResponse.json(
      { error: `확인 주기는 최소 ${MIN_INTERVAL_MIN}분(1시간) 이상이어야 해요.` },
      { status: 400 }
    );
  }

  // 개수 제한 체크
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
  const keywords = await sql`
    SELECT id, keyword, search_engine, interval_min, last_checked_at, is_active
    FROM keywords
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
  return NextResponse.json(keywords);
}
