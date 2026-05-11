import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'resend' });

export interface VerdictEmailParams {
  to: string;
  ideaId: string;
  ideaText: string;
  verdict: 'GO' | 'KILL' | 'PIVOT';
  score: number;
  traceId: string;
}

const VERDICT_LABEL: Record<string, string> = {
  GO: 'GO — Strong signal. Build it.',
  KILL: 'KILL — Weak signal. Don\'t build it.',
  PIVOT: 'PIVOT — Mixed signal. Change direction.',
};

export async function sendVerdictEmail(
  apiKey: string,
  params: VerdictEmailParams,
): Promise<void> {
  const { to, ideaId, ideaText, verdict, score, traceId } = params;

  const ideaTitle = ideaText.split('\n\n')[0]?.slice(0, 80) ?? ideaText.slice(0, 80);
  const subject = `[${verdict}] ${score}/100 — Your idea is validated`;
  const ideaUrl = `https://pledgeoff.com/ideas/${ideaId}`;
  const shareUrl = `https://pledgeoff.com/v/${ideaId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:15px;font-weight:700;letter-spacing:-0.03em;color:#f0f0f0;">
            Pledge<span style="color:#d6ff3d;">OFF</span>
          </span>
        </td></tr>
        <!-- Verdict block -->
        <tr><td style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;padding:32px;">
          <p style="margin:0 0 8px 0;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#666;">verdict</p>
          <p style="margin:0 0 4px 0;font-size:48px;font-weight:700;line-height:1;color:${verdict === 'GO' ? '#7dd66b' : verdict === 'KILL' ? '#e55b3c' : '#e8b341'};">${score}</p>
          <p style="margin:0 0 24px 0;font-size:18px;font-weight:600;color:${verdict === 'GO' ? '#7dd66b' : verdict === 'KILL' ? '#e55b3c' : '#e8b341'};">${VERDICT_LABEL[verdict]}</p>
          <p style="margin:0 0 8px 0;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#666;">idea</p>
          <p style="margin:0 0 32px 0;font-size:15px;font-weight:500;color:#f0f0f0;line-height:1.4;">${ideaTitle}</p>
          <a href="${ideaUrl}" style="display:inline-block;background:#d6ff3d;color:#000;font-size:13px;font-weight:700;padding:12px 24px;border-radius:6px;text-decoration:none;">View full analysis →</a>
        </td></tr>
        <!-- Share -->
        <tr><td style="padding-top:24px;">
          <p style="margin:0;font-family:monospace;font-size:11px;color:#555;">
            Share your result: <a href="${shareUrl}" style="color:#888;">${shareUrl}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:32px;border-top:1px solid #1a1a1a;margin-top:32px;">
          <p style="margin:0;font-family:monospace;font-size:10px;color:#444;line-height:1.6;">
            PledgeOFF · Decision Intelligence for founders<br>
            <a href="https://pledgeoff.com/dashboard" style="color:#555;">Dashboard</a> ·
            <a href="https://pledgeoff.com/pricing" style="color:#555;">Upgrade</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PledgeOFF <verdict@pledgeoff.com>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendVerdictEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return;
    }

    log.info({ traceId, target: 'resend', operation: 'sendVerdictEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Verdict email sent');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendVerdictEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
  }
}
