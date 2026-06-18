import { requireAdminServer } from "@/lib/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { FlagManager } from "./FlagManager";

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
    .from("feature_flags")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<FeatureFlag[]>();

  return <FlagManager flags={flags ?? []} />;
}
