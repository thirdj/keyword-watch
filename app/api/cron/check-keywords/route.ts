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

  // 이번 실행에서 이미 한도 초과가 확인된 provider는 나머지 키워드도 호출 없이 바로 스킵
  // (크레딧 소진 상태에서 나머지 키워드마다 계속 API를 두드려봤자 전부 429만 받을 뿐이라 낭비)
  const rateLimitedProviders = new Set<string>();

  for (const kw of dueKeywords) {
    if (rateLimitedProviders.has(kw.search_engine)) {
      results.push({ keyword: kw.keyword, status: 'rate_limited', skipped: true });
      continue;
    }

    try {
      const isFirstCheck = kw.last_checked_at === null;

      const { checkLogId, newItems, resultCount } = await checkKeyword(
        kw.id,
        kw.keyword,
        kw.search_engine,
        isFirstCheck
      );

      if (resultCount === 0) {
        // 검색 결과 자체가 0건 — 키워드 표현이 너무 좁거나 오타일 가능성 힌트
        results.push({ keyword: kw.keyword, status: 'no_results' });
      } else if (isFirstCheck) {
        // 첫 체크는 baseline만 저장, 알림 없음 (등록 직후 알림 폭탄 방지)
        results.push({ keyword: kw.keyword, status: 'baseline_saved', count: newItems.length });
      } else if (newItems.length > 0) {
        await sendNotification(kw.id, checkLogId, kw.keyword, newItems);
        results.push({ keyword: kw.keyword, status: 'notified', count: newItems.length });
      } else {
        results.push({ keyword: kw.keyword, status: 'no_change' });
      }
    } catch (err: any) {
      if (err instanceof RateLimitError) {
        rateLimitedProviders.add(kw.search_engine);
        console.warn(`${kw.search_engine} 한도 초과, 이번 실행에서 이후 동일 provider 키워드는 스킵합니다.`);
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
