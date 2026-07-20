import { XMLParser } from 'fast-xml-parser';
import { SearchAdapter, SearchResultItem } from './types';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const googleRssAdapter: SearchAdapter = {
  async search(keyword: string, sinceDate?: Date): Promise<SearchResultItem[]> {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;

    const res = await fetchRss(url);
    const xml = await res.text();
    const data = parser.parse(xml);

    const rawItems = data?.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    const results: SearchResultItem[] = items.map((item: any) => ({
      title: stripHtml(String(item.title ?? '')),
      url: String(item.link ?? ''),
      snippet: stripHtml(String(item.description ?? '')),
      publishedAt: item.pubDate ? String(item.pubDate) : undefined,
    }));

    // sinceDate(=이 키워드의 마지막 확인 시각)보다 이후에 나온 기사만 남긴다.
    // 첫 체크(sinceDate 없음)는 전체를 baseline으로 저장해야 하므로 필터링하지 않는다.
    if (!sinceDate) return results;

    return results.filter((item) => {
      if (!item.publishedAt) return false;
      return new Date(item.publishedAt) > sinceDate;
    });
  },
};

// 구글이 가끔 일시적으로 503을 주는 경우가 있어 한 번만 재시도
async function fetchRss(url: string): Promise<Response> {
  const attempt = () => fetch(url, { headers: { 'User-Agent': USER_AGENT } });

  let res = await attempt();
  if (res.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    res = await attempt();
  }
  if (!res.ok) {
    throw new Error(`Google News RSS 요청 실패: ${res.status}`);
  }
  return res;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}
