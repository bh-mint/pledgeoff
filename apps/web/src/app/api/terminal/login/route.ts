import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { isTerminalUser, sameOrigin, terminalIdentity } from '@/lib/terminal-policy';
import { checkResendRateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Request rejected.' }, { status: 403 });
  const identity = terminalIdentity();
  if (!identity || (process.env.NODE_ENV === 'production' && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN))) {
    return NextResponse.json({ error: 'Private access is not configured.' }, { status: 503 });
  }
  try {
    // Global alias bucket prevents attempts distributed across IPs; IP bucket limits individual clients.
    const [global, client] = await Promise.all([
      checkResendRateLimit('terminal:login'), checkResendRateLimit(`terminal:${getClientIp(req)}`),
    ]);
    if (!global.allowed || !client.allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { 'Retry-After': '600' } });
    const body = await req.json();
    if (body.username !== identity.alias || typeof body.password !== 'string' || !body.password || body.password.length > 256) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }
    const supabase = await createSupabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: identity.email, password: body.password });
    if (error || !isTerminalUser(data.user)) {
      await supabase.auth.signOut({ scope: 'local' });
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unable to sign in.' }, { status: 503 });
  }
}
