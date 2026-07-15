export async function sendEmail(subject: string, html: string, to: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) throw new Error(`이메일 발송 실패: ${res.status} ${await res.text()}`);
  return res.json();
}
