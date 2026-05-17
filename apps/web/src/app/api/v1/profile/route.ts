import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { container } from "@/lib/container";

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const firstName = typeof body.first_name === "string" ? body.first_name.trim() : null;
  const lastName = typeof body.last_name === "string" ? body.last_name.trim() : null;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined;
  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : undefined;

  if (!firstName) {
    return NextResponse.json({ error: "first_name is required" }, { status: 400 });
  }

  if (username !== undefined && username !== "" && !/^[a-z0-9_-]{3,30}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–30 characters: letters, numbers, _ or -" },
      { status: 400 },
    );
  }

  const updatePayload: Record<string, string | null> = {
    first_name: firstName,
    last_name: lastName || null,
    updated_at: new Date().toISOString(),
  };
  if (username !== undefined) updatePayload.username = username || null;
  if (companyName !== undefined) updatePayload.company_name = companyName || null;

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
