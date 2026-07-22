import { sql } from '@/lib/db';

export async function getDueKeywords() {
  return sql`
    SELECT id, keyword, search_engines, interval_min, last_checked_at
    FROM keywords
    WHERE is_active = true
      AND (
        last_checked_at IS NULL
        OR last_checked_at < now() - (interval_min || ' minutes')::interval
      )
  `;
}