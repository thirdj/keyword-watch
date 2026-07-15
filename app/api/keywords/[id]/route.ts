import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { keyword, searchEngine, intervalMin } = await req.json();

  if (!keyword?.trim()) {
    return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
  }
  if (intervalMin < 60) {
    return NextResponse.json({ error: '최소 1시간 이상으로 설정해주세요.' }, { status: 400 });
  }

  await sql`
    UPDATE keywords
    SET keyword = ${keyword.trim()}, search_engine = ${searchEngine}, interval_min = ${intervalMin}
    WHERE id = ${id}
  `;
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // 물리 삭제 대신 비활성화 — check_logs/seen_urls 이력 보존
  await sql`UPDATE keywords SET is_active = false WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
