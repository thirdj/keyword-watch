// 인증 관련 로직을 한 곳에 모아둠. middleware.ts(엣지 런타임)와
// app/api/auth/login/route.ts(서버 런타임) 양쪽에서 같이 쓰기 때문에,
// Node 전용 API(Buffer 등)는 쓰지 않고 Web Crypto API(crypto.subtle, btoa)만 사용한다.

export const AUTH_COOKIE_NAME = 'kw_auth';
export const AUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 로그인 유지 기간: 30일

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 오늘 한국 시간 기준 "어제" 날짜를 YYMMDD로 반환.
// 서버(Vercel)는 보통 UTC로 돌기 때문에, KST로 보정하지 않으면 자정이 아니라
// 한국 시간 오전 9시에 비밀번호가 바뀌는 이상한 결과가 나온다.
export function getExpectedPassword(): string {
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const yesterdayKst = new Date(nowKst.getTime() - DAY_MS);
  const yy = String(yesterdayKst.getUTCFullYear()).slice(2);
  const mm = String(yesterdayKst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(yesterdayKst.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// 로그인 성공 시 발급하는 서명된 토큰. "issuedAt.서명" 형태 — 비밀번호 자체는
// 토큰 어디에도 안 들어가고, AUTH_SECRET을 아는 서버만 서명을 다시 계산해서 검증할 수 있다.
export async function createAuthToken(): Promise<string> {
  const secret = requireSecret();
  const issuedAt = Date.now().toString();
  const signature = await sign(secret, issuedAt);
  return `${issuedAt}.${signature}`;
}

export async function verifyAuthToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  const [issuedAt, signature] = token.split('.');
  if (!issuedAt || !signature) return false;

  const expected = await sign(secret, issuedAt);
  if (expected !== signature) return false;

  const age = Date.now() - Number(issuedAt);
  if (Number.isNaN(age) || age < 0 || age > AUTH_COOKIE_MAX_AGE_SEC * 1000) return false;

  return true;
}

function requireSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET 환경변수가 설정되지 않았습니다.');
  return secret;
}

async function sign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toBase64Url(sigBuf);
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}