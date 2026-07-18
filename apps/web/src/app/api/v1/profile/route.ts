import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/server";
import { container } from "@/lib/container";

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;
  const hasFirstName = "first_name" in body;
  const firstName = hasFirstName && typeof body.first_name === "string" ? body.first_name.trim() : undefined;
  const lastName = typeof body.last_name === "string" ? body.last_name.trim() : undefined;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined;
  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : undefined;
  const role = typeof body.role === "string" ? body.role : undefined;
  const marketingEmailsConsent = typeof body.marketing_emails_consent === "boolean" ? body.marketing_emails_consent : undefined;
  const isProfilePublic = typeof body.is_profile_public === "boolean" ? body.is_profile_public : undefined;

  if (hasFirstName && !firstName) {
    return NextResponse.json({ error: "first_name is required" }, { status: 400 });
  }

  if (username !== undefined && username !== "" && !/^[a-z0-9_-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–30 characters: letters, numbers, _ or -" },
      { status: 400 },
    );
  }

  if (role !== undefined && !["indie", "pm", "agency"].includes(role)) {
    return NextResponse.json({ error: "Invalid role value" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, string | boolean | null> = {
    updated_at: now,
  };
  if (firstName !== undefined) updatePayload.first_name = firstName;
  if (lastName !== undefined) updatePayload.last_name = lastName || null;
  if (username !== undefined) updatePayload.username = username || null;
  if (companyName !== undefined) updatePayload.company_name = companyName || null;
  if (role !== undefined) updatePayload.role = role;
  if (marketingEmailsConsent !== undefined) {
    updatePayload.marketing_emails_consent = marketingEmailsConsent;
    updatePayload.marketing_emails_consented_at = marketingEmailsConsent ? now : null;
  }
  if (isProfilePublic !== undefined) updatePayload.is_profile_public = isProfilePublic;

  if (Object.keys(updatePayload).length === 1) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    const msg = error.code === "23505"
      ? "Username is already taken."
      : error.message;
    return NextResponse.json({ error: msg }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();
  const supabase = await createSupabaseAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  void container.auditLog.log({
    userId: user.id,
    action: 'account_delete_requested',
    resourceType: 'account',
    resourceId: user.id,
    metadata: { email: user.email },
    traceId,
  });

  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
