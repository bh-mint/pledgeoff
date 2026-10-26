import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isTerminalPage, isTerminalUser, terminalIdentity } from '@/lib/terminal-policy';

function secure(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
  return response;
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  // Prepared in code only. Localhost and preview hosts are left on their own origin.
  if (req.nextUrl.hostname === 'pledgeoff.com') {
    const canonical = req.nextUrl.clone();
    canonical.hostname = 'www.pledgeoff.com';
    canonical.protocol = 'https:';
    canonical.port = '';
    return secure(NextResponse.redirect(canonical, 308));
  }
  if (['/sw.js', '/favicon.ico', '/favicon.svg', '/robots.txt'].includes(path)) {
    return secure(NextResponse.next());
  }
  const login = path === '/login' || path === '/api/terminal/login';
  if (login) return secure(NextResponse.next());

  const api = path.startsWith('/api/');
  if (!terminalIdentity() || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return secure(api
      ? NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url)));
  }
  const refreshed: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          refreshed.push({ name, value, options });
        });
      },
    },
  });
  let authorized = false;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    authorized = !error && isTerminalUser(user);
  } catch { /* Fail closed if Auth is unavailable. */ }
  let response: NextResponse;
  if (!authorized) {
    response = api ? NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) : NextResponse.redirect(new URL('/login', req.url));
  } else if (path === '/api/terminal/logout' || isTerminalPage(path)) {
    response = NextResponse.next({ request: req });
  } else {
    // Retire every legacy page, API, webhook and cron without touching stored data.
    response = api ? NextResponse.json({ error: 'This endpoint is retired.' }, { status: 410 }) : new NextResponse('This page has been retired.', { status: 410 });
  }
  refreshed.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return secure(response);
}

// Do not exclude file extensions: old public feeds, PDFs and API exports must be gated too.
export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
