import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'resend' });

export type SequenceDay = 3 | 7 | 14 | 21;

export interface SequenceEmailParams {
  to: string;
  name?: string;
  day: SequenceDay;
  traceId: string;
}

const EMAIL_SHELL = (content: string) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:15px;font-weight:600;color:#f5f5f5;letter-spacing:-0.02em;">Pledge<span style="color:#b6f04c;">OFF</span></span>
        </td></tr>
        <tr><td style="background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="padding-top:24px;">
          <p style="margin:0;font-size:11px;color:#555;font-family:monospace;">
            © 2026 PledgeOFF &nbsp;·&nbsp;
            <a href="https://pledgeoff.com" style="color:#555;text-decoration:none;">pledgeoff.com</a>
            &nbsp;·&nbsp;
            <a href="https://pledgeoff.com/privacy" style="color:#555;text-decoration:none;">Privacy</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const SEQUENCE_CONTENT: Record<SequenceDay, (name: string) => { subject: string; html: string }> = {
  3: (name) => ({
    subject: 'Did you validate your first idea?',
    html: EMAIL_SHELL(`
      <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">DAY 3 · PLEDGEOFF</p>
      <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
        Hey ${name}, did you validate your first idea?
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
        Most founders sign up, then get pulled back into building. The idea validation gets postponed — and then forgotten.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
        It takes 60 seconds. One sentence. You'll know if you're building something the market actually wants — or something you just think it wants.
      </p>
      <a href="https://pledgeoff.com/ideas/new" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
        Validate your idea now →
      </a>
      <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
      <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team</p>
    `),
  }),
  7: (name) => ({
    subject: 'Ideas don\'t get easier to kill',
    html: EMAIL_SHELL(`
      <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">DAY 7 · PLEDGEOFF</p>
      <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
        ${name}, ideas don't get easier to kill.
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
        The longer you hold an idea without validating it, the harder it becomes to kill it. You start filling in the gaps with optimism.
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
        The founders who move fast don't have better ideas. They just have fewer illusions. They let the market speak early — before they've invested months of their life.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
        PledgeOFF pulls real signals from Reddit, GitHub, and Google Trends. Not opinions. Verbatim posts from people who actually have the problem — or don't.
      </p>
      <a href="https://pledgeoff.com/ideas/new" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
        Get your verdict in 60 seconds →
      </a>
      <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
      <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team</p>
    `),
  }),
  14: (name) => ({
    subject: 'Running low on validations?',
    html: EMAIL_SHELL(`
      <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">DAY 14 · PLEDGEOFF</p>
      <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
        ${name}, don't stop at one idea.
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
        The free plan gives you 1 validation per month — enough to test your sharpest idea. But the founders who find product-market fit aren't working from a single idea. They're iterating fast across many.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
        Founder gives you 20 validations per month, team sharing, and priority signals. Starting at €39/month — less than a cancelled subscription you forgot about.
      </p>
      <a href="https://pledgeoff.com/pricing" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
        See plans →
      </a>
      <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
      <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team</p>
    `),
  }),
  21: (name) => ({
    subject: 'Still building in the dark?',
    html: EMAIL_SHELL(`
      <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">DAY 21 · PLEDGEOFF</p>
      <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
        ${name}, three weeks in.
      </h1>
      <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
        Three weeks ago you signed up to stop building things nobody asked for. How's that going?
      </p>
      <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
        The founders who use PledgeOFF consistently report the same thing: they kill bad ideas faster, they pivot with more conviction, and they stop second-guessing every decision.
      </p>
      <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
        If you haven't run a validation yet — today's the day. Takes 60 seconds. The market has an answer. You just need to ask.
      </p>
      <a href="https://pledgeoff.com/ideas/new" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
        Run a validation →
      </a>
      <a href="https://pledgeoff.com/pricing" style="display:inline-block;margin-left:12px;background:transparent;color:#888;font-size:13px;font-weight:500;padding:10px 20px;border-radius:6px;text-decoration:none;border:1px solid #2a2a2a;">
        See plans
      </a>
      <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
      <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team</p>
    `),
  }),
};

export interface PaymentFailedEmailParams {
  to: string;
  name?: string;
  traceId: string;
}

