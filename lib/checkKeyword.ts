import { getSearchAdapter } from '@/lib/search';
import { detectNewResults, hashUrls } from '@/lib/detection/detectNewResults';
import { matchesTitle } from '@/lib/detection/matchesTitle';
import { sql } from '@/lib/db';
import { SearchResultItem } from '@/lib/search/types';
import { RateLimitError } from '@/lib/search/errors';

interface CheckResult {
  checkLogId: number;
  newItems: SearchResultItem[];
  resultCount: number;
  rateLimitedEngines: string[]; // 이번 호출에서 새로 한도 초과가 확인된 엔진들
}

export async function checkKeyword(
  keywordId: number,
  keyword: string,
  engines: string[],
  isFirstCheck: boolean,
  lastCheckedAt: Date | null,
  skipEngines: Set<string> = new Set()
): Promise<CheckResult> {
  // 이번 크론 실행 중 이미 한도 초과가 확인된 엔진은 아예 호출하지 않는다
  const activeEngines = engines.filter((e) => !skipEngines.has(e));

  if (activeEngines.length === 0) {
    // 선택된 엔진이 전부 이미 한도 초과 상태 → 이 키워드는 이번 실행에서 통째로 스킵
    // (last_checked_at도 갱신하지 않아야 다음 실행 때 다시 시도됨)
    throw new RateLimitError(engines.join(','), '선택된 검색엔진이 모두 이번 실행에서 한도 초과 상태예요.');
  }

  // 여러 엔진을 동시에 호출하고, 하나가 실패해도 나머지 결과는 살린다
  const settled = await Promise.allSettled(
    activeEngines.map((engine) => getSearchAdapter(engine).search(keyword, lastCheckedAt ?? undefined))
  );

  const rawResults: SearchResultItem[] = [];
  const rateLimitedEngines: string[] = [];

  settled.forEach((result, i) => {
    const engine = activeEngines[i];
    if (result.status === 'fulfilled') {
      rawResults.push(...result.value);
    } else if (result.reason instanceof RateLimitError) {
      rateLimitedEngines.push(engine);
    } else {
      // 이 엔진만 실패로 처리하고 나머지 엔진 결과로 계속 진행
      console.error(`[${engine}] 검색 실패 (키워드: ${keyword}):`, result.reason);
    }
  });

  // 모든 엔진이 한도 초과로 끝났다면(=쓸만한 결과가 하나도 없음) 이 키워드는 통째로 재시도 대상
  if (rateLimitedEngines.length === activeEngines.length) {
    throw new RateLimitError(rateLimitedEngines.join(','), '선택된 검색엔진이 모두 한도 초과예요.');
  }

  // 여러 엔진 결과를 합치면 같은 기사가 URL 기준으로 중복될 수 있어 먼저 제거
  const deduped = dedupeByUrl(rawResults);

  // 제목+요약에 키워드 구성 단어가 다 들어있는 것만 "이 키워드에 관한 기사"로 인정
  const matched = deduped.filter((item) => matchesTitle(keyword, item.title, item.snippet));

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

  return { checkLogId: checkLog.id, newItems, resultCount: results.length, rateLimitedEngines };
}

// 여러 엔진 결과를 합칠 때 같은 기사(URL 동일)가 중복으로 들어오는 걸 제거.
// 먼저 나온 엔진의 결과를 우선시한다(엔진 배열 순서 = 우선순위).
function dedupeByUrl(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  const result: SearchResultItem[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    result.push(item);
  }
  return result;
}