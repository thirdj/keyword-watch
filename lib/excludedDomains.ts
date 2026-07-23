import { sql } from '@/lib/db';

// volatile_domains 테이블: 나무위키/블로그/위키백과처럼 "뉴스 기사"로 보기 어렵고
// 페이지 안에 어떤 단어든 우연히 섞여 있을 확률이 높은(그래서 오탐이 잦은) 도메인 목록.
// 매칭 이전 단계에서 아예 결과에서 제외하는 용도로 쓴다.
export async function getExcludedDomains(): Promise<Set<string>> {
  const rows = await sql`SELECT domain FROM volatile_domains`;
  return new Set(rows.map((r: any) => r.domain));
}

export function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}