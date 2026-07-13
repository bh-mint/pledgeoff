"use client";

import { useInView, usePrefersReducedMotion } from "@/lib/motion";

const FEATURES = [
  {
    n: "01",
    title: "Cited sources",
    desc: "Every signal links to its origin. Reddit threads, Hacker News, GitHub issues, G2 reviews, news, job postings. Nothing invented.",
  },
  {
    n: "02",
    title: "Four scored dimensions",
    desc: "Market demand, competition, feasibility, and timing — each weighted and scored independently before the composite verdict.",
  },
  {
    n: "03",
    title: "Otto, your co-pilot",
    desc: "Ask follow-up questions in plain English. Otto reads your verdict and signals before answering — not a generic chatbot.",
  },
  {
    n: "04",
    title: "Your context, injected",
    desc: "Add what you already know — customer conversations, lost deals, pricing signals. Every intelligence tool reads your context alongside the public signals.",
  },
  {
    n: "05",
    title: "Movement tracking",
    desc: "Competitors change pricing, positioning, and features. PledgeOFF re-checks the market on schedule and flags what moved.",
  },
  {
    n: "06",
    title: "Win/Loss intelligence",
    desc: "Report what happened after the verdict — built, failed, lost to whom. Every outcome calibrates your future verdicts.",
  },
  {
    n: "07",
    title: "Team collaboration",
    desc: "Share verdicts with teammates. React, run tools together, get Slack alerts and a weekly digest of what changed.",
  },
  {
    n: "08",
    title: "Public profiles",
    desc: "Make ideas public. Share verdicts via link. Build a credible validation track record others can see.",
  },
  {
    n: "09",
    title: "API & reports",
    desc: "REST API with keys and usage stats. Export any verdict as a PDF intelligence report — white-label on Studio.",
  },
];

export function FeatureGrid() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  return (
    <div ref={ref} className="feat-grid" style={{ border: "1px solid var(--line)" }}>
      {FEATURES.map((f, i) => (
        <div
          key={f.n}
          className="feat-item"
          style={
            reduced
              ? undefined
              : {
                  opacity: inView ? 1 : 0,
                  transform: inView ? "translateY(0)" : "translateY(6px)",
                  transition: `opacity 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, transform 500ms cubic-bezier(0.16,1,0.3,1) ${i * 60}ms`,
                }
          }
        >
          <div className="feat-no">{f.n}</div>
          <div className="feat-title">{f.title}</div>
          <div className="feat-desc">{f.desc}</div>
        </div>
      ))}
    </div>
  );
}
