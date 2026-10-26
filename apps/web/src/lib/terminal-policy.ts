import type { User } from '@supabase/supabase-js';

// Only server-side configuration binds the public alias to an immutable Auth ID.
export function terminalIdentity() {
  const userId = process.env.PRIVATE_TERMINAL_USER_ID;
  const email = process.env.PRIVATE_TERMINAL_EMAIL;
  if (!userId || !email) return null;
  return { userId, email, alias: 'bashui' };
}

export function isTerminalUser(user: Pick<User, 'id' | 'email_confirmed_at'> | null): boolean {
  const identity = terminalIdentity();
  return !!identity && !!user?.email_confirmed_at && user.id === identity.userId;
}

export function isTerminalPage(path: string) {
  return path === '/' || path === '/dashboard' || path === '/terminal' || /^\/terminal\/(overview|markets|strategies|activity|portfolio|history|settings)$/.test(path);
}

export function sameOrigin(req: Request) {
  const configured = process.env.PRIVATE_TERMINAL_ORIGIN;
  if (process.env.NODE_ENV === 'production' && !configured) return false;
  const expected = configured ?? new URL(req.url).origin;
  return req.headers.get('origin') === expected;
}
