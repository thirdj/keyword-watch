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

  // 이 키워드가 지금까지 본 URL들을 한 번에 조회 (매 결과마다 쿼리 안 날리게)
  const seenRows = await sql`
    SELECT url FROM seen_urls WHERE keyword_id = ${keywordId}
  `;
  const seenUrls = new Set(seenRows.map((r: any) => r.url));

  for (const item of results) {
    if (!seenUrls.has(item.url)) {
      // 나무위키/블로그류처럼 내용이 자주 바뀌는 도메인은 lib/excludedDomains.ts에서
      // 이미 결과 목록에서 제외됐으므로, 여기선 URL이 처음 보이는지만 확인하면 된다
      newItems.push(item);
      await upsertSeenUrl(keywordId, item.url, item.title);
    }
  }

  return { newItems, allUrls: results.map((r) => r.url) };
}

export function hashUrls(urls: string[]): string {
  return crypto.createHash('sha256').update([...urls].sort().join('|')).digest('hex').slice(0, 16);
}

async function upsertSeenUrl(keywordId: number, url: string, title: string) {
  await sql`
    INSERT INTO seen_urls (keyword_id, url, title)
    VALUES (${keywordId}, ${url}, ${title})
    ON CONFLICT (keyword_id, url)
    DO UPDATE SET last_seen_at = now()
  `;
}