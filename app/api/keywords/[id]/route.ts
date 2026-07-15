import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { intervalMin } = await req.json();

  if (intervalMin < 60) {
    return NextResponse.json({ error: '최소 1시간 이상으로 설정해주세요.' }, { status: 400 });
  }

  await sql`UPDATE keywords SET interval_min = ${intervalMin} WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await sql`UPDATE keywords SET is_active = false WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}