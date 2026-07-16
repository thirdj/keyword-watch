import { SearchAdapter, SearchResultItem } from './types';

const RELEVANCE_THRESHOLD = 0.5; // news 토픽은 general보다 점수 분포가 낮아서 기준 완화

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
        search_depth: 'basic',
        topic: 'news', // 관련도순(general) 대신 최신순 가중치가 들어간 뉴스 전용 랭킹 사용
        days: 3,        // 최근 3일 내 게시물만 — 오래된 고정 페이지가 계속 상위 차지하는 문제 방지
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
        publishedAt: item.published_date,
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
