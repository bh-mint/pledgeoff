import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth-server";
import { effectivePlan } from "@pledgeoff/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";

  const client = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await client
    .from("subscriptions")
    .select()
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = data ? effectivePlan({
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    plan: data.plan,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }) : "free";

  return NextResponse.json({
    DB_USED_ACTUALLY: url,
    KEY_PREFIX: key === "MISSING" ? "MISSING" : key.slice(0, 40) + "...",
    USER_ID_USED: user.id,
    USER_EMAIL: user.email,
    SUBSCRIPTION_ROW_FOUND: data !== null,
    RAW_ROW: data,
    DB_ERROR: error?.message ?? null,
    PLAN_CALCULATED: plan,
  });
}
