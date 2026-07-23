import { SearchAdapter, SearchResultItem } from './types';
import { RateLimitError } from './errors';

const RELEVANCE_THRESHOLD = 0.5; // news 토픽은 general보다 점수 분포가 낮아서 기준 완화
const DAYS_WINDOW = 3;           // Tavily에 요청하는 최신성 범위 — 아래 필터링과 반드시 같은 값을 써야 함

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
        days: DAYS_WINDOW, // 최근 N일 내 게시물만 — 오래된 고정 페이지가 계속 상위 차지하는 문제 방지
      }),
    });

    if (res.status === 429) {
      throw new RateLimitError('tavily', await res.text());
    }
    if (!res.ok) {
      throw new Error(`Tavily 검색 실패: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();

    // Tavily의 days 파라미터는 "최근에 크롤링/색인된 페이지"까지 포함시킬 때가 있어서
    // (예: 몇 년 전 작성된 커뮤니티 글이 댓글 등으로 재크롤링되면 "최근"으로 잡힘),
    // published_date 자체가 요청한 기간보다 오래됐으면 여기서 한 번 더 걸러낸다.
    // published_date가 아예 없는 항목은 판단할 근거가 없으니 그냥 통과시킨다.
    const cutoffMs = Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000;

    return (data.results ?? [])
      .filter((item: any) => item.score >= RELEVANCE_THRESHOLD)
      .filter((item: any) => {
        if (!item.published_date) return true;
        const publishedMs = new Date(item.published_date).getTime();
        if (Number.isNaN(publishedMs)) return true;
        return publishedMs >= cutoffMs;
      })
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