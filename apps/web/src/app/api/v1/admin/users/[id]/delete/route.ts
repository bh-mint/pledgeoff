import { requireAdminApi } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const { id } = await params;
  if (id === adminId) return Response.json({ error: { code: 'FORBIDDEN', message: 'Cannot delete yourself' } }, { status: 403 });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(id);

  if (error) return Response.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  return Response.json({ ok: true }, { headers: { 'X-Trace-Id': traceId } });
}
