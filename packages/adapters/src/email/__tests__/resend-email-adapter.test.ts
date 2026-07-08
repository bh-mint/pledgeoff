import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendSequenceEmail, sendOutcomeReminderEmail, sendMovementAlertEmail } from '../resend-email-adapter';

const traceId = crypto.randomUUID();
const params = { to: 'founder@example.com', name: 'Ada Lovelace', day: 3 as const, traceId };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sendSequenceEmail', () => {
  it('returns true when Resend accepts the email', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_123' }),
    }));

    await expect(sendSequenceEmail('re_test_key', params)).resolves.toBe(true);
  });

  it('returns false when Resend responds with an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'rate limited',
    }));

    await expect(sendSequenceEmail('re_test_key', params)).resolves.toBe(false);
  });

  it('returns false when the network call throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(sendSequenceEmail('re_test_key', params)).resolves.toBe(false);
  });
});

describe('sendOutcomeReminderEmail', () => {
  const reminderParams = {
    to: 'founder@example.com',
    name: 'Ada Lovelace',
    ideaId: crypto.randomUUID(),
    ideaExcerpt: 'App to track daily habits',
    verdict: 'GO' as const,
    traceId,
  };

  it('returns true when Resend accepts the email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'email_456' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendOutcomeReminderEmail('re_test_key', reminderParams)).resolves.toBe(true);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(init).toBeDefined();
    const body = JSON.parse(String(init?.body));
    expect(body.html).toContain(`https://pledgeoff.com/ideas/${reminderParams.ideaId}`);
    expect(body.html).toContain('GO');
  });

  it('returns false when Resend responds with an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }));

    await expect(sendOutcomeReminderEmail('re_test_key', reminderParams)).resolves.toBe(false);
  });

  it('returns false when the network call throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(sendOutcomeReminderEmail('re_test_key', reminderParams)).resolves.toBe(false);
  });
});

describe('sendMovementAlertEmail', () => {
  const alertParams = {
    to: 'founder@example.com',
    name: 'Ada Lovelace',
    ideaId: crypto.randomUUID(),
    ideaExcerpt: 'App to track daily habits',
    diffs: [{ field: 'Notion · price', before: '$8/mo', after: '$12/mo' }],
    traceId,
  };

  it('returns true and includes the diff rows when Resend accepts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'email_789' }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendMovementAlertEmail('re_test_key', alertParams)).resolves.toBe(true);

    const body = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(body.html).toContain('Notion · price');
    expect(body.html).toContain(`/ideas/${alertParams.ideaId}/competitors`);
  });

  it('returns false when Resend responds with an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' }));

    await expect(sendMovementAlertEmail('re_test_key', alertParams)).resolves.toBe(false);
  });
});
