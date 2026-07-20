import { NextResponse } from 'next/server';
import { sendTelegram } from '@/lib/notify/telegram';

// 검색/판별 로직과 무관하게, 텔레그램 발송 경로 자체만 단독으로 확인하기 위한 임시 라우트.
// 테스트 끝나면 파일 삭제하거나 배포에서 제외해도 무방.
export async function GET() {
  try {
    await sendTelegram('🔔 테스트 메시지입니다. 이게 도착했다면 텔레그램 연결은 정상이에요.');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
