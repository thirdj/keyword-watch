import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE_SEC, createAuthToken, getExpectedPassword } from '@/lib/auth';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = body?.password;

  // getExpectedPassword()는 서버에서만 호출된다 — 브라우저로는 절대 내려가지 않으므로
  // 소스보기/개발자도구로 오늘의 비밀번호를 알아낼 방법이 없다.
  if (typeof password !== 'string' || password !== getExpectedPassword()) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않아요.' }, { status: 401 });
  }

  const token = await createAuthToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true, // JS(document.cookie)로 못 읽음 — XSS로도 탈취 어려움
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_SEC,
  });
  return res;
}