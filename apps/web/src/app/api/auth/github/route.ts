import { resolveUserIdFromRequest } from '@/lib/api-auth';

export const maxDuration = 10;

export async function GET(req: Request): Promise<Response> {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserIdFromRequest(req);
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'GitHub OAuth not configured' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const state = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pledgeoff.com';
  const callbackUrl = `${appUrl}/api/auth/github/callback`;

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', clientId);
  githubUrl.searchParams.set('redirect_uri', callbackUrl);
  githubUrl.searchParams.set('scope', 'read:org repo');
  githubUrl.searchParams.set('state', state);

  const response = Response.redirect(githubUrl.toString(), 302);
  // HttpOnly cookie — state verified at callback to prevent CSRF
  response.headers.set(
    'Set-Cookie',
    `github_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  );
  return response;
}
