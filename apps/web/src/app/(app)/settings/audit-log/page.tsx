import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-server";
import { getUserPlan } from "@/server/billing/getUserPlan";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { AuditLogSection } from "../AuditLogSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Activity Log — PledgeOFF" },
  robots: { index: false, follow: false },
};

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export default async function AuditLogPage() {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);

  if (plan !== "studio" && plan !== "enterprise") {
    return (
      <div>
        <h1
          className="display text-[28px] font-semibold tracking-tight mb-1"
          style={{ color: "var(--t1)" }}
        >
          Activity Log
        </h1>
        <p className="text-[13px] mb-8" style={{ color: "var(--t2)" }}>
          Available on Studio and Enterprise plans.
        </p>
      </div>
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, action, resource_type, resource_id, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const entries = (data ?? []) as AuditRow[];

  return <AuditLogSection entries={entries} />;
}
