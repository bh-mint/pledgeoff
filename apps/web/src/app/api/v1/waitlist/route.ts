import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const WaitlistSchema = z.object({
  email: z.string().email(),
  source: z.string().max(100).default("unknown"),
});

export async function POST(req: NextRequest) {
  const traceId = req.headers.get("x-trace-id") ?? crypto.randomUUID();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: { "X-Trace-Id": traceId } }
    );
  }

  const parsed = WaitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400, headers: { "X-Trace-Id": traceId } }
    );
  }

  const { email, source } = parsed.data;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("waitlist")
    .upsert({ email, source }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error({ traceId, msg: "waitlist_insert_error", error: error.message });
    return NextResponse.json(
      { error: "Failed to save. Please try again." },
      { status: 500, headers: { "X-Trace-Id": traceId } }
    );
  }

  // Send confirmation email via Resend if configured
  if (process.env.RESEND_API_KEY) {
    await sendConfirmationEmail(email, traceId);
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "X-Trace-Id": traceId } }
  );
}

async function sendConfirmationEmail(email: string, traceId: string) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PledgeOFF <hello@pledgeoff.com>",
        to: email,
        subject: "You're on the list.",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#e8e8e8;background:#0a0a0a;">
            <h1 style="font-size:22px;font-weight:700;color:#f5f5f5;margin-bottom:12px;">You're in.</h1>
            <p style="font-size:14px;color:#a3a3a3;line-height:1.6;margin-bottom:24px;">
              We'll let you know as soon as your spot opens up. In the meantime, read the blog — every article is a decision framework used by founders who ship.
            </p>
            <a href="https://pledgeoff.com/blog" style="display:inline-block;background:#caff47;color:#000;padding:10px 20px;border-radius:6px;font-weight:600;font-size:13px;text-decoration:none;">
              Read the blog →
            </a>
            <p style="font-size:11px;color:#525252;margin-top:32px;">
              You're receiving this because you signed up at pledgeoff.com.<br/>
              <a href="https://pledgeoff.com" style="color:#525252;">Unsubscribe</a>
            </p>
          </div>
        `,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error({ traceId, msg: "resend_error", status: res.status, err });
    }
  } catch (e) {
    console.error({ traceId, msg: "resend_timeout", error: String(e) });
  }
}