export async function sendPaymentFailedEmail(
  apiKey: string,
  params: PaymentFailedEmailParams,
): Promise<void> {
  const { to, name, traceId } = params;
  const displayName = name?.split(' ')[0] ?? 'there';
  const portalUrl = 'https://pledgeoff.com/settings';

  const html = EMAIL_SHELL(`
    <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">BILLING · PLEDGEOFF</p>
    <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
      Hey ${displayName}, we couldn't charge your card.
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
      Your subscription payment failed. Your account is still active for now — but if the payment isn't resolved within <strong style="color:#f5f5f5;">24 hours</strong>, your account will be downgraded to the Free plan.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
      Update your payment method or retry the charge from your billing settings.
    </p>
    <a href="${portalUrl}" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
      Update payment method →
    </a>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
    <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team</p>
  `);

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PledgeOFF <billing@pledgeoff.com>',
        to: [to],
        subject: 'Action required: your payment failed',
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendPaymentFailedEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return;
    }
    log.info({ traceId, target: 'resend', operation: 'sendPaymentFailedEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Payment failed email sent');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendPaymentFailedEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
  }
}

// Returns true only when Resend accepted the email — callers must not mark the
// sequence row as sent on false, otherwise the email is silently lost.
export async function sendSequenceEmail(
  apiKey: string,
  params: SequenceEmailParams,
): Promise<boolean> {
  const { to, name, day, traceId } = params;
  const displayName = name?.split(' ')[0] ?? 'there';
  const { subject, html } = SEQUENCE_CONTENT[day](displayName);

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PledgeOFF <hello@pledgeoff.com>',
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: `sendSequenceEmail.day${day}`, latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return false;
    }
    log.info({ traceId, target: 'resend', operation: `sendSequenceEmail.day${day}`, latencyMs: Date.now() - start, outcome: 'success' }, `Sequence email day ${day} sent`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: `sendSequenceEmail.day${day}`, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
    return false;
  }
}

export interface MovementAlertEmailParams {
  to: string;
  name?: string;
  ideaId: string;
  ideaExcerpt: string;
  diffs: readonly { field: string; before: string; after: string }[];
  traceId: string;
}

