import { getSearchAdapter } from '@/lib/search';
import { detectNewResults, hashUrls } from '@/lib/detection/detectNewResults';
import { sql } from '@/lib/db';
import { SearchResultItem } from '@/lib/search/types';

interface CheckResult {
  checkLogId: number;
  newItems: SearchResultItem[];
  resultCount: number;
}

export async function checkKeyword(
  keywordId: number,
  keyword: string,
  engine: string,
  isFirstCheck: boolean
): Promise<CheckResult> {
  const adapter = getSearchAdapter(engine);
  const results = await adapter.search(keyword);

  const { newItems, allUrls } = await detectNewResults(keywordId, results);

  // 첫 체크(baseline)는 URL을 전부 새로 저장하는 것뿐, 실제 "새 결과 알림" 대상이 아니므로
  // 화면 상태(check_logs.is_new)에도 true로 남기지 않는다. 알림 발송 여부와 정확히 일치시킴.
  const isNewForDisplay = !isFirstCheck && newItems.length > 0;

  const [checkLog] = await sql`
    INSERT INTO check_logs (keyword_id, result_hash, top_urls, is_new)
    VALUES (
      ${keywordId},
      ${hashUrls(allUrls)},
      ${JSON.stringify(results)},
      ${isNewForDisplay}
    )
    RETURNING id
  `;

  await sql`UPDATE keywords SET last_checked_at = now() WHERE id = ${keywordId}`;

  return { checkLogId: checkLog.id, newItems, resultCount: results.length };
}
