import { describe, it, expect, vi, afterEach } from 'vitest';
import { notifySlackMovement } from '../slack-notifier';

const baseParams = {
  webhookUrl: 'https://hooks.slack.com/services/T00/B00/xyz',
  ideaId: crypto.randomUUID(),
  ideaText: 'App to track daily habits and productivity metrics',
  diffs: [
    { field: 'Notion · price', before: '$8/mo', after: '$12/mo', significance: 'major' as const },
    { field: 'Notion · segment', before: 'SMB', after: 'Enterprise', significance: 'minor' as const },
  ],
  majorChanges: 1,
  traceId: crypto.randomUUID(),
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('notifySlackMovement', () => {
  it('posts diff lines and the competitors link to the webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await notifySlackMovement(baseParams);

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    const text = body.blocks[0].text.text as string;
    expect(text).toContain('Market movement detected');
    expect(text).toContain('$8/mo → $12/mo');
    expect(body.blocks[0].accessory.url).toContain(`/ideas/${baseParams.ideaId}/competitors`);
  });

  it('swallows webhook failures without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(notifySlackMovement(baseParams)).resolves.toBeUndefined();
  });

  it('caps the diff list at 5 entries and notes the remainder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const manyDiffs = Array.from({ length: 8 }, (_, i) => ({
      field: `Comp · field${i}`, before: 'a', after: 'b', significance: 'minor' as const,
    }));
    await notifySlackMovement({ ...baseParams, diffs: manyDiffs });

    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.blocks[0].text.text).toContain('+3 more changes');
  });
});