// Major market movement alert — sent from the competitor.changed.v1 consumer.
// Returns true only when Resend accepted the email.
export async function sendMovementAlertEmail(
  apiKey: string,
  params: MovementAlertEmailParams,
): Promise<boolean> {
  const { to, name, ideaId, ideaExcerpt, diffs, traceId } = params;
  const displayName = name?.split(' ')[0] ?? 'there';
  const shown = diffs.slice(0, 5);

  const diffRows = shown
    .map((d) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:12px;color:#f5f5f5;font-family:monospace;">${d.field}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;font-size:12px;color:#888;">${d.before} <span style="color:#b6f04c;">→</span> ${d.after}</td>
      </tr>`)
    .join('');
  const moreRow = diffs.length > shown.length
    ? `<tr><td colspan="2" style="padding:8px 12px;font-size:11px;color:#555;font-family:monospace;">+${diffs.length - shown.length} more changes</td></tr>`
    : '';

  const html = EMAIL_SHELL(`
    <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">MARKET MOVEMENT · PLEDGEOFF</p>
    <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
      ${displayName}, a competitor just moved.
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
      Major changes detected in the market around:
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#f5f5f5;line-height:1.6;font-style:italic;border-left:2px solid #2a2a2a;padding-left:12px;">
      "${ideaExcerpt}"
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #2a2a2a;border-radius:6px;">
      ${diffRows}${moreRow}
    </table>
    <a href="https://pledgeoff.com/ideas/${ideaId}/competitors" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
      See the full picture →
    </a>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
    <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team · You can turn these off in Settings → Notifications</p>
  `);

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PledgeOFF <hello@pledgeoff.com>',
        to: [to],
        subject: 'Market movement: a competitor just changed',
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendMovementAlertEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return false;
    }
    log.info({ traceId, target: 'resend', operation: 'sendMovementAlertEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Movement alert email sent');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendMovementAlertEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
    return false;
  }
}

export interface OutcomeReminderEmailParams {
  to: string;
  name?: string;
  ideaId: string;
  ideaExcerpt: string;
  verdict: 'GO' | 'KILL' | 'PIVOT';
  traceId: string;
}

// Returns true only when Resend accepted the email — callers must not mark the
// reminder as sent on false, otherwise the reminder is silently lost.
export async function sendOutcomeReminderEmail(
  apiKey: string,
  params: OutcomeReminderEmailParams,
): Promise<boolean> {
  const { to, name, ideaId, ideaExcerpt, verdict, traceId } = params;
  const displayName = name?.split(' ')[0] ?? 'there';
  const verdictColor = verdict === 'GO' ? '#b6f04c' : verdict === 'KILL' ? '#ff5c5c' : '#f0b64c';

  const html = EMAIL_SHELL(`
    <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">30 DAYS LATER · PLEDGEOFF</p>
    <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
      ${displayName}, what happened with this idea?
    </h1>
    <p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
      A month ago you got a <strong style="color:${verdictColor};">${verdict}</strong> on:
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#f5f5f5;line-height:1.6;font-style:italic;border-left:2px solid #2a2a2a;padding-left:12px;">
      "${ideaExcerpt}"
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
      Did you build it? Did it work? Your answer takes 10 seconds and makes every future verdict sharper — yours and everyone else's.
    </p>
    <a href="https://pledgeoff.com/ideas/${ideaId}" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
      Report the outcome →
    </a>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
    <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team</p>
  `);

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PledgeOFF <hello@pledgeoff.com>',
        to: [to],
        subject: 'What happened with your idea?',
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendOutcomeReminderEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return false;
    }
    log.info({ traceId, target: 'resend', operation: 'sendOutcomeReminderEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Outcome reminder email sent');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendOutcomeReminderEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
    return false;
  }
}

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

export interface TeamInviteEmailParams {
  to: string;
  inviterEmail: string;
  teamName: string;
  inviteToken: string;
  traceId: string;
}

export async function sendTeamInviteEmail(
  apiKey: string,
  params: TeamInviteEmailParams,
): Promise<void> {
  const { to, inviterEmail, teamName, inviteToken, traceId } = params;
  const acceptUrl = `https://pledgeoff.com/accept-invite?token=${inviteToken}`;
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:15px;font-weight:700;letter-spacing:-0.03em;color:#f0f0f0;">
            Pledge<span style="color:#d6ff3d;">OFF</span>
          </span>
        </td></tr>
        <tr><td style="background:#161616;border:1px solid #2a2a2a;border-radius:8px;padding:32px;">
          <p style="margin:0 0 8px 0;font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.12em;color:#666;">team invite</p>
          <p style="margin:0 0 16px 0;font-size:20px;font-weight:700;color:#f0f0f0;">You're invited to join ${teamName}</p>
          <p style="margin:0 0 24px 0;font-size:14px;color:#a3a3a3;line-height:1.6;">
            ${inviterEmail} invited you to collaborate on PledgeOFF.
            Sign up (or log in) and click the button below to accept.
          </p>
          <a href="${acceptUrl}" style="display:inline-block;background:#d6ff3d;color:#000;font-size:13px;font-weight:700;padding:12px 24px;border-radius:6px;text-decoration:none;">Accept invite →</a>
          <p style="margin:24px 0 0 0;font-family:monospace;font-size:10px;color:#555;">
            Or copy this link: ${acceptUrl}
          </p>
        </td></tr>
        <tr><td style="padding-top:32px;">
          <p style="margin:0;font-family:monospace;font-size:10px;color:#444;line-height:1.6;">
            PledgeOFF · Decision Intelligence for founders<br>
            If you didn't expect this invite, you can ignore this email.
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
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PledgeOFF <hello@pledgeoff.com>',
        to: [to],
        subject: `${inviterEmail} invited you to ${teamName} on PledgeOFF`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendTeamInviteEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return;
    }
    log.info({ traceId, target: 'resend', operation: 'sendTeamInviteEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Team invite email sent');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendTeamInviteEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
  }
}

