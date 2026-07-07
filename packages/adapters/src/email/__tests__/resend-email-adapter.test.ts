import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendSequenceEmail } from '../resend-email-adapter';

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
