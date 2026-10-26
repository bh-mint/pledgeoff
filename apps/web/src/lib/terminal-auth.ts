import 'server-only';
import { redirect } from 'next/navigation';
import { createSupabaseAuthClient } from './supabase/server';
import { isTerminalUser } from './terminal-policy';

export async function requireTerminalUser() {
  const supabase = await createSupabaseAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !isTerminalUser(user)) redirect('/login');
  return user!;
}
