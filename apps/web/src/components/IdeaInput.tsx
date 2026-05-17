"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN = 10;
const MAX = 2000;

export function IdeaInput() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const chars = text.trim().length;
  const valid = chars >= MIN && chars <= MAX;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setStatus("loading");
    setErrorMsg("");

    const supabase = createSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const res = await fetch("/api/v1/ideas", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text: text.trim() }),
    });

    const json = await res.json();

    if (!res.ok) {
      setErrorMsg(json.error?.message ?? "Something went wrong. Try again.");
      setStatus("error");
      return;
    }

    router.push(`/ideas/${json.data.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your idea. What problem does it solve? Who has this problem? Be specific — the more context, the better the verdict."
          rows={6}
          maxLength={MAX}
          className="w-full px-4 py-3 rounded-md bg-(--canvas) border border-(--border) text-[14px] text-(--t1) placeholder-(--t3) focus:outline-none focus:border-(--accent) transition-colors resize-none leading-relaxed"
        />
        <span
          className={`absolute bottom-3 right-3 mono text-[11px] ${
            chars > MAX * 0.9
              ? "text-(--kill)"
              : chars >= MIN
              ? "text-(--validated)"
              : "text-(--t3)"
          }`}
        >
          {chars}/{MAX}
        </span>
      </div>

      {errorMsg && (
        <p className="text-[12px] text-(--kill)">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={!valid || status === "loading"}
        className="display w-full h-12 rounded-md bg-(--accent) text-black text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {status === "loading" ? "Analyzing…" : "Get verdict →"}
      </button>

      <p className="mono text-[11px] text-(--t3) text-center uppercase tracking-[0.08em]">
        {MIN} – {MAX} characters · Takes under 60 seconds
      </p>
    </form>
  );
}
