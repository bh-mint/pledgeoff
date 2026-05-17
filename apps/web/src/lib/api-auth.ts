import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data } = await createSupabaseServiceClient().auth.getUser(authHeader.slice(7));
  return data.user?.id ?? null;
}
