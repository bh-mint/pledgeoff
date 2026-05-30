import { container } from '@/lib/container';
import { resolveUserId } from '@/lib/api-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

// POST /api/v1/teams/auto-join
// Idempotent: checks user's email domain against team allowlists, auto-joins if match found.
export async function POST(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const supabase = createSupabaseServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single<{ email: string }>();

  if (!profile?.email) {
    return Response.json({ data: { joined: false } }, { headers: { 'X-Trace-Id': traceId } });
  }

  const result = await container.autoJoinByDomainUseCase.execute({
    userId,
    email: profile.email,
    traceId,
  });

  if (result.isErr()) {
    return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return Response.json({ data: result.value }, { headers: { 'X-Trace-Id': traceId } });
}
