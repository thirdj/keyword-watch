import { getSearchAdapter } from '@/lib/search';
import { detectNewResults, hashUrls } from '@/lib/detection/detectNewResults';
import { matchesTitle } from '@/lib/detection/matchesTitle';
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
  isFirstCheck: boolean,
  lastCheckedAt: Date | null
): Promise<CheckResult> {
  const adapter = getSearchAdapter(engine);
  const rawResults = await adapter.search(keyword, lastCheckedAt ?? undefined);

  // 제목+요약에 키워드 구성 단어가 다 들어있는 것만 "이 키워드에 관한 기사"로 인정
  const matched = rawResults.filter((item) => matchesTitle(keyword, item.title, item.snippet));

  // 최신 기사가 위로 오도록 발행일 기준 내림차순 정렬.
  // 검색 API마다 기본 정렬 기준이 다르므로(관련도순 등) 여기서 한 번 통일한다.
  // 발행일 정보가 없는 결과는 뒤로 밀어낸다.
  const results = [...matched].sort((a, b) => {
    if (!a.publishedAt && !b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

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
