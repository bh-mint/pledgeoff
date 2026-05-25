"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/brand/Logo";

const ROLES = [
  { value: "indie", label: "Indie hacker", desc: "Solo builder validating side projects" },
  { value: "pm", label: "Product Manager", desc: "Running validation for a team roadmap" },
  { value: "agency", label: "Agency / Studio", desc: "Validating briefs for multiple clients" },
] as const;

type Role = (typeof ROLES)[number]["value"];

const STEPS = [
  {
    num: "01",
    title: "Write your idea",
    desc: "One sentence. Who it's for, what it does. Be specific — vague briefs score poorly.",
    tag: "input",
  },
  {
    num: "02",
    title: "We fetch real signals",
    desc: "Reddit threads, Hacker News, GitHub repos, and Dev.to discussions — scraped in real time for your idea.",
    tag: "scraping",
  },
  {
    num: "03",
    title: "You get a verdict",
    desc: "GO · KILL · PIVOT — with a score, reasoning, and traceable sources. In under 60 seconds.",
    tag: "ai verdict",
  },
  {
    num: "04",
    title: "Go deeper",
    desc: "Revenue simulation, landing page, customer segments, and engineering stack — all from the same signals.",
    tag: "intelligence",
  },
];

function saveRole(role: Role) {
  try { localStorage.setItem("pledgeoff_role", role); } catch { /* ignore */ }
}

export function OnboardingClient() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    saveRole(role);
  }

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "var(--canvas)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(214,255,61,0.06) 0%, transparent 60%)",
        }}
      />

      {/* Nav minimal */}
      <div
        className="relative px-6 sm:px-10 h-14 flex items-center justify-between border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2" style={{ color: "var(--t1)" }}>
          <Logo size={22} />
          <span className="display text-[15px] font-semibold tracking-tight">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="w-px h-4" style={{ background: "var(--border)" }} />
          <Link
            href="/dashboard"
            className="mono text-[11px] transition-colors hover:opacity-80"
            style={{ color: "var(--t3)" }}
          >
            skip →
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 flex items-center justify-center px-6 sm:px-10 py-12">
        <div className="max-w-[760px] w-full">
          {/* Header */}
          <div className="mb-10">
            <div
              className="mono text-[10px] uppercase tracking-[0.14em] mb-4"
              style={{ color: "var(--accent)" }}
            >
              Welcome to PledgeOFF
            </div>
            <h1
              className="display text-[32px] sm:text-[44px] font-bold leading-[1.05] mb-4"
              style={{ color: "var(--t1)" }}
            >
              Validate before you build.
            </h1>
            <p className="text-[15px] leading-relaxed" style={{ color: "var(--t2)" }}>
              Stop wasting months on ideas nobody wants. Get a data-driven verdict in under 60 seconds.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-2 mb-10">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="flex items-start gap-5 rounded-md border p-5"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface)",
                }}
              >
                <div
                  className="mono text-[10px] uppercase tracking-[0.1em] pt-0.5 shrink-0 w-5"
                  style={{ color: "var(--t3)" }}
                >
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[14px] font-semibold"
                      style={{ color: "var(--t1)" }}
                    >
                      {step.title}
                    </span>
                    <span
                      className="mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
                      style={{
                        color: "var(--t3)",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {step.tag}
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "var(--t2)" }}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Role selector */}
          <div className="mb-10">
            <div className="mono text-[10px] uppercase tracking-[0.1em] mb-3" style={{ color: "var(--t3)" }}>
              Who are you building for?
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {ROLES.map((r) => {
                const active = selectedRole === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => handleRoleSelect(r.value)}
                    className="flex-1 text-left rounded-md border p-3 transition-all"
                    style={{
                      borderColor: active ? "var(--accent)" : "var(--border)",
                      background: active ? "color-mix(in srgb, var(--accent) 8%, transparent)" : "var(--surface)",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {active && <span className="mono text-[9px]" style={{ color: "var(--accent)" }}>●</span>}
                      <span className="text-[13px] font-semibold" style={{ color: "var(--t1)" }}>{r.label}</span>
                    </div>
                    <p className="text-[11px]" style={{ color: "var(--t3)" }}>{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/ideas/new"
              className="display text-[14px] font-semibold px-6 h-12 rounded-md flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Validate your first idea →
            </Link>
            <Link
              href="/dashboard"
              className="mono text-[11px] h-12 flex items-center justify-center px-4 rounded-md border transition-colors hover:border-(--t2)"
              style={{ borderColor: "var(--border)", color: "var(--t3)" }}
            >
              Go to Dashboard
            </Link>
          </div>

          <p
            className="mt-6 text-center mono text-[10px]"
            style={{ color: "var(--t3)" }}
          >
            1 free validation per month · no credit card required
          </p>
        </div>
      </div>
    </div>
  );
}
