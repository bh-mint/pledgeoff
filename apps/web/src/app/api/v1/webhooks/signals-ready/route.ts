// DEPRECATED: Pipeline is driven by after() in ideas/route.ts (primary) + process-outbox cron (safety net).
// This webhook route is no longer active. If wired in Supabase dashboard, remove the webhook.
export async function POST() {
  return Response.json({ ok: true, deprecated: true }, { status: 200 });
}
