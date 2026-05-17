import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { container } from "@/lib/container";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : null;
  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : undefined;

  if (!fullName) {
    return NextResponse.json({ error: "full_name is required" }, { status: 400 });
  }

  const updatePayload: Record<string, string | null> = { full_name: fullName, updated_at: new Date().toISOString() };
  if (companyName !== undefined) updatePayload.company_name = companyName || null;

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();
  const supabase = await createClient();
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
