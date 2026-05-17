import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-server";
import { container } from "@/lib/container";
import { effectivePlan } from "@pledgeoff/core";
import { createServiceRoleClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const svcClient = createServiceRoleClient();

  // Query direct (fara container)
  const { data: directRow, error: directErr } = await svcClient
    .from("subscriptions")
    .select()
    .eq("user_id", user.id)
    .maybeSingle();

  // Query via container
  const subResult = await container._repos.subscriptionRepo.findByUserId(user.id);

  return NextResponse.json({
    userId: user.id,
    direct: {
      row: directRow,
      error: directErr?.message ?? null,
    },
    container: {
      isOk: subResult.isOk(),
      isErr: subResult.isErr(),
      value: subResult.isOk() ? subResult.value : null,
      error: subResult.isErr() ? String(subResult.error) : null,
    },
    effectivePlan: subResult.isOk() && subResult.value ? effectivePlan(subResult.value) : "free",
  });
}
