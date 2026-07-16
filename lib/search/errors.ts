// 크레딧 소진(429)을 일반 에러와 구분해서, 크론 핸들러가 다르게 표시/처리할 수 있게 함
export class RateLimitError extends Error {
  provider: string;

  constructor(provider: string, detail: string) {
    super(`${provider} API 요청 한도 초과 (크레딧 소진 가능성): ${detail}`);
    this.name = 'RateLimitError';
    this.provider = provider;
  }
}
