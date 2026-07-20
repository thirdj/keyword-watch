import { XMLParser } from 'fast-xml-parser';
import { SearchAdapter, SearchResultItem } from './types';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

export const googleRssAdapter: SearchAdapter = {
  async search(keyword: string, sinceDate?: Date): Promise<SearchResultItem[]> {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google News RSS 요청 실패: ${res.status}`);
    }

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

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}
