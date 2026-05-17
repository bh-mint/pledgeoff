import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

async function rawFetch(url: string, key: string): Promise<{ status: number; body: unknown }> {
  const r = await fetch(url, {
    headers: { "Authorization": `Bearer ${key}`, "apikey": key },
  });
  const body = await r.json().catch(() => r.text());
  return { status: r.status, body };
}

export async function GET() {
  const user = await requireUser();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const srKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";

  // ── Test A: raw fetch pe subscriptions (acelasi key, zero Supabase client) ──
  const rawSub = await rawFetch(
    `${url}/rest/v1/subscriptions?user_id=eq.${user.id}&select=*`,
    srKey
  );

  // ── Test B: raw fetch pe ideas (tabel pe care service_role STIM ca merge) ──
  const rawIdeas = await rawFetch(
    `${url}/rest/v1/ideas?user_id=eq.${user.id}&select=id,created_at&limit=1`,
    srKey
  );

  // ── Test C: raw fetch pe profiles (alt tabel neproblematic) ──
  const rawProfiles = await rawFetch(
    `${url}/rest/v1/profiles?id=eq.${user.id}&select=id`,
    srKey
  );

  // ── Test D: createClient standard vs createClient cu global headers explicit ──
  const clientStandard = createClient(url, srKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const clientExplicitHeaders = createClient(url, srKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${srKey}`, apikey: srKey } },
  });

  const stdResult = await clientStandard.from("subscriptions").select().eq("user_id", user.id).maybeSingle();
  const explResult = await clientExplicitHeaders.from("subscriptions").select().eq("user_id", user.id).maybeSingle();

  // ── Test E: auth.admin (real admin path) — list users ──
  const adminResult = await clientStandard.auth.admin.getUserById(user.id);

  return NextResponse.json({
    "USER_ID": user.id,
    "A_RAW_FETCH_subscriptions": { status: rawSub.status, body: rawSub.body },
    "B_RAW_FETCH_ideas": { status: rawIdeas.status, body: rawIdeas.body },
    "C_RAW_FETCH_profiles": { status: rawProfiles.status, body: rawProfiles.body },
    "D1_SDK_standard_subscriptions": { error: stdResult.error?.message ?? null, found: stdResult.data !== null },
    "D2_SDK_explicit_headers_subscriptions": { error: explResult.error?.message ?? null, found: explResult.data !== null },
    "E_AUTH_ADMIN_getUserById": {
      found: adminResult.data?.user !== null,
      error: adminResult.error?.message ?? null,
      note: "auth.admin works ONLY with valid service_role key",
    },
    "VERDICT": rawIdeas.status === 200 && rawSub.status === 403
      ? "GRANT ISSUE — service_role client works (ideas ok) dar subscriptions lipseste GRANT SELECT"
      : rawIdeas.status === 403 && rawSub.status === 403
      ? "CLIENT ISSUE — service_role key nu este recunoscut corect (ambele tabele refuzate)"
      : `ALTCEVA — ideas:${rawIdeas.status} subscriptions:${rawSub.status}`,
  });
}
