import { requireAdminServer } from '@/lib/admin-auth';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { FlagManager } from './FlagManager';

type FeatureFlag = {
  id: string;
  key: string;
  description: string;
  enabled_globally: boolean;
  enabled_user_ids: string[];
  created_at: string;
  updated_at: string;
};

export default async function FlagsPage() {
  await requireAdminServer();
  const supabase = createSupabaseServiceClient();

  const { data: flags } = await supabase
    .from('feature_flags')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<FeatureFlag[]>();

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 4, fontFamily: '"Inter Tight", system-ui' }}>Feature flags</h1>
      <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>Toggle features globally or per specific users.</p>
      <FlagManager flags={flags ?? []} />
    </div>
  );
}
