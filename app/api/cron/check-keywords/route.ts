import { NextResponse } from 'next/server';
import { getDueKeywords } from '@/lib/getDueKeywords';
import { checkKeyword } from '@/lib/checkKeyword';
import { sendNotification } from '@/lib/notify';
import { RateLimitError } from '@/lib/search/errors';

export async function GET(req: Request) {
  // 외부에서 아무나 호출 못 하도록 검증 (GitHub Actions가 같은 값으로 호출)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueKeywords = await getDueKeywords();
  const results = [];

  // 이번 실행에서 이미 한도 초과가 확인된 엔진은, 그 엔진을 쓰는 다른 키워드에서도
  // 호출 없이 바로 스킵한다 (크레딧 소진 상태에서 계속 두드려봤자 전부 429만 받을 뿐이라 낭비).
  // 키워드가 엔진을 여러 개 쓸 수 있으니 이제 엔진 단위(Set<string>)로 추적한다.
  const rateLimitedEngines = new Set<string>();

  for (const kw of dueKeywords) {
    const engines: string[] = kw.search_engines;

    try {
      const isFirstCheck = kw.last_checked_at === null;
      const lastCheckedAt = kw.last_checked_at ? new Date(kw.last_checked_at) : null;

      const { checkLogId, newItems, resultCount, rateLimitedEngines: newlyLimited } = await checkKeyword(
        kw.id,
        kw.keyword,
        engines,
        isFirstCheck,
        lastCheckedAt,
        rateLimitedEngines
      );

      newlyLimited.forEach((e) => rateLimitedEngines.add(e));

      if (isFirstCheck) {
        // 첫 체크(baseline)에서 결과가 0건이면 키워드 표현이 너무 좁거나 오타일 가능성 힌트.
        // baseline이 아닌 이후 체크에서 0건인 건 정상(RSS는 "마지막 확인 이후" 기준이라
        // 새 기사가 없으면 당연히 0건) — 그건 아래 else 분기에서 no_change로 처리됨.
        results.push({
          keyword: kw.keyword,
          status: resultCount === 0 ? 'no_results' : 'baseline_saved',
          count: newItems.length,
        });
      } else if (newItems.length > 0) {
        await sendNotification(kw.id, checkLogId, kw.keyword, newItems);
        results.push({ keyword: kw.keyword, status: 'notified', count: newItems.length });
      } else {
        results.push({ keyword: kw.keyword, status: 'no_change' });
      }
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        err.provider.split(',').forEach((e) => rateLimitedEngines.add(e));
        console.warn(`한도 초과(${err.provider}), 이번 실행에서 해당 엔진을 쓰는 나머지 키워드는 스킵합니다.`);
        results.push({ keyword: kw.keyword, status: 'rate_limited' });
      } else {
        // 한 키워드 실패해도 나머지는 계속 진행
        console.error(`키워드 체크 실패: ${kw.keyword}`, err);
        results.push({ keyword: kw.keyword, status: 'error', message: err.message });
      }
    }
  }

  return NextResponse.json({ checked: dueKeywords.length, results });
}