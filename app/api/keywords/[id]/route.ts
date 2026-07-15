import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { intervalMin } = await req.json();

  if (intervalMin < 60) {
    return NextResponse.json({ error: '최소 1시간 이상으로 설정해주세요.' }, { status: 400 });
  }

  await sql`UPDATE keywords SET interval_min = ${intervalMin} WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  // 물리 삭제 대신 비활성화 — check_logs/seen_urls 이력 보존
  await sql`UPDATE keywords SET is_active = false WHERE id = ${params.id}`;
  return NextResponse.json({ success: true });
}
