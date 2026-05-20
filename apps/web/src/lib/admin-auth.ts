import { redirect } from 'next/navigation';
import { createSupabaseAuthClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { resolveUserId } from '@/lib/api-auth';

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim()).filter(Boolean);
}

/** Server Component: redirects if not admin */
export async function requireAdminServer(): Promise<{ userId: string; email: string }> {
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect('/login');

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email)) redirect('/dashboard');

  return { userId: user.id, email: user.email };
}

/** API route: returns userId if admin, null otherwise */
export async function requireAdminApi(req: Request): Promise<string | null> {
  const userId = await resolveUserId(req.headers.get('authorization'));
  if (!userId) return null;

  const { data } = await createSupabaseServiceClient().auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return null;

  const adminEmails = getAdminEmails();
  return adminEmails.includes(email) ? userId : null;
}
