// 검색 결과가 실제로 이 키워드에 관한 기사인지, 제목 기준으로 한 번 더 검증한다.
// 검색 API가 관련도 높다고 준 결과라도, 키워드를 구성하는 단어가 제목에 전혀 없으면
// (본문 어딘가에만 언급되는 정도라면) 이 서비스 취지상 "새 소식"으로 보기 애매하므로 제외한다.
export function matchesTitle(keyword: string, title: string): boolean {
  const tokens = keyword
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return true;

  const normalizedTitle = normalize(title);
  return tokens.every((token) => normalizedTitle.includes(normalize(token)));
}

function normalize(text: string): string {
  return text.toLowerCase();
}
