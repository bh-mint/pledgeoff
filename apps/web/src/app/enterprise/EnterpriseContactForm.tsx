"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function EnterpriseContactForm() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/v1/enterprise/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, companySize, message }),
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
          Message sent.
        </div>
        <p className="mono" style={{ fontSize: "12px", color: "var(--dim)" }}>
          We&apos;ll get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form id="contact" onSubmit={handleSubmit}>
      <div className="fg2">
        <div className="fg">
          <label className="flbl" htmlFor="e-nm">Full name</label>
          <input id="e-nm" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="finp" />
        </div>
        <div className="fg">
          <label className="flbl" htmlFor="e-co">Company</label>
          <input id="e-co" type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" className="finp" />
        </div>
      </div>
      <div className="fg2">
        <div className="fg">
          <label className="flbl" htmlFor="e-em">Work email</label>
          <input id="e-em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="finp" />
        </div>
        <div className="fg">
          <label className="flbl" htmlFor="e-sz">Team size</label>
          <select id="e-sz" required value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="finp" style={{ color: companySize ? "var(--ink)" : "var(--faint)" }}>
            <option value="" disabled>Select size</option>
            <option value="6-20">6–20 people</option>
            <option value="21-100">21–100 people</option>
            <option value="101-500">101–500 people</option>
            <option value="500+">500+ people</option>
          </select>
        </div>
      </div>
      <div className="fg" style={{ marginBottom: "20px" }}>
        <label className="flbl" htmlFor="e-msg">What are you validating?</label>
        <textarea id="e-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Tell us about your use case — types of ideas, frequency, team workflow" className="finp" />
      </div>

      {status === "error" && (
        <p className="mono" style={{ fontSize: "11px", color: "var(--kill)", marginBottom: "12px" }}>
          Something went wrong. Email us directly at hello@pledgeoff.com
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-p"
        style={{ opacity: status === "loading" ? 0.6 : 1 }}
      >
        {status === "loading" ? "Sending…" : "Send to sales team"}
      </button>
      <p className="mono" style={{ fontSize: "8px", letterSpacing: "0.06em", color: "var(--faint)", marginTop: "12px" }}>
        We respond within one business day.
      </p>
    </form>
  );
}
