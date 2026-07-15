import { getSearchAdapter } from '@/lib/search';
import { detectNewResults, hashUrls } from '@/lib/detection/detectNewResults';
import { sql } from '@/lib/db';
import { SearchResultItem } from '@/lib/search/types';

interface CheckResult {
  checkLogId: number;
  newItems: SearchResultItem[];
}

export async function checkKeyword(
  keywordId: number,
  keyword: string,
  engine: string
): Promise<CheckResult> {
  const adapter = getSearchAdapter(engine);
  const results = await adapter.search(keyword);

  const { newItems, allUrls } = await detectNewResults(keywordId, results);

  const [checkLog] = await sql`
    INSERT INTO check_logs (keyword_id, result_hash, top_urls, is_new)
    VALUES (
      ${keywordId},
      ${hashUrls(allUrls)},
      ${JSON.stringify(results)},
      ${newItems.length > 0}
    )
    RETURNING id
  `;

  await sql`UPDATE keywords SET last_checked_at = now() WHERE id = ${keywordId}`;

  return { checkLogId: checkLog.id, newItems };
}
