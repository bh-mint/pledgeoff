import type { SupabaseClient } from '@supabase/supabase-js';

export async function getTeamSlackWebhook(
  userId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  // Check if user owns a team with a webhook
  const { data: ownedTeam } = await supabase
    .from('teams')
    .select('slack_webhook_url')
    .eq('owner_id', userId)
    .maybeSingle();

  if (ownedTeam?.slack_webhook_url) return ownedTeam.slack_webhook_url as string;

  // Check if user is a member of a team with a webhook
  const { data: membership } = await supabase
    .from('team_memberships')
    .select('team_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) return null;

  const { data: memberTeam } = await supabase
    .from('teams')
    .select('slack_webhook_url')
    .eq('id', membership.team_id)
    .maybeSingle();

  return (memberTeam?.slack_webhook_url as string | null) ?? null;
}