export async function sendVerdictEmail(
  apiKey: string,
  params: VerdictEmailParams,
): Promise<void> {
  if (process.env.DISABLE_EMAIL === 'true') {
    log.info({ traceId: params.traceId, target: 'resend', operation: 'sendVerdictEmail' }, 'Email disabled via DISABLE_EMAIL flag');
    return;
  }

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

export type AccuracyReportEmailParams = {
  to: string;
  accuracyRate: number | null;
  totalOutcomes: number;
  byVerdict: {
    GO: { total: number; correct: number };
    KILL: { total: number; correct: number };
    PIVOT: { total: number; total_reported: number };
  };
  traceId: string;
};

export async function sendAccuracyReportEmail(
  apiKey: string,
  params: AccuracyReportEmailParams,
): Promise<void> {
  const { to, accuracyRate, totalOutcomes, byVerdict, traceId } = params;

  const rateLabel =
    accuracyRate === null ? 'Not enough data yet' : `${accuracyRate}%`;

  const html = EMAIL_SHELL(`
    <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">MONTHLY REPORT · PLEDGEOFF</p>
    <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
      How accurate were your verdicts last month?
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">
      You've reported outcomes on <strong style="color:#f5f5f5;">${totalOutcomes} idea${totalOutcomes === 1 ? '' : 's'}</strong>.
      Here's how the verdicts held up in the real world.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;padding:16px 20px;text-align:center;">
          <p style="margin:0 0 4px;font-family:monospace;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.08em;">Accuracy Rate</p>
          <p style="margin:0;font-size:36px;font-weight:700;color:${accuracyRate === null ? '#666' : accuracyRate >= 70 ? '#b6f04c' : accuracyRate >= 50 ? '#e8b341' : '#e55b3c'};">${rateLabel}</p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;font-family:monospace;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #2a2a2a;">Verdict</td>
        <td style="padding:8px 0;font-family:monospace;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #2a2a2a;text-align:right;">Reported</td>
        <td style="padding:8px 0;font-family:monospace;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #2a2a2a;text-align:right;">Correct</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#7dd66b;font-weight:600;border-bottom:1px solid #1e1e1e;">GO</td>
        <td style="padding:10px 0;font-size:13px;color:#aaa;text-align:right;border-bottom:1px solid #1e1e1e;">${byVerdict.GO.total}</td>
        <td style="padding:10px 0;font-size:13px;color:#aaa;text-align:right;border-bottom:1px solid #1e1e1e;">${byVerdict.GO.correct}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#e55b3c;font-weight:600;border-bottom:1px solid #1e1e1e;">KILL</td>
        <td style="padding:10px 0;font-size:13px;color:#aaa;text-align:right;border-bottom:1px solid #1e1e1e;">${byVerdict.KILL.total}</td>
        <td style="padding:10px 0;font-size:13px;color:#aaa;text-align:right;border-bottom:1px solid #1e1e1e;">${byVerdict.KILL.correct}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#e8b341;font-weight:600;">PIVOT</td>
        <td style="padding:10px 0;font-size:13px;color:#aaa;text-align:right;">${byVerdict.PIVOT.total_reported}</td>
        <td style="padding:10px 0;font-size:13px;color:#555;text-align:right;">—</td>
      </tr>
    </table>

    <a href="https://pledgeoff.com/admin/flywheel" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
      View full flywheel →
    </a>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
    <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">— PledgeOFF Team</p>
  `);

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PledgeOFF <hello@pledgeoff.com>',
        to: [to],
        subject: `Your PledgeOFF accuracy report — ${rateLabel} on ${totalOutcomes} idea${totalOutcomes === 1 ? '' : 's'}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendAccuracyReportEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return;
    }
    log.info({ traceId, target: 'resend', operation: 'sendAccuracyReportEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Accuracy report email sent');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendAccuracyReportEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
  }
}

export type QueueAlertEmailParams = {
  to: string;
  significantChanges: number;
  traceId: string;
};

export async function sendQueueAlertEmail(
  apiKey: string,
  params: QueueAlertEmailParams,
): Promise<void> {
  const { to, significantChanges, traceId } = params;
  const subject = `${significantChanges === 1 ? '1 idea' : `${significantChanges} ideas`} moved in your Decision Queue`;
  const dashboardUrl = 'https://pledgeoff.com/dashboard';
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">Your Decision Queue changed</h2>
<p style="margin:0 0 16px">The market signals have shifted. <strong>${significantChanges === 1 ? '1 idea' : `${significantChanges} ideas`}</strong> in your queue moved significantly in priority.</p>
<p style="margin:0 0 24px">Open your Decision Queue to see what changed and why.</p>
<a href="${dashboardUrl}?tab=queue" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600">View Decision Queue</a>
<p style="margin:24px 0 0;font-size:12px;color:#666">PledgeOFF — Decision Intelligence Platform</p>
</body></html>`;

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'PledgeOFF <hello@pledgeoff.com>', to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendQueueAlertEmail', latencyMs: Date.now() - start, outcome: 'error' }, `Resend error: ${body}`);
      return;
    }
    log.info({ traceId, target: 'resend', operation: 'sendQueueAlertEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Queue alert email sent');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendQueueAlertEmail', latencyMs: Date.now() - start, outcome: 'error' }, `Resend fetch failed: ${message}`);
  }
}

