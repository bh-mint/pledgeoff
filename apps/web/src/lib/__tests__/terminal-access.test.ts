import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn(), rateLimit: vi.fn(),
}));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mocks.getUser } }) }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseAuthClient: async () => ({ auth: {
  getUser: mocks.getUser, signInWithPassword: mocks.signInWithPassword, signOut: mocks.signOut,
} }) }));
vi.mock('@/lib/rate-limiter', () => ({ checkResendRateLimit: mocks.rateLimit, getClientIp: () => '127.0.0.1' }));

import { proxy } from '@/proxy';
import { isTerminalUser, isTerminalPage } from '@/lib/terminal-policy';
import { POST as login } from '@/app/api/terminal/login/route';
import { POST as logout } from '@/app/api/terminal/logout/route';

const authorized = { id: 'private-user-id', email_confirmed_at: '2026-10-26' };
function post(path: string, body?: unknown, origin = 'http://localhost:3000') {
  return new Request(`http://localhost:3000${path}`, {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('PRIVATE_TERMINAL_USER_ID', authorized.id);
  vi.stubEnv('PRIVATE_TERMINAL_EMAIL', 'private@example.test');
  vi.stubEnv('PRIVATE_TERMINAL_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon');
  mocks.getUser.mockResolvedValue({ data: { user: authorized }, error: null });
  mocks.signInWithPassword.mockResolvedValue({ data: { user: authorized }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.rateLimit.mockResolvedValue({ allowed: true });
});
afterEach(() => vi.unstubAllEnvs());

describe('private identity policy', () => {
  it('requires immutable ID and confirmed identity; alias metadata cannot authorize another account', () => {
    expect(isTerminalUser(authorized)).toBe(true);
    expect(isTerminalUser({ ...authorized, id: 'different-id' })).toBe(false);
    expect(isTerminalUser({ id: authorized.id, email_confirmed_at: undefined })).toBe(false);
    expect(isTerminalUser(null)).toBe(false);
  });
  it('fails closed when the private identity is not configured', () => {
    vi.stubEnv('PRIVATE_TERMINAL_USER_ID', '');
    expect(isTerminalUser(authorized)).toBe(false);
  });
  it('only permits the exact terminal sections', () => {
    expect(isTerminalPage('/terminal/portfolio')).toBe(true);
    expect(isTerminalPage('/terminal/portfolio/export')).toBe(false);
    expect(isTerminalPage('/ideas')).toBe(false);
  });
});

describe('server route boundary', () => {
  it.each(['/terminal/overview', '/terminal/portfolio', '/profile/bashui', '/v/123', '/blog/feed.xml', '/onboarding'])('redirects anonymous access to %s', async (path) => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await proxy(new NextRequest(`http://localhost:3000${path}`));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it.each(['/api/health', '/api/v1/ideas', '/api/v1/ideas/a/export', '/api/v1/public/last-validated', '/api/v1/cron/process-outbox', '/api/auth/github', '/api/v1/webhooks/stripe'])('rejects anonymous API %s including API key/bearer requests', async (path) => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const response = await proxy(new NextRequest(`http://localhost:3000${path}`, { headers: { 'x-api-key': 'po_live_legacy', authorization: 'Bearer legacy' } }));
    expect(response.status).toBe(401);
  });
  it('rejects a valid Supabase session belonging to a different user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { ...authorized, id: 'another-user' } } });
    expect((await proxy(new NextRequest('http://localhost:3000/api/terminal/logout'))).status).toBe(401);
  });
  it('fails closed when Supabase fails', async () => {
    mocks.getUser.mockRejectedValue(new Error('offline'));
    expect((await proxy(new NextRequest('http://localhost:3000/api/health'))).status).toBe(401);
  });
  it.each(['/profile/bashui', '/ideas/new', '/auth/callback', '/api/v1/ideas', '/sitemap.xml', '/reset-password'])('retires legacy route %s even for the authorized user', async (path) => {
    expect((await proxy(new NextRequest(`http://localhost:3000${path}`))).status).toBe(410);
  });
  it('allows an authorized terminal request with no-store and noindex', async () => {
    const response = await proxy(new NextRequest('http://localhost:3000/terminal/overview'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-robots-tag')).toContain('noindex');
  });
  it('prepares apex canonical redirect preserving the path and query', async () => {
    const response = await proxy(new NextRequest('https://pledgeoff.com/terminal/overview?tab=demo'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://www.pledgeoff.com/terminal/overview?tab=demo');
  });
  it('keeps localhost and preview login accessible without configuration', async () => {
    vi.stubEnv('PRIVATE_TERMINAL_USER_ID', '');
    expect((await proxy(new NextRequest('http://localhost:3000/login'))).status).toBe(200);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});

describe('private login and logout', () => {
  it('maps bashui to the configured email without accepting an email from the caller', async () => {
    const response = await login(post('/api/terminal/login', { username: 'bashui', password: 'test-only-value', email: 'attacker@example.test' }));
    expect(response.status).toBe(200);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: 'private@example.test', password: 'test-only-value' });
  });
  it('rejects another alias without calling Supabase sign-in', async () => {
    expect((await login(post('/api/terminal/login', { username: 'other', password: 'test' }))).status).toBe(401);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it('clears a session when sign-in returns an unauthorized Auth identity', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: { ...authorized, id: 'other' } } });
    expect((await login(post('/api/terminal/login', { username: 'bashui', password: 'test' }))).status).toBe(401);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('rejects invalid credentials', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid' } });
    expect((await login(post('/api/terminal/login', { username: 'bashui', password: 'test' }))).status).toBe(401);
  });
  it('does not attempt sign-in without identity configuration', async () => {
    vi.stubEnv('PRIVATE_TERMINAL_EMAIL', '');
    expect((await login(post('/api/terminal/login', { username: 'bashui', password: 'test' }))).status).toBe(503);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it('requires a shared rate limiter in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    expect((await login(post('/api/terminal/login', { username: 'bashui', password: 'test' }))).status).toBe(503);
  });
  it('rate limits login before password verification', async () => {
    mocks.rateLimit.mockResolvedValue({ allowed: false });
    expect((await login(post('/api/terminal/login', { username: 'bashui', password: 'test' }))).status).toBe(429);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it('fails closed if the shared limiter is unavailable', async () => {
    mocks.rateLimit.mockRejectedValue(new Error('offline'));
    expect((await login(post('/api/terminal/login', { username: 'bashui', password: 'test' }))).status).toBe(503);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
  it('rejects cross-origin login and logout', async () => {
    expect((await login(post('/api/terminal/login', {}, 'https://attacker.test'))).status).toBe(403);
    expect((await logout(post('/api/terminal/logout', undefined, 'https://attacker.test'))).status).toBe(403);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('rejects missing Origin and requires a configured production origin', async () => {
    expect((await logout(new Request('http://localhost:3000/api/terminal/logout', { method: 'POST' }))).status).toBe(403);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PRIVATE_TERMINAL_ORIGIN', '');
    expect((await logout(post('/api/terminal/logout'))).status).toBe(403);
  });
  it('revokes refresh sessions globally on logout', async () => {
    expect((await logout(post('/api/terminal/logout'))).status).toBe(200);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'global' });
  });
  it('rejects logout by an unauthorized user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { ...authorized, id: 'other' } } });
    expect((await logout(post('/api/terminal/logout'))).status).toBe(401);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('reports a logout failure without claiming the session was revoked', async () => {
    mocks.signOut.mockResolvedValue({ error: { message: 'offline' } });
    expect((await logout(post('/api/terminal/logout'))).status).toBe(503);
  });
});
