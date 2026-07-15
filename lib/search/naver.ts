import { SearchAdapter, SearchResultItem } from './types';

export const naverAdapter: SearchAdapter = {
  async search(keyword: string): Promise<SearchResultItem[]> {
    const params = new URLSearchParams({ query: keyword, display: '10', sort: 'date' });

    const res = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET!,
      },
    });
    if (!res.ok) throw new Error(`Naver 검색 실패: ${res.status}`);

    const data = await res.json();
    return (data.items ?? []).map((item: any): SearchResultItem => ({
      title: item.title.replace(/<[^>]*>/g, ''), // 네이버는 제목에 <b> 태그 섞여옴
      url: item.link,
      snippet: item.description.replace(/<[^>]*>/g, ''),
      publishedAt: item.pubDate,
    }));
  },
};
