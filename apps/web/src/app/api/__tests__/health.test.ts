import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ok } from 'neverthrow';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  createSupabaseServiceClient: () => ({
    from: mockFrom,
  }),
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with ok status when DB responds', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ limit: () => ({ single: () => Promise.resolve({ data: { id: 'x' }, error: null }) }) }),
    });

    const { GET } = await import('../health/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.db).toBe('ok');
    expect(typeof body.latencyMs).toBe('number');
    expect(typeof body.ts).toBe('string');
  });

  it('returns 503 when DB throws', async () => {
    mockFrom.mockReturnValue({
      select: () => ({ limit: () => ({ single: () => Promise.reject(new Error('connection refused')) }) }),
    });

    const { GET } = await import('../health/route');
    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('error');
  });
});
