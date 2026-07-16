import { sendTelegram } from './telegram';
import { sendEmail } from './email';
import { SearchResultItem } from '@/lib/search/types';
import { sql } from '@/lib/db';

export async function sendNotification(
  keywordId: number,
  checkLogId: number,
  keyword: string,
  newItems: SearchResultItem[]
) {
  // 이 계정에 등록된 알림 채널 조회
  const channels = await sql`
    SELECT channel, target FROM notification_channels
    WHERE user_id = 'me' AND is_active = true
  `;

  const telegramMessage = formatTelegramMessage(keyword, newItems);
  const emailHtml = formatEmailHtml(keyword, newItems);

  for (const ch of channels) {
    const [notifRecord] = await sql`
      INSERT INTO notifications (keyword_id, check_log_id, channel, status)
      VALUES (${keywordId}, ${checkLogId}, ${ch.channel}, 'pending')
      RETURNING id
    `;

    try {
      if (ch.channel === 'telegram') {
        await sendTelegram(telegramMessage);
      } else if (ch.channel === 'email') {
        await sendEmail(`[키워드 알림] ${keyword}`, emailHtml, ch.target);
      }
      await sql`UPDATE notifications SET status = 'sent', sent_at = now() WHERE id = ${notifRecord.id}`;
    } catch (err) {
      console.error(`알림 발송 실패 (${ch.channel}):`, err);
      await sql`UPDATE notifications SET status = 'failed' WHERE id = ${notifRecord.id}`;
      // 한 채널 실패해도 다른 채널은 계속 진행 (throw 하지 않음)
    }
  }
}

function formatTelegramMessage(keyword: string, items: SearchResultItem[]): string {
  const lines = items
    .slice(0, 5) // 너무 많으면 메시지 자름
    .map((item, i) => `${i + 1}. <a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a>`);

  return `🔔 <b>${escapeHtml(keyword)}</b> 새 결과 ${items.length}건 발견\n\n${lines.join('\n')}`;
}

function formatEmailHtml(keyword: string, items: SearchResultItem[]): string {
  const rows = items
    .slice(0, 10)
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a><br><span style="color:#666;font-size:13px;">${escapeHtml(item.snippet)}</span></li>`
    )
    .join('');

  return `
    <h2>"${escapeHtml(keyword)}" 새 결과 ${items.length}건</h2>
    <ul style="padding-left:20px;">${rows}</ul>
  `;
}

// 기사 제목/스니펫에 &, <, > 같은 문자가 섞여 있으면
// 텔레그램 HTML 파서가 400 에러를 뱉거나 이메일 마크업이 깨질 수 있어 이스케이프 처리
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
