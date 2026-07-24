import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { SUPPORTED_ENGINES } from '@/lib/search';

const MAX_ENGINES = 2; // Google RSS / Naver 두 개까지

function validateEngines(searchEngines: unknown): string[] | null {
  if (!Array.isArray(searchEngines) || searchEngines.length === 0) return null;
  if (searchEngines.length > MAX_ENGINES) return null;
  const deduped = Array.from(new Set(searchEngines));
  if (deduped.some((e) => typeof e !== 'string' || !SUPPORTED_ENGINES.includes(e))) return null;
  return deduped as string[];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { keyword, searchEngines, intervalMin } = await req.json();

    if (!keyword?.trim()) {
      return NextResponse.json({ error: '키워드를 입력해주세요.' }, { status: 400 });
    }
    const engines = validateEngines(searchEngines);
    if (!engines) {
      return NextResponse.json(
        { error: `검색엔진을 1~${MAX_ENGINES}개 선택해주세요.` },
        { status: 400 }
      );
    }
    if (intervalMin < 60) {
      return NextResponse.json({ error: '최소 1시간 이상으로 설정해주세요.' }, { status: 400 });
    }

    const trimmedKeyword = keyword.trim();

    // 중복 등록 방지 — 자기 자신은 제외하고 비교
    const duplicates = await sql`
      SELECT id FROM keywords
      WHERE is_active = true
        AND id != ${id}
        AND lower(trim(keyword)) = lower(${trimmedKeyword})
    `;
    if (duplicates.length > 0) {
      return NextResponse.json({ error: '이미 등록된 키워드예요.' }, { status: 400 });
    }

    await sql`
      UPDATE keywords
      SET keyword = ${trimmedKeyword}, search_engines = ${engines}, interval_min = ${intervalMin}
      WHERE id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH /api/keywords/[id] 실패:', err);
    return NextResponse.json({ error: err.message ?? '알 수 없는 오류' }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // 물리 삭제 대신 비활성화 — check_logs/seen_urls 이력 보존
    await sql`UPDATE keywords SET is_active = false WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/keywords/[id] 실패:', err);
    return NextResponse.json({ error: err.message ?? '알 수 없는 오류' }, { status: 500 });
  }
}