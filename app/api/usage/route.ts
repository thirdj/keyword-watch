import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://api.tavily.com/usage', {
      headers: { Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Tavily 사용량 조회 실패: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    // 응답 형태는 계정 설정에 따라 조금씩 다를 수 있어 방어적으로 파싱
    const accountUsage = data.account ?? data;
    const limit = accountUsage.limit ?? accountUsage.plan_limit ?? 1000;
    const used = accountUsage.usage ?? accountUsage.current_usage ?? 0;

    return NextResponse.json({ limit, used, remaining: Math.max(limit - used, 0) });
  } catch (err: any) {
    console.error('GET /api/usage 실패:', err);
    return NextResponse.json({ error: err.message ?? '알 수 없는 오류' }, { status: 500 });
  }
}
