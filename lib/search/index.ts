import { naverAdapter } from './naver';
import { googleRssAdapter } from './googleRss';
import { SearchAdapter } from './types';

const adapters: Record<string, SearchAdapter> = {
  naver: naverAdapter,
  google_rss: googleRssAdapter,
};

export function getSearchAdapter(engine: string): SearchAdapter {
  const adapter = adapters[engine];
  if (!adapter) throw new Error(`지원하지 않는 검색엔진: ${engine}`);
  return adapter;
}

export const SUPPORTED_ENGINES = Object.keys(adapters);