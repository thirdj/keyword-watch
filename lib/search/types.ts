export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
}

export interface SearchAdapter {
  // sinceDate가 주어지면, 그 시각 이후에 나온 결과만 필요하다는 힌트.
  // Naver처럼 자체 관련도순 API는 이 값을 무시해도 되고(선택),
  // RSS 기반처럼 발행일이 명확한 어댑터는 이 값으로 직접 필터링한다.
  search(keyword: string, sinceDate?: Date): Promise<SearchResultItem[]>;
}