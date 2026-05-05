"use client";

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/components/GoogleAnalytics";

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: string;
}

export function WaitlistModal({
  isOpen,
  onClose,
  source = "unknown",
}: WaitlistModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      trackEvent("waitlist_signup", { source });
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-(--surface) border border-(--border) rounded-lg p-8 fade-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-(--t3) hover:text-(--t2) transition-colors text-xl leading-none"
        >
          ×
        </button>

        {status === "success" ? (
          <div className="text-center py-4 fade-up">
            <div className="w-12 h-12 rounded-full bg-(--validated)/10 border border-(--validated)/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-(--validated) text-xl">✓</span>
            </div>
            <h2 className="display text-[22px] font-bold text-(--t1) mb-3">
              You&apos;re on the list.
            </h2>
            <p className="text-[14px] text-(--t2) leading-relaxed mb-6">
              Check your inbox — we sent a confirmation.
              <br />
              You&apos;ll hear from us within 2 weeks.
            </p>
            <Link
              href="/blog"
              className="text-[13px] text-(--accent) hover:opacity-80 transition-opacity"
            >
              In the meantime, read the blog →
            </Link>
          </div>
        ) : (
          <>
            <h2 className="display text-[22px] font-bold text-(--t1) mb-2">
              Get early access.
            </h2>
            <p className="text-[14px] text-(--t2) leading-relaxed mb-6">
              PledgeOFF is in private beta. Drop your email and
              we&apos;ll let you in as soon as your spot opens up.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-11 px-4 rounded-md bg-(--canvas) border border-(--border) text-[14px] text-(--t1) placeholder-(--t3) focus:outline-none focus:border-(--accent) transition-colors"
              />

              {errorMsg && (
                <p className="text-[12px] text-(--kill)">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="display w-full h-11 rounded-md bg-(--accent) text-black text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {status === "loading" ? "Sending…" : "Secure my spot →"}
              </button>
            </form>

            <p className="text-[11px] mono text-(--t3) text-center mt-4 uppercase tracking-[0.08em]">
              No spam · Unsubscribe anytime · ~2 week wait
            </p>
          </>
        )}
      </div>
    </div>
  );
}
