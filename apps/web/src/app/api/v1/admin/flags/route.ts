import { requireAdminApi } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { z } from 'zod';

const CreateSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/),
  description: z.string().default(''),
});

export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const adminId = await requireAdminApi(req);
  if (!adminId) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: { code: 'VALIDATION_FAILED' } }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from('feature_flags')
    .insert({ key: parsed.data.key, description: parsed.data.description })
    .select()
    .single();

  if (error) return Response.json({ error: { code: 'INTERNAL', message: error.message } }, { status: 500 });
  return Response.json({ data }, { status: 201, headers: { 'X-Trace-Id': traceId } });
}