export type WeeklyDigestIdea = {
  id: string;
  text: string;
  verdict?: 'GO' | 'KILL' | 'PIVOT';
  score?: number;
  toolsRun: string[];
};

export type WeeklyDigestEmailParams = {
  to: string;
  name?: string;
  ideas: WeeklyDigestIdea[];
  weekStart: string;
  traceId: string;
};

const VERDICT_COLOR: Record<string, string> = {
  GO: '#7dd66b',
  KILL: '#e55b3c',
  PIVOT: '#e8b341',
};

export async function sendWeeklyDigestEmail(
  apiKey: string,
  params: WeeklyDigestEmailParams,
): Promise<void> {
  const { to, name, ideas, weekStart, traceId } = params;
  const displayName = name?.split(' ')[0] ?? 'there';
  const weekLabel = new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const ideasHtml = ideas.map((idea) => {
    const title = idea.text.split('\n\n')[0]?.slice(0, 80) ?? idea.text.slice(0, 80);
    const verdictChip = idea.verdict
      ? `<span style="font-family:monospace;font-size:10px;font-weight:700;color:${VERDICT_COLOR[idea.verdict] ?? '#aaa'};margin-left:8px;">${idea.verdict}${idea.score !== undefined ? ` · ${idea.score}` : ''}</span>`
      : '';
    const tools = idea.toolsRun.length > 0
      ? `<p style="margin:4px 0 0;font-family:monospace;font-size:10px;color:#555;">${idea.toolsRun.join(' · ')}</p>`
      : '';
    const url = `https://pledgeoff.com/ideas/${idea.id}`;
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #1e1e1e;">
          <a href="${url}" style="text-decoration:none;">
            <span style="font-size:13px;color:#f0f0f0;font-weight:500;">${title}</span>${verdictChip}
          </a>
          ${tools}
        </td>
      </tr>`;
  }).join('');

  const html = EMAIL_SHELL(`
    <p style="margin:0 0 4px;font-size:11px;color:#555;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;">WEEKLY DIGEST · ${weekLabel}</p>
    <h1 style="margin:8px 0 20px;font-size:22px;font-weight:700;color:#f5f5f5;letter-spacing:-0.03em;line-height:1.1;">
      Hey ${displayName}, here's your week in PledgeOFF.
    </h1>
    ${ideas.length === 0
      ? '<p style="margin:0 0 24px;font-size:14px;color:#aaa;line-height:1.6;">No ideas validated this week. New week, new opportunity.</p>'
      : `<p style="margin:0 0 16px;font-size:14px;color:#aaa;line-height:1.6;">
          You worked on <strong style="color:#f5f5f5;">${ideas.length} idea${ideas.length === 1 ? '' : 's'}</strong> this week.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          ${ideasHtml}
        </table>`
    }
    <a href="https://pledgeoff.com/dashboard" style="display:inline-block;background:#b6f04c;color:#000;font-size:13px;font-weight:600;padding:10px 20px;border-radius:6px;text-decoration:none;">
      Open dashboard →
    </a>
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:28px 0;">
    <p style="margin:0;font-size:11px;color:#444;font-family:monospace;">
      — PledgeOFF Team &nbsp;·&nbsp;
      <a href="https://pledgeoff.com/settings/notifications" style="color:#444;">Unsubscribe</a>
    </p>
  `);

  const start = Date.now();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PledgeOFF <hello@pledgeoff.com>',
        to: [to],
        subject: `Your PledgeOFF week: ${ideas.length} idea${ideas.length === 1 ? '' : 's'}`,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'resend', operation: 'sendWeeklyDigestEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Resend error: ${body}`);
      return;
    }
    log.info({ traceId, target: 'resend', operation: 'sendWeeklyDigestEmail', latencyMs: Date.now() - start, outcome: 'success' }, 'Weekly digest email sent');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'resend', operation: 'sendWeeklyDigestEmail', latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Resend fetch failed: ${message}`);
  }
}
