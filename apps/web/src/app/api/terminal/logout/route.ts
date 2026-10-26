import { NextResponse } from 'next/server';
import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { isTerminalUser, sameOrigin } from '@/lib/terminal-policy';

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Request rejected.' }, { status: 403 });
  const supabase = await createSupabaseAuthClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !isTerminalUser(user)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) return NextResponse.json({ error: 'Unable to sign out. Try again.' }, { status: 503 });
  return NextResponse.json({ ok: true });
}
