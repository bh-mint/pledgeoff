import { createClient } from '@supabase/supabase-js';
import { container } from '@/lib/container';
import { effectivePlan } from '@pledgeoff/core';

async function resolveUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await anonClient.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function GET(req: Request) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return Response.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication required' } },
      { status: 401, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const result = await container.getOrCreateSubscriptionUseCase.execute({ userId });
  if (result.isErr()) {
    return Response.json(
      { error: { code: 'INTERNAL', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Trace-Id': traceId } },
    );
  }

  const sub = result.value;
  return Response.json(
    {
      data: {
        plan: effectivePlan(sub),
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
    },
    { status: 200, headers: { 'X-Trace-Id': traceId } },
  );
}
