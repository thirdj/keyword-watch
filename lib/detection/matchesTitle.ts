// 검색 결과가 실제로 이 키워드에 관한 기사인지 검증한다.
// 제목만 보면 너무 엄격하다 — 한국 뉴스 제목은 대개 축약되어 있어서
// (예: "리오넬 메시 발롱도르"를 검색해도 제목엔 보통 "메시"만 남는 식)
// 키워드 단어가 전부 들어가는 경우가 오히려 드물다. 그래서 제목+요약을 합친 텍스트를 기준으로
// 판단한다. 요약에는 검색 엔진이 실제로 매칭시킨 문맥이 그대로 담겨 있어 정확도는 유지된다.
//
// 다만 "영화 오디세이", "화이트 로투스 시즌4 개봉"처럼 키워드에 범용 카테고리 단어가 섞이면
// 문제가 생긴다. 실제 기사에는 "영화"/"개봉" 같은 단어가 아예 안 쓰이는 경우가 많아서
// (예: 기사 제목엔 그냥 "오디세이"만 있고, OTT 드라마는 "개봉"이 아니라 "공개"/"방영"을 씀)
// 모든 토큰이 다 있어야 한다는 조건 때문에 진짜 관련 기사까지 걸러지는 오탐이 잦았다.
// 그래서 이런 범용 단어는 STOPWORDS로 분류해 매칭 필수 조건에서 제외하고,
// 실제로 그 기사를 특정 지어주는 고유명사/작품명 토큰만 필수로 매칭시킨다.
const STOPWORDS = new Set(
  [
    // 장르/매체
    '영화', '드라마', '애니', '애니메이션', '다큐', '다큐멘터리', '웹툰', '웹소설', '게임', '공연', '뮤지컬', '전시',
    // 공개/발매 관련 동사성 명사
    '개봉', '공개', '방영', '방송', '발매', '출시', '출간', '연재',
    // 부가 수식어
    '신작', '신곡', '앨범', '컴백', '예고편', '티저', '시즌', '후기', '리뷰', '뉴스', '소식', '근황',
  ].map((w) => w.toLowerCase())
);

export function matchesTitle(keyword: string, title: string, snippet: string = ''): boolean {
  const tokens = keyword
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return true;

  // 불용어를 뺀 "진짜 매칭에 써야 할" 토큰들. 키워드가 전부 불용어로만 이뤄진 극단적인
  // 경우(예: "영화 개봉")엔 걸러낼 기준이 없어지므로, 그럴 땐 원래 토큰 전체로 되돌린다.
  const contentTokens = tokens.filter((t) => !STOPWORDS.has(normalize(t)));
  const requiredTokens = contentTokens.length > 0 ? contentTokens : tokens;

  const combined = normalize(`${title} ${snippet}`);
  return requiredTokens.every((token) => combined.includes(normalize(token)));
}

function normalize(text: string): string {
  return text.toLowerCase();
}