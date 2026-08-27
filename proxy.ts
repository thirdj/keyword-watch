import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, verifyAuthToken } from '@/lib/auth';

// 인증 없이 통과시키는 경로:
// - /login              : 로그인 화면 자체 (여기까지 막으면 로그인을 아예 못 함)
// - /api/auth/login     : 로그인 처리 API
// - /api/cron/check-keywords : GitHub Actions가 호출하는 크론. CRON_SECRET으로 이미 별도 보호되고
//                          있어서 여기서 또 막으면 자동 체크가 끊긴다.
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/cron/check-keywords'];

// Next.js 16부터 파일명이 middleware.ts → proxy.ts, 함수명이 middleware → proxy로 바뀜.
// (구버전 Next.js를 쓰고 있다면 파일명을 middleware.ts로, 아래 함수명을 middleware로 되돌리면 됨)
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (await verifyAuthToken(token)) {
    return NextResponse.next();
  }

  // API 요청은 리다이렉트 대신 401로 응답 — fetch가 리다이렉트를 따라가며
  // 로그인 페이지의 HTML을 JSON으로 파싱하려다 엉뚱한 에러가 나는 걸 방지
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '인증이 필요해요.' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/login', req.url));
}

// _next 정적 리소스, 파비콘류는 인증 체크 없이 그대로 서빙 (로그인 화면 자체를 그리는 데 필요)
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)'],
};