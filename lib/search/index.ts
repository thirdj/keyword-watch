import { tavilyAdapter } from './tavily';
import { naverAdapter } from './naver';
import { daumAdapter } from './daum';
import { googleRssAdapter } from './googleRss';
import { SearchAdapter } from './types';

const adapters: Record<string, SearchAdapter> = {
  tavily: tavilyAdapter,
  naver: naverAdapter,
  daum: daumAdapter,
  google_rss: googleRssAdapter,
};

export function getSearchAdapter(engine: string): SearchAdapter {
  const adapter = adapters[engine];
  if (!adapter) throw new Error(`지원하지 않는 검색엔진: ${engine}`);
  return adapter;
}
