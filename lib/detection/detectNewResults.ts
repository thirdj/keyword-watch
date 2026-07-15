import crypto from 'crypto';
import { sql } from '@/lib/db';
import { SearchResultItem } from '@/lib/search/types';

interface DetectionResult {
  newItems: SearchResultItem[]; // 알림 보낼 대상
  allUrls: string[];            // check_logs 기록용
}

export async function detectNewResults(
  keywordId: number,
  results: SearchResultItem[]
): Promise<DetectionResult> {
  const newItems: SearchResultItem[] = [];

  // 1. 이 키워드가 지금까지 본 URL들을 한 번에 조회 (매 결과마다 쿼리 안 날리게)
  const seenRows = await sql`
    SELECT url, content_hash FROM seen_urls WHERE keyword_id = ${keywordId}
  `;
  const seenMap = new Map(seenRows.map((r: any) => [r.url, r.content_hash]));

  // 2. 변동성 도메인 목록 조회 (나무위키, 블로그 등 콘텐츠가 자주 바뀌는 곳)
  const volatileRows = await sql`SELECT domain FROM volatile_domains`;
  const volatileDomains = new Set(volatileRows.map((r: any) => r.domain));

  for (const item of results) {
    const domain = new URL(item.url).hostname.replace(/^www\./, '');
    const contentHash = hashContent(item.title + item.snippet);

    if (!seenMap.has(item.url)) {
      // 완전히 새로운 URL → 무조건 새 결과
      newItems.push(item);
      await upsertSeenUrl(keywordId, item.url, item.title, contentHash);
    } else if (volatileDomains.has(domain)) {
      // 이미 본 URL이지만 변동성 도메인 → 내용이 바뀌었는지 확인
      const prevHash = seenMap.get(item.url);
      if (prevHash !== contentHash) {
        newItems.push(item);
        await upsertSeenUrl(keywordId, item.url, item.title, contentHash);
      }
    }
    // 이미 본 URL + 변동성 도메인 아님 → 스킵 (변화 없음)
  }

  return { newItems, allUrls: results.map((r) => r.url) };
}

export function hashContent(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function hashUrls(urls: string[]): string {
  return hashContent([...urls].sort().join('|'));
}

async function upsertSeenUrl(keywordId: number, url: string, title: string, contentHash: string) {
  await sql`
    INSERT INTO seen_urls (keyword_id, url, title, content_hash)
    VALUES (${keywordId}, ${url}, ${title}, ${contentHash})
    ON CONFLICT (keyword_id, url)
    DO UPDATE SET content_hash = ${contentHash}, last_seen_at = now()
  `;
}
