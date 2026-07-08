import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requireCronAuth } from '../cron-auth';

const SECRET = 'a'.repeat(48);

function reqWithAuth(header?: string): Request {
  return new Request('https://pledgeoff.com/api/v1/cron/cleanup', {
    headers: header ? { authorization: header } : {},
  });
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('requireCronAuth', () => {
  it('accepts a request with the correct bearer secret', () => {
    expect(requireCronAuth(reqWithAuth(`Bearer ${SECRET}`))).toEqual({ ok: true });
  });

  it('rejects a wrong secret with 401', () => {
    const res = requireCronAuth(reqWithAuth('Bearer wrong-secret'));
    expect(res).toEqual({ ok: false, status: 401, body: 'Unauthorized' });
  });

  it('rejects a missing Authorization header with 401', () => {
    const res = requireCronAuth(reqWithAuth());
    expect(res).toEqual({ ok: false, status: 401, body: 'Unauthorized' });
  });

  it('returns 503 when CRON_SECRET is not configured', () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = requireCronAuth(reqWithAuth(`Bearer ${SECRET}`));
    expect(res).toEqual({ ok: false, status: 503, body: 'Server misconfiguration' });
  });

  it('rejects "Bearer undefined" when the secret is empty (no auth bypass)', () => {
    vi.stubEnv('CRON_SECRET', '');
    const res = requireCronAuth(reqWithAuth('Bearer undefined'));
    expect(res.ok).toBe(false);
  });
});
