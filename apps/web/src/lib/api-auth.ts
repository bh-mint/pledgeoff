import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { container } from '@/lib/container';

/**
 * Resolves userId from either Bearer JWT or X-API-Key header.
 * Pass (authHeader, apiKeyHeader) for explicit values,
 * or use resolveUserIdFromRequest(req) for convenience.
 */
export async function resolveUserId(authHeader: string | null, apiKeyHeader?: string | null): Promise<string | null> {
  if (apiKeyHeader?.startsWith('po_live_')) {
    return resolveUserIdFromApiKey(apiKeyHeader);
  }

  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data } = await createSupabaseServiceClient().auth.getUser(authHeader.slice(7));
  return data.user?.id ?? null;
}

/**
 * Convenience: reads both Authorization and X-API-Key from a Request object.
 * Use this in new routes; existing routes that pass authHeader directly still work.
 */
export async function resolveUserIdFromRequest(req: Request): Promise<string | null> {
  return resolveUserId(
    req.headers.get('authorization'),
    req.headers.get('x-api-key'),
  );
}

// ── JWT-only auth (FIX-8) ──────────────────────────────────────────────────

export type ResolvedAuth =
  | { ok: true; userId: string; method: 'jwt' | 'api_key' }
  | { ok: false; reason: 'unauthenticated' | 'api_key_not_allowed' };

/**
 * Resolves auth and explicitly rejects API key auth with a distinct result.
 * Use on billing/teams/api-keys routes for defense-in-depth.
 * Middleware already blocks these paths at the edge; this adds route-level signalling.
 */
export async function requireJwtAuth(req: Request): Promise<ResolvedAuth> {
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader?.startsWith('po_live_')) {
    return { ok: false, reason: 'api_key_not_allowed' };
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, reason: 'unauthenticated' };
  }

  const { data } = await createSupabaseServiceClient().auth.getUser(authHeader.slice(7));
  const userId = data.user?.id;
  if (!userId) return { ok: false, reason: 'unauthenticated' };

  return { ok: true, userId, method: 'jwt' };
}

/**
 * Maps a failed ResolvedAuth to the appropriate HTTP response.
 * - api_key_not_allowed → 403
 * - unauthenticated → 401
 */
export function jwtAuthErrorResponse(
  result: Extract<ResolvedAuth, { ok: false }>,
  traceId: string,
): Response {
  if (result.reason === 'api_key_not_allowed') {
    return Response.json(
      {
        error: {
          code: 'API_KEY_NOT_ALLOWED',
          message: 'This endpoint requires JWT authentication. API keys are not permitted on billing, team, or API key management routes.',
        },
      },
      { status: 403, headers: { 'X-Trace-Id': traceId } },
    );
  }
  return Response.json(
    { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
    { status: 401, headers: { 'X-Trace-Id': traceId } },
  );
}

async function resolveUserIdFromApiKey(plaintext: string): Promise<string | null> {
  const keyHash = await hashKey(plaintext);
  const result = await container.apiKeyRepo.findByHash(keyHash);
  if (result.isErr() || !result.value) return null;

  const apiKey = result.value;
  void container.apiKeyRepo.updateLastUsed(apiKey.id);

  return apiKey.userId;
}

async function hashKey(plaintext: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
