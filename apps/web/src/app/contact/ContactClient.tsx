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
      <div style={{ padding: "32px", textAlign: "center", border: "1px solid var(--go-line)", background: "var(--go-light)" }}>
        <div className="display" style={{ fontSize: "18px", fontWeight: 700, color: "var(--go)", marginBottom: "6px" }}>
          Message received.
        </div>
        <p className="mono" style={{ fontSize: "12px", color: "var(--dim)" }}>
          We reply within 24 hours on weekdays.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="fg2">
        <div className="fg">
          <label className="flbl" htmlFor="contact-name">Name</label>
          <input
            id="contact-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="finp"
          />
        </div>
        <div className="fg">
          <label className="flbl" htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="finp"
          />
        </div>
      </div>
      <div className="fg">
        <label className="flbl" htmlFor="contact-subject">Subject</label>
        <select
          id="contact-subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="finp"
          style={{ color: subject ? "var(--ink)" : "var(--faint)" }}
        >
          <option value="" disabled>Select a topic</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="fg" style={{ marginBottom: "20px" }}>
        <label className="flbl" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What's on your mind?"
          rows={5}
          className="finp"
        />
      </div>

      {status === "error" && (
        <p className="mono" style={{ fontSize: "11px", color: "var(--kill)", marginBottom: "12px" }}>
          Something went wrong. Email us at{" "}
          <a href="mailto:hello@pledgeoff.com" style={{ textDecoration: "underline" }}>
            hello@pledgeoff.com
          </a>
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-p"
        style={{ opacity: status === "loading" ? 0.6 : 1 }}
      >
        {status === "loading" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
