import { SearchAdapter, SearchResultItem } from './types';
import { RateLimitError } from './errors';

// sinceDate가 없는 첫 체크(baseline)일 때 기본으로 적용할 최신성 범위.
// Naver News API는 sort=date로 정렬은 해주지만 기간 제한은 안 해줘서,
// 뉴스가 뜸한 키워드는 몇 달~1년 전 기사로 나머지 자리를 채워서 돌려줄 수 있음.
const BASELINE_FRESHNESS_DAYS = 30;

export const naverAdapter: SearchAdapter = {
  async search(keyword: string, sinceDate?: Date): Promise<SearchResultItem[]> {
    const params = new URLSearchParams({ query: keyword, display: '10', sort: 'date' });

    const res = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    });
    if (res.status === 429) {
      throw new RateLimitError('naver', await res.text());
    }
    if (!res.ok) throw new Error(`Naver 검색 실패: ${res.status}`);

    const data = await res.json();
    const results: SearchResultItem[] = (data.items ?? []).map((item: any): SearchResultItem => ({
      title: item.title.replace(/<[^>]*>/g, ''), // 네이버는 제목에 <b> 태그 섞여옴
      url: item.link,
      snippet: item.description.replace(/<[^>]*>/g, ''),
      publishedAt: item.pubDate,
    }));

    // 재체크는 마지막 확인 시각 이후만, 첫 체크는 기본 30일 이내만 남긴다.
    // publishedAt이 없거나 파싱 안 되면 판단할 근거가 없으니 통과시킨다.
    const cutoff = sinceDate ?? new Date(Date.now() - BASELINE_FRESHNESS_DAYS * 24 * 60 * 60 * 1000);

    return results.filter((item) => {
      if (!item.publishedAt) return true;
      const publishedMs = new Date(item.publishedAt).getTime();
      if (Number.isNaN(publishedMs)) return true;
      return publishedMs > cutoff.getTime();
    });
  },
};