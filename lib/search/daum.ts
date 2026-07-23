import { SearchAdapter, SearchResultItem } from './types';
import { RateLimitError } from './errors';

// 카카오 Daum 검색(v2/search/web)은 뉴스 전용 API가 아니라 일반 웹 문서 검색이라
// 포럼 글/도서관 서지정보/서점 소개 페이지처럼 원래 오래된 문서가 섞여 들어온다.
// 게다가 카카오 API는 서버 쪽 날짜 범위 필터를 아예 지원하지 않아서(sort=recency는
// 정렬만 바꿔줄 뿐 기간을 좁혀주진 않음), 오래된 문서를 걸러내려면 클라이언트에서
// datetime을 직접 봐야 한다.
const FRESHNESS_WINDOW_DAYS = 7;

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

    // datetime이 아예 없는 문서는 판단할 근거가 없으니 그냥 통과시키고,
    // 있는데 너무 오래됐으면(포럼/서지정보 등) 걸러낸다.
    const cutoffMs = Date.now() - FRESHNESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    return (data.documents ?? [])
      .filter((doc: any) => {
        if (!doc.datetime) return true;
        const publishedMs = new Date(doc.datetime).getTime();
        if (Number.isNaN(publishedMs)) return true;
        return publishedMs >= cutoffMs;
      })
      .map((doc: any): SearchResultItem => ({
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