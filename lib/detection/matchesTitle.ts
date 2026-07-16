// 검색 결과가 실제로 이 키워드에 관한 기사인지 검증한다.
// 제목만 보면 너무 엄격하다 — 한국 뉴스 제목은 대개 축약되어 있어서
// (예: "리오넬 메시 발롱도르"를 검색해도 제목엔 보통 "메시"만 남는 식)
// 키워드 단어가 전부 들어가는 경우가 오히려 드물다. 그래서 제목+요약을 합친 텍스트를 기준으로
// 판단한다. 요약에는 검색 엔진이 실제로 매칭시킨 문맥이 그대로 담겨 있어 정확도는 유지된다.
export function matchesTitle(keyword: string, title: string, snippet: string = ''): boolean {
  const tokens = keyword
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return true;

  const combined = normalize(`${title} ${snippet}`);
  return tokens.every((token) => combined.includes(normalize(token)));
}

function normalize(text: string): string {
  return text.toLowerCase();
}
