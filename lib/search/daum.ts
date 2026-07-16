import { SearchAdapter, SearchResultItem } from './types';
import { RateLimitError } from './errors';

export const daumAdapter: SearchAdapter = {
  async search(keyword: string): Promise<SearchResultItem[]> {
    const params = new URLSearchParams({
      query: keyword,
      size: '10',
      sort: 'recency', // 정확도순 대신 최신순 — 지원 안 되면 Kakao가 accuracy로 무시하고 처리함
    });

    const res = await fetch(`https://dapi.kakao.com/v2/search/web?${params}`, {
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      },
    });

    if (res.status === 429) {
      throw new RateLimitError('daum', await res.text());
    }
    if (!res.ok) {
      throw new Error(`Daum 검색 실패: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();

    return (data.documents ?? []).map((doc: any): SearchResultItem => ({
      title: stripTags(doc.title),
      url: doc.url,
      snippet: stripTags(doc.contents),
      publishedAt: doc.datetime,
    }));
  },
};

// Kakao 검색 API는 검색어와 일치하는 부분을 <b> 태그로 감싸서 줌
function stripTags(text: string): string {
  return (text ?? '').replace(/<[^>]*>/g, '');
}
