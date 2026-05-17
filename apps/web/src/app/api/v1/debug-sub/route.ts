import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";
  const srKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "MISSING";

  // ── 1. Raw HTTP request to PostgREST — zero abstraction layer ──────────
  const postgrestUrl = `${url}/rest/v1/subscriptions?user_id=eq.${user.id}&select=*`;
  const authHeaderSent = `Bearer ${srKey.slice(0, 30)}[...${srKey.length - 30} chars omitted]`;

  const rawResp = await fetch(postgrestUrl, {
    headers: {
      "Authorization": `Bearer ${srKey}`,
      "apikey": srKey,
      "Content-Type": "application/json",
    },
  });

  const rawBody = await rawResp.json().catch(() => rawResp.text());
  const responseHeaders: Record<string, string> = {};
  rawResp.headers.forEach((v, k) => { responseHeaders[k] = v; });

  // ── 2. Supabase client — getSession() before query ──────────────────────
  const srClient = createClient(url, srKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: sessionData } = await srClient.auth.getSession();
  const clientSession = sessionData?.session;

  const clientResult = await srClient
    .from("subscriptions")
    .select()
    .eq("user_id", user.id)
    .maybeSingle();

  // ── 3. Probe: what role does PostgREST assign to this key? ──────────────
  // PostgREST exposes current_role via a direct SQL probe through the /rpc route
  // We test by querying auth schema (only accessible to service_role via PostgREST)
  const authSchemaProbe = await fetch(`${url}/rest/v1/rpc/version`, {
    headers: { "Authorization": `Bearer ${srKey}`, "apikey": srKey },
  });
  const authProbeStatus = authSchemaProbe.status;

  return NextResponse.json({
    "A_REQUEST_TYPE": "PostgREST REST API (not direct SQL)",
    "B_EXACT_URL": postgrestUrl,
    "C_AUTHORIZATION_HEADER_SENT": authHeaderSent,
    "D_APIKEY_HEADER_SENT": `${srKey.slice(0, 30)}[...omitted]`,
    "E_HTTP_STATUS": rawResp.status,
    "F_RESPONSE_BODY": rawBody,
    "G_RESPONSE_HEADERS": {
      "content-type": responseHeaders["content-type"] ?? null,
      "x-request-id": responseHeaders["x-request-id"] ?? null,
    },
    "H_SESSION_BEFORE_QUERY": clientSession
      ? { role: "authenticated user session active", userId: clientSession.user?.id }
      : "NO SESSION (correct for service_role client)",
    "I_SUPABASE_CLIENT_RESULT": {
      error: clientResult.error?.message ?? null,
      found: clientResult.data !== null,
    },
    "J_REQUEST_ROLE_AS_SEEN_BY_SUPABASE_EDGE":
      rawResp.status === 200
        ? "service_role (SELECT worked)"
        : rawResp.status === 401
        ? "UNAUTHORIZED — JWT rejected"
        : `DENIED (HTTP ${rawResp.status}) — role resolved to anon or authenticated, not service_role`,
    "K_VERSION_RPC_STATUS": authProbeStatus,
  });
}
