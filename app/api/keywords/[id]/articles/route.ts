import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 가장 최근 체크 한 건만 가져온다 — 매번 검색할 때마다 이전 결과는 버리고
    // 이번에 찾은 것만 보여주는 게 목적이라 과거 체크 이력은 필요 없음
    const [latest] = await sql`
      SELECT top_urls, checked_at
      FROM check_logs
      WHERE keyword_id = ${id}
      ORDER BY checked_at DESC
      LIMIT 1
    `;

    if (!latest) {
      return NextResponse.json({ articles: [], checkedAt: null });
    }

    return NextResponse.json({
      articles: latest.top_urls ?? [],
      checkedAt: latest.checked_at,
    });
  } catch (err: any) {
    console.error('GET /api/keywords/[id]/articles 실패:', err);
    return NextResponse.json({ error: err.message ?? '알 수 없는 오류' }, { status: 500 });
  }
}
