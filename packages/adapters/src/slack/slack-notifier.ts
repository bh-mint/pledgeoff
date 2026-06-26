import { createLogger } from '@pledgeoff/observability';

const log = createLogger({ adapter: 'slack' });

export type SlackNotifyParams = {
  webhookUrl: string;
  ideaId: string;
  ideaText: string;
  tool: 'competitors' | 'market-landscape' | 'battlecard';
  verdict?: string;
  traceId: string;
};

const TOOL_LABEL: Record<SlackNotifyParams['tool'], string> = {
  'competitors': 'Competitor Analysis',
  'market-landscape': 'Market Landscape',
  'battlecard': 'Battlecard',
};

export async function notifySlack(params: SlackNotifyParams): Promise<void> {
  const { webhookUrl, ideaId, ideaText, tool, verdict, traceId } = params;
  const ideaTitle = ideaText.split('\n\n')[0]?.slice(0, 80) ?? ideaText.slice(0, 80);
  const url = `https://pledgeoff.com/ideas/${ideaId}`;
  const verdictEmoji = verdict === 'GO' ? '🟢' : verdict === 'KILL' ? '🔴' : verdict === 'PIVOT' ? '🟡' : '';

  const payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${TOOL_LABEL[tool]} ready* ${verdictEmoji}\n${ideaTitle}`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View →' },
          url,
        },
      },
    ],
  };

  const start = Date.now();
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn({ traceId, target: 'slack', tool, latencyMs: Date.now() - start, outcome: 'error', errorCode: `HTTP_${res.status}` }, `Slack webhook error: ${body}`);
    } else {
      log.info({ traceId, target: 'slack', tool, latencyMs: Date.now() - start, outcome: 'success' }, 'Slack notification sent');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    log.error({ traceId, target: 'slack', tool, latencyMs: Date.now() - start, outcome: 'error', errorCode: 'FETCH_ERROR' }, `Slack webhook failed: ${message}`);
  }
}

export async function sendSlackTestNotification(webhookUrl: string, traceId: string): Promise<boolean> {
  const payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*PledgeOFF connected* ✅\nYour Slack workspace will receive notifications when analysis tools complete.',
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5_000),
    });
    log.info({ traceId, target: 'slack', operation: 'test', outcome: res.ok ? 'success' : 'error' }, 'Slack test notification');
    return res.ok;
  } catch {
    return false;
  }
}
