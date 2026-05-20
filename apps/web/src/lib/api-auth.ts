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
