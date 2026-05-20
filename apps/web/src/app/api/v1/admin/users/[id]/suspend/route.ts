import { requireAdminApi } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase.auth.admin.updateUserById(id, {
    ban_duration: '876600h', // 100 years
  });

  if (error) return Response.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  return Response.json({ ok: true }, { headers: { 'X-Trace-Id': traceId } });
}
