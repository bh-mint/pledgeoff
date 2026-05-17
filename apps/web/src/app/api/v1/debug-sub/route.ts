import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

function decodeJwtPayload(jwt: string): Record<string, unknown> | string {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return "INVALID_JWT_FORMAT";
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch {
    return "DECODE_FAILED";
  }
}

export async function GET() {
  const user = await requireUser();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "MISSING";

  // Decode both keys to see their role claims
  const serviceRoleDecoded = serviceRoleKey !== "MISSING" ? decodeJwtPayload(serviceRoleKey) : "MISSING";
  const anonDecoded = anonKey !== "MISSING" ? decodeJwtPayload(anonKey) : "MISSING";

  // Client 1: explicit service_role key, no session, no cookies
  const srClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Client 2: explicit anon key (for comparison)
  const anonClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  // Query 1: subscriptions with service_role client
  const srSubResult = await srClient.from("subscriptions").select().eq("user_id", user.id).maybeSingle();

  // Query 2: auth.users — only accessible to service_role (not anon/authenticated)
  // If this works → client IS using service_role. If "permission denied" → client is NOT service_role.
  const srAuthResult = await srClient.from("users").select("id, email").eq("id", user.id).maybeSingle();

  // Query 3: same subscriptions query with anon client (expected: permission denied)
  const anonSubResult = await anonClient.from("subscriptions").select().eq("user_id", user.id).maybeSingle();

  return NextResponse.json({
    "1_DB_URL": url,
    "2_SR_KEY_JWT_CLAIMS": serviceRoleDecoded,
    "3_ANON_KEY_JWT_CLAIMS": anonDecoded,
    "4_USER_ID": user.id,
    "5_USER_EMAIL": user.email,
    "6_SR_CLIENT_subscriptions": {
      found: srSubResult.data !== null,
      row: srSubResult.data,
      error: srSubResult.error?.message ?? null,
      note: "service_role bypasses RLS — if permission_denied here, JWT is NOT service_role",
    },
    "7_SR_CLIENT_auth_users": {
      found: srAuthResult.data !== null,
      row: srAuthResult.data,
      error: srAuthResult.error?.message ?? null,
      note: "auth.users accessible ONLY to service_role — if works, confirms SR is active",
    },
    "8_ANON_CLIENT_subscriptions": {
      found: anonSubResult.data !== null,
      error: anonSubResult.error?.message ?? null,
      note: "anon client — expected to fail with permission_denied",
    },
  });
}
