import { cookies } from 'next/headers';
import { container } from '@/lib/container';
import { resolveUserIdFromRequest } from '@/lib/api-auth';
import { logger } from '@pledgeoff/observability';

export const maxDuration = 60;

export async function GET(req: Request): Promise<Response> {
  const traceId = crypto.randomUUID();
  const url = new URL(req.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://pledgeoff.com';

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  if (errorParam) {
    logger.warn({ traceId, errorParam }, 'GitHub OAuth denied by user');
    return Response.redirect(`${appUrl}/settings?github=denied`, 302);
  }

  if (!code || !state) {
    return Response.redirect(`${appUrl}/settings?github=error`, 302);
  }

  // CSRF state verification
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get('github_oauth_state');
  if (!stateCookie || stateCookie.value !== state) {
    logger.warn({ traceId }, 'GitHub OAuth state mismatch — possible CSRF');
    return Response.redirect(`${appUrl}/settings?github=error`, 302);
  }

  // Resolve user from session cookie (this is a browser redirect, not API call)
  const supabaseSession = cookieStore.get('sb-access-token')?.value
    ?? cookieStore.get('sb-vayqlprmwtvwqfxdfygl-auth-token')?.value
    ?? cookieStore.get('sb-gphupxlfmeokquvyxqfw-auth-token')?.value;

  // Build a synthetic request with the session token for resolveUserIdFromRequest
  const syntheticReq = new Request(req.url, {
    headers: { Authorization: `Bearer ${supabaseSession ?? ''}` },
  });
  const userId = await resolveUserIdFromRequest(syntheticReq);
  if (!userId) {
    return Response.redirect(`${appUrl}/login`, 302);
  }

  // Exchange code for access token (server-side — secret never leaves server)
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    logger.error({ traceId }, 'GitHub OAuth env vars missing');
    return Response.redirect(`${appUrl}/settings?github=error`, 302);
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!tokenRes.ok) {
    logger.error({ traceId, status: tokenRes.status }, 'GitHub token exchange failed');
    return Response.redirect(`${appUrl}/settings?github=error`, 302);
  }

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    logger.error({ traceId, ghError: tokenData.error }, 'GitHub token exchange returned no token');
    return Response.redirect(`${appUrl}/settings?github=error`, 302);
  }

  // Fetch authenticated user's login to use as orgOrUser
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!userRes.ok) {
    logger.error({ traceId, status: userRes.status }, 'GitHub /user fetch failed after token exchange');
    return Response.redirect(`${appUrl}/settings?github=error`, 302);
  }

  const ghUser = await userRes.json() as { login: string };

  const result = await container.connectGitHubUseCase.execute({
    userId,
    orgOrUser: ghUser.login,
    accessToken: tokenData.access_token,
    traceId,
  });

  if (result.isErr()) {
    logger.error({ traceId, userId, error: result.error.message }, 'ConnectGitHubUseCase failed');
    return Response.redirect(`${appUrl}/settings?github=error`, 302);
  }

  logger.info({ traceId, userId, githubOrg: ghUser.login }, 'GitHub connected successfully');

  // Clear state cookie and redirect to settings
  const response = Response.redirect(`${appUrl}/settings?github=connected`, 302);
  response.headers.set(
    'Set-Cookie',
    'github_oauth_state=; Path=/; HttpOnly; Max-Age=0',
  );
  return response;
}
