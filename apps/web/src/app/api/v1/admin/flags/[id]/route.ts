import { requireAdminApi } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { z } from 'zod';

const PatchSchema = z.object({
  enabled_globally: z.boolean().optional(),
  enabled_user_ids: z.array(z.string().uuid()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from('feature_flags')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return Response.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  return Response.json({ ok: true }, { headers: { 'X-Trace-Id': traceId } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from('feature_flags').delete().eq('id', id);

  if (error) return Response.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  return new Response(null, { status: 204, headers: { 'X-Trace-Id': traceId } });
}
