import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { SUPPORTED_ENGINES } from '@/lib/search';

const MIN_INTERVAL_MIN = 60; // 최소 1시간 — 크레딧 보호용 하한선
const MAX_ENGINES = 2;       // 검색엔진은 Google RSS / Naver 두 개까지

function validateEngines(searchEngines: unknown): string[] | null {
  if (!Array.isArray(searchEngines) || searchEngines.length === 0) return null;
  if (searchEngines.length > MAX_ENGINES) return null;
  const deduped = Array.from(new Set(searchEngines));
  if (deduped.some((e) => typeof e !== 'string' || !SUPPORTED_ENGINES.includes(e))) return null;
  return deduped as string[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { keyword, searchEngines, intervalMin } = body;

    // 입력 검증
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
    if (intervalMin < MIN_INTERVAL_MIN) {
      return NextResponse.json(
        { error: `확인 주기는 최소 ${MIN_INTERVAL_MIN}분(1시간) 이상이어야 해요.` },
        { status: 400 }
      );
    }

    const trimmedKeyword = keyword.trim();

    // 중복 등록 방지 — 대소문자/공백 차이는 무시하고 비교
    const duplicates = await sql`
      SELECT id FROM keywords
      WHERE is_active = true AND lower(trim(keyword)) = lower(${trimmedKeyword})
    `;
    if (duplicates.length > 0) {
      return NextResponse.json({ error: '이미 등록된 키워드예요.' }, { status: 400 });
    }

    const [newKeyword] = await sql`
      INSERT INTO keywords (user_id, keyword, search_engines, interval_min, is_active)
      VALUES ('me', ${trimmedKeyword}, ${engines}, ${intervalMin}, true)
      RETURNING id, keyword, search_engines, interval_min
    `;

    return NextResponse.json(newKeyword, { status: 201 });
  } catch (err: any) {
    console.error('POST /api/keywords 실패:', err);
    return NextResponse.json({ error: err.message ?? '알 수 없는 오류' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // 각 키워드의 가장 최근 check_logs 한 건을 LATERAL JOIN으로 같이 가져와서
    // 대시보드 상태점(새 결과 있었는지)을 정확히 표시할 수 있게 함
    const keywords = await sql`
      SELECT
        k.id, k.keyword, k.search_engines, k.interval_min, k.last_checked_at, k.is_active,
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