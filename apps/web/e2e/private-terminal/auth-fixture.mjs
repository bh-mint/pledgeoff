// Test-only implementation of the Supabase Auth HTTP contract, bound to loopback.
import { createServer } from 'node:http';
const identity = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', email: 'private@example.test', email_confirmed_at: '2026-10-26T00:00:00Z', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-26T00:00:00Z' };
const sessions = new Set();
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const reply = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (req.url === '/health') return reply(200, { ok: true });
  if (req.url?.startsWith('/auth/v1/token') && req.method === 'POST') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (body.email !== identity.email || body.password !== process.env.E2E_PRIVATE_TEST_PASSWORD) return reply(400, { error: 'invalid_grant', msg: 'Invalid credentials' });
    const now = Math.floor(Date.now() / 1000);
    const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: identity.id, aud: 'authenticated', role: 'authenticated', iat: now, exp: now + 3600 })).toString('base64url')}.local-test-signature`;
    sessions.add(token);
    return reply(200, { access_token: token, refresh_token: 'local-test-refresh', token_type: 'bearer', expires_in: 3600, user: identity });
  }
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!sessions.has(token)) return reply(401, { message: 'Invalid token' });
  if (req.url?.startsWith('/auth/v1/user')) return reply(200, identity);
  if (req.url?.startsWith('/auth/v1/logout')) { sessions.delete(token); return reply(200, {}); }
  return reply(404, { message: 'Unsupported fixture endpoint' });
}).listen(54325, '127.0.0.1');
