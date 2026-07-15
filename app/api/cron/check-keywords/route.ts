import { NextResponse } from 'next/server';
import { getDueKeywords } from '@/lib/getDueKeywords';
import { checkKeyword } from '@/lib/checkKeyword';
import { sendNotification } from '@/lib/notify';

export async function GET(req: Request) {
  // 외부에서 아무나 호출 못 하도록 검증 (GitHub Actions가 같은 값으로 호출)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueKeywords = await getDueKeywords();
  const results = [];

  for (const kw of dueKeywords) {
    try {
      const isFirstCheck = kw.last_checked_at === null;

      const { checkLogId, newItems } = await checkKeyword(kw.id, kw.keyword, kw.search_engine);

      if (isFirstCheck) {
        // 첫 체크는 baseline만 저장, 알림 없음 (등록 직후 알림 폭탄 방지)
        results.push({ keyword: kw.keyword, status: 'baseline_saved', count: newItems.length });
      } else if (newItems.length > 0) {
        await sendNotification(kw.id, checkLogId, kw.keyword, newItems);
        results.push({ keyword: kw.keyword, status: 'notified', count: newItems.length });
      } else {
        results.push({ keyword: kw.keyword, status: 'no_change' });
      }
    } catch (err: any) {
      // 한 키워드 실패해도 나머지는 계속 진행
      console.error(`키워드 체크 실패: ${kw.keyword}`, err);
      results.push({ keyword: kw.keyword, status: 'error', message: err.message });
    }
  }

  return NextResponse.json({ checked: dueKeywords.length, results });
}
