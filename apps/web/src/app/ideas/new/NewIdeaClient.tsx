"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

const CATEGORIES = ["SaaS", "Consumer", "Marketplace", "Hardware", "Service", "Other"] as const;

export function NewIdeaClient({ validationsLeft }: { validationsLeft: number }) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const titleOk = title.trim().length >= 8;
  const descOk = desc.trim().length >= 24;
  const valid = titleOk && descOk && cat !== null;

  // Ambient warmth grows as the user fills in the title
  const warmth = Math.min(1, title.length / 40);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const text = cat
      ? `${title.trim()}\n\n${desc.trim()}\n\nCategory: ${cat}`
      : `${title.trim()}\n\n${desc.trim()}`;

    const res = await fetch("/api/v1/ideas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text }),
    });

    const json = await res.json();

    if (!res.ok) {
      setErrorMsg(json.error?.message ?? "Something went wrong. Try again.");
      setStatus("error");
      return;
    }

    router.push(`/ideas/${json.data.id}`);
  };

  const charPct = Math.min(1, desc.length / 300);

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ background: "var(--canvas)" }}
    >
      {/* Ambient warming gradient — grows with title input */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgba(214,255,61,${0.04 + warmth * 0.10}) 0%, transparent 60%)`,
          transition: "background 800ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 70% 80%, rgba(125,214,107,${warmth * 0.06}) 0%, transparent 55%)`,
          transition: "background 800ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />

      {/* Minimal top bar */}
      <div className="relative px-4 sm:px-10 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-(--t1)"
            aria-label="PledgeOFF home"
          >
            <Logo size={22} />
            <span className="display text-[15px] font-semibold tracking-tight">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
          </Link>
          <Link
            href="/dashboard"
            className="mono text-[11px] transition-colors"
            style={{ color: "var(--t3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t1)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--t3)")}
          >
            ← Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <span className="mono text-[10px] sm:text-[11px] text-(--t3)">
            {validationsLeft} left
          </span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="relative flex-1 flex items-start"
      >
        <div className="max-w-[760px] w-full mx-auto px-4 sm:px-10 py-8 sm:py-12">
          <div
            className="mono text-[10px] uppercase tracking-[0.14em] mb-4"
            style={{ color: "var(--t3)" }}
          >
            step 01 · idea validator
          </div>

          {/* Q1 — idea */}
          <label className="block">
            <div
              className="display text-[28px] sm:text-[44px] font-semibold tracking-tight leading-[1.05] mb-4"
              style={{ color: "var(--t1)" }}
            >
              What&apos;s the idea?
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AI-powered meal planner that adapts to your gym schedule"
              className="w-full bg-transparent outline-none border-b pb-3 display text-[18px] sm:text-[22px] font-semibold tracking-tight"
              style={{
                borderColor: title ? "var(--accent)" : "var(--border)",
                color: "var(--t1)",
                transition: "border-color 400ms",
              }}
            />
            <div className="mt-2 flex justify-between mono text-[10px]">
              <span
                style={{ color: titleOk ? "var(--validated)" : "var(--t3)" }}
              >
                {titleOk ? "✓ clear" : "8 chars min"}
              </span>
              <span className="tnum" style={{ color: "var(--t3)" }}>
                {title.length}
              </span>
            </div>
          </label>

          {/* Q2 — description */}
          <label className="block mt-12">
            <div
              className="display text-[20px] font-semibold tracking-tight mb-3"
              style={{ color: "var(--t1)" }}
            >
              Describe it in 1–2 sentences.
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Who it's for, what it does, why it's different. Be specific — vague briefs validate poorly."
              className="w-full bg-transparent outline-none border rounded-md p-4 text-[14px] leading-[1.6] resize-none"
              style={{ borderColor: "var(--border)", color: "var(--t1)" }}
            />
            <div className="mt-2 flex justify-between mono text-[10px]">
              <span
                style={{ color: descOk ? "var(--validated)" : "var(--t3)" }}
              >
                {descOk ? "✓ enough context" : "add a sentence of context"}
              </span>
              <span
                className="tnum"
                style={{
                  color: charPct > 0.9 ? "var(--caution)" : "var(--t3)",
                }}
              >
                {desc.length} / 300
              </span>
            </div>
          </label>

          {/* Q3 — category */}
          <div className="mt-12">
            <div
              className="display text-[20px] font-semibold tracking-tight mb-3"
              style={{ color: "var(--t1)" }}
            >
              Category.
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = cat === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCat(c)}
                    className="text-[13px] px-4 h-9 rounded-md border transition-all"
                    style={{
                      borderColor: active ? "var(--accent)" : "var(--border)",
                      background: active
                        ? "rgba(214,255,61,0.08)"
                        : "transparent",
                      color: active ? "var(--accent)" : "var(--t2)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Context panel */}
          <div
            className="mt-12 border rounded-md p-4 flex items-center justify-between"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="flex items-center gap-4">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0 pulse-dot"
                style={{ background: "var(--accent)" }}
              />
              <span className="text-[12px]" style={{ color: "var(--t2)" }}>
                We&apos;ll scrape{" "}
                <span style={{ color: "var(--t1)" }}>Reddit</span>,{" "}
                <span style={{ color: "var(--t1)" }}>Google Trends</span>, and
                analyze{" "}
                <span style={{ color: "var(--t1)" }}>competitors</span>.
              </span>
            </div>
            <span
              className="mono text-[11px] tnum flex-shrink-0"
              style={{ color: "var(--t3)" }}
            >
              <60s
            </span>
          </div>

          {/* Error */}
          {errorMsg && (
            <p className="mt-4 text-[12px] text-(--kill)">{errorMsg}</p>
          )}

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={!valid || status === "loading"}
              className="display text-[14px] font-semibold px-6 h-12 rounded-md flex items-center justify-center gap-2 transition-all"
              style={{
                background: valid ? "var(--accent)" : "var(--surface)",
                color: valid ? "#000" : "var(--t3)",
                border: valid ? "none" : "1px solid var(--border)",
                cursor: valid ? "pointer" : "not-allowed",
              }}
            >
              {status === "loading" ? "Analyzing…" : "Validate →"}
            </button>

            {!valid && (
              <span
                className="mono text-[11px]"
                style={{ color: "var(--t3)" }}
              >
                {!titleOk
                  ? "type your idea"
                  : !descOk
                  ? "add a description"
                  : "pick a category"}
              </span>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
