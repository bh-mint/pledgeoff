import { requireAdminApi } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { z } from 'zod';

const Schema = z.object({
  plan: z.enum(['free', 'pro', 'pro_plus', 'agency']),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id } = await params;
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('subscriptions')
    .upsert({ user_id: id, plan: parsed.data.plan, status: 'active' }, { onConflict: 'user_id' });

  if (error) return Response.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  return Response.json({ ok: true }, { headers: { 'X-Trace-Id': traceId } });
}
