"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const SUBJECTS = [
  "General question",
  "Billing & payments",
  "Technical issue",
  "Partnership",
  "Press & media",
  "Other",
];

export function ContactClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="border rounded-md p-10 text-center"
        style={{
          borderColor: "color-mix(in srgb, var(--validated) 30%, transparent)",
          background: "color-mix(in srgb, var(--validated) 5%, transparent)",
        }}
      >
        <div
          className="display text-[20px] font-semibold mb-2"
          style={{ color: "var(--validated)" }}
        >
          Message received.
        </div>
        <p className="text-[13px]" style={{ color: "var(--t2)" }}>
          We reply within 24 hours on weekdays.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor="contact-name"
            className="mono text-[10px] uppercase tracking-[0.1em]"
            style={{ color: "var(--t3)" }}
          >
            Name
          </label>
          <input
            id="contact-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            className="h-10 px-3 rounded-md border bg-transparent text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label
            htmlFor="contact-email"
            className="mono text-[10px] uppercase tracking-[0.1em]"
            style={{ color: "var(--t3)" }}
          >
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ada@example.com"
            className="h-10 px-3 rounded-md border bg-transparent text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="contact-subject"
          className="mono text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "var(--t3)" }}
        >
          Subject
        </label>
        <select
          id="contact-subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="h-10 px-3 rounded-md border bg-transparent text-[13px] outline-none focus:border-[var(--accent)] transition-colors"
          style={{
            borderColor: "var(--border)",
            color: subject ? "var(--t1)" : "var(--t3)",
            background: "var(--canvas)",
          }}
        >
          <option value="" disabled>
            Select a topic
          </option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="contact-message"
          className="mono text-[10px] uppercase tracking-[0.1em]"
          style={{ color: "var(--t3)" }}
        >
          Message
        </label>
        <textarea
          id="contact-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind…"
          rows={5}
          className="px-3 py-2.5 rounded-md border bg-transparent text-[13px] outline-none focus:border-[var(--accent)] transition-colors resize-none"
          style={{ borderColor: "var(--border)", color: "var(--t1)" }}
          aria-label="Message"
        />
      </div>

      {status === "error" && (
        <p className="mono text-[11px]" style={{ color: "var(--kill)" }}>
          Something went wrong. Email us at{" "}
          <a
            href="mailto:contact@pledgeoff.com"
            className="underline underline-offset-2"
          >
            contact@pledgeoff.com
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="display text-[13px] font-semibold h-10 rounded-md flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
      >
        {status === "loading" ? "Sending…" : "Send message →"}
      </button>
    </form>
  );
}
