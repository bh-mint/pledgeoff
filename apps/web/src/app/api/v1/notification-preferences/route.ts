import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseAuthClient } from '@/lib/supabase/server';

const NotificationPrefsSchema = z.object({
  accuracy_report: z.boolean().optional(),
  queue_alerts: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
  signal_feed: z.boolean().optional(),
  score: z.boolean().optional(),
  movement_alerts: z.boolean().optional(),
});

export async function GET() {
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data.notification_preferences ?? {} });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = NotificationPrefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .single();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const merged = { ...(existing.notification_preferences as Record<string, boolean> ?? {}), ...parsed.data };

  const { error } = await supabase
    .from('profiles')
    .update({ notification_preferences: merged, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: merged });
}
