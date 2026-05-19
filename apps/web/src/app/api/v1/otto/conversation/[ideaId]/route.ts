import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { logger } from '@pledgeoff/observability';
import { resolveUserId } from '@/lib/api-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ ideaId: string }> }) {
  const traceId = req.headers.get('x-trace-id') ?? crypto.randomUUID();
  const { ideaId } = await params;

  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) {
    return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401, headers: { 'X-Trace-Id': traceId } });
  }

  const supabase = createSupabaseServiceClient();
  const { data: conv, error } = await supabase
    .from('otto_conversations')
    .select()
    .eq('user_id', userId)
    .eq('idea_id', ideaId)
    .maybeSingle();

  if (error) {
    logger.error({ traceId, userId, ideaId, error: error.message }, 'Failed to fetch Otto conversation');
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500, headers: { 'X-Trace-Id': traceId } });
  }

  return NextResponse.json({ data: conv ?? null }, { status: 200, headers: { 'X-Trace-Id': traceId } });
}
