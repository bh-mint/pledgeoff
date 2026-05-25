"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function EnterpriseContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/enterprise/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, companySize }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="border rounded-md p-8 text-center"
        style={{ borderColor: "color-mix(in srgb, var(--validated) 30%, transparent)", background: "color-mix(in srgb, var(--validated) 5%, transparent)" }}
      >
        <div className="display text-[18px] font-semibold mb-2" style={{ color: "var(--validated)" }}>
          Message sent.
        </div>
        <p className="text-[13px]" style={{ color: "var(--t2)" }}>
          We&apos;ll get back to you within 4 hours, weekdays.
        </p>
      </div>
    );
  }

  return (
    <form
      id="contact"
      onSubmit={handleSubmit}
      className="border rounded-md p-6 sm:p-8 flex flex-col gap-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="display text-[18px] font-semibold mb-1" style={{ color: "var(--t1)" }}>
        Get in touch
      </div>
      <p className="text-[13px] mb-2" style={{ color: "var(--t2)" }}>
        We respond within 4 hours, weekdays. No sales call if you don&apos;t want one.
      </p>

      <div className="flex flex-col gap-1">
        <label className="mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--t3)" }}>
          Your name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace"
          className="h-10 px-3 rounded-md border bg-transparent text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          aria-label="Your name"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--t3)" }}>
          Work email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ada@example.com"
          className="h-10 px-3 rounded-md border bg-transparent text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
          style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          aria-label="Work email"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "var(--t3)" }}>
          Team size
        </label>
        <select
          required
          value={companySize}
          onChange={(e) => setCompanySize(e.target.value)}
          className="h-10 px-3 rounded-md border bg-transparent text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
          style={{ borderColor: "var(--border)", color: companySize ? "var(--t1)" : "var(--t3)" }}
          aria-label="Team size"
        >
          <option value="" disabled>Select team size</option>
          <option value="1-10">1–10 people</option>
          <option value="10-50">10–50 people</option>
          <option value="50-200">50–200 people</option>
          <option value="200+">200+ people</option>
        </select>
      </div>

      {status === "error" && (
        <p className="mono text-[11px]" style={{ color: "var(--kill)" }}>
          Something went wrong. Email us directly at hello@pledgeoff.com
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="display text-[13px] font-semibold h-10 rounded-md flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-60 mt-1"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {status === "loading" ? "Sending…" : "Send message →"}
      </button>
    </form>
  );
}
