import { getSearchAdapter } from '@/lib/search';
import { detectNewResults, hashUrls } from '@/lib/detection/detectNewResults';
import { matchesTitle } from '@/lib/detection/matchesTitle';
import { getExcludedDomains, extractDomain } from '@/lib/excludedDomains';
import { sql } from '@/lib/db';
import { SearchResultItem } from '@/lib/search/types';
import { RateLimitError } from '@/lib/search/errors';

interface CheckResult {
  checkLogId: number;
  newItems: SearchResultItem[];
  resultCount: number;
  rateLimitedEngines: string[]; // 이번 호출에서 새로 한도 초과가 확인된 엔진들
}

// 매칭 시 요약(snippet)까지 신뢰할 수 없는 엔진 — 뉴스 전용이 아니라 일반 웹검색이라
// 요약에 페이지의 광고/관련상품 위젯 텍스트 같은 게 섞여 들어올 수 있음.
// 이 엔진들은 제목에 키워드가 직접 있을 때만 매칭시킨다.
const SNIPPET_UNRELIABLE_ENGINES = new Set(['daum']);

type SourcedItem = SearchResultItem & { engine: string };

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
    activeEngines.map(async (engine) => {
      const items = await getSearchAdapter(engine).search(keyword, lastCheckedAt ?? undefined);
      return items.map((item): SourcedItem => ({ ...item, engine }));
    })
  );

  const rawResults: SourcedItem[] = [];
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

  // 나무위키/블로그류처럼 뉴스 기사로 보기 어려운 도메인은 매칭 이전에 아예 제외.
  // (긴 백과사전형 문서 안에 키워드 단어가 무관한 문맥으로 우연히 섞여 들어가 있어도
  //  matchesTitle을 통과해버리는 오탐을 여기서 원천 차단한다)
  const excludedDomains = await getExcludedDomains();
  const filtered = deduped.filter((item) => {
    const domain = extractDomain(item.url);
    return domain ? !excludedDomains.has(domain) : true;
  });

  // 제목+요약에 키워드 구성 단어가 다 들어있는 것만 "이 키워드에 관한 기사"로 인정.
  // 단, 요약을 못 믿는 엔진(SNIPPET_UNRELIABLE_ENGINES)에서 온 결과는 요약은 아예 안 보고
  // 제목에만 있는지로 판단한다 — 채용공고 안의 브랜드 나열, 광고 위젯 텍스트 같은 데
  // 우연히 키워드가 섞여 들어오는 걸 막기 위해서다.
  const matched = filtered.filter((item) =>
    matchesTitle(keyword, item.title, SNIPPET_UNRELIABLE_ENGINES.has(item.engine) ? '' : item.snippet)
  );

  // 저장용 데이터에는 내부 처리용 engine 태그를 남기지 않는다
  const stripEngine = (item: SourcedItem): SearchResultItem => {
    const { engine, ...rest } = item;
    return rest;
  };

  // 최신 기사가 위로 오도록 발행일 기준 내림차순 정렬.
  // 검색 API마다 기본 정렬 기준이 다르므로(관련도순 등) 여기서 한 번 통일한다.
  // 발행일 정보가 없는 결과는 뒤로 밀어낸다.
  const results = matched
    .map(stripEngine)
    .sort((a, b) => {
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
function dedupeByUrl(items: SourcedItem[]): SourcedItem[] {
  const seen = new Set<string>();
  const result: SourcedItem[] = [];
  for (const item of items) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    result.push(item);
  }
  return result;
}