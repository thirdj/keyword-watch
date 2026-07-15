import { SearchAdapter, SearchResultItem } from './types';

const RELEVANCE_THRESHOLD = 0.7; // 이 아래 점수는 노이즈로 판단해 제외

export const tavilyAdapter: SearchAdapter = {
  async search(keyword: string): Promise<SearchResultItem[]> {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: keyword,
        max_results: 10,
        search_depth: 'basic', // 기본이 크레딧 1건, advanced는 2건 소모
      }),
    });

    if (!res.ok) {
      throw new Error(`Tavily 검색 실패: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();

    return (data.results ?? [])
      .filter((item: any) => item.score >= RELEVANCE_THRESHOLD)
      .map((item: any): SearchResultItem => ({
        title: item.title,
        url: item.url,
        snippet: cleanSnippet(item.content),
      }));
  },
};

// CNET류 결과처럼 마크다운 링크 목록이 섞여오는 경우 정리
function cleanSnippet(content: string): string {
  return content
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [텍스트](링크) → 텍스트만 남김
    .replace(/\*\s*/g, '')                    // 목록 기호 제거
    .replace(/\s+/g, ' ')                     // 연속 공백 정리
    .trim()
    .slice(0, 300); // 알림 메시지용으로 길이 제한
}
