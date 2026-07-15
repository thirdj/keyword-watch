export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface SearchAdapter {
  search(keyword: string): Promise<SearchResultItem[]>;
}
