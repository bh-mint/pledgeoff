import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function GET(): Promise<Response> {
  const start = Date.now();

  try {
    const svc = createSupabaseServiceClient();
    await svc.from('profiles').select('id').limit(1).single();

    return Response.json({
      status: 'ok',
      db: 'ok',
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch {
    return Response.json({
      status: 'degraded',
      db: 'error',
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    }, { status: 503 });
  }
}
