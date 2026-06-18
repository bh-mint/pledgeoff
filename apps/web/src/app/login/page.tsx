import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginClient } from "./LoginClient";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: { absolute: "Sign in — PledgeOFF" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="auth-shell">

      {/* Left brand panel */}
      <aside className="auth-panel">
        <div className="ap-mark">
          <span className="ap-mark-name">Pledge<em>OFF</em></span>
          <div className="ap-mark-rule" />
          <span className="ap-mark-sub">Bulletin</span>
        </div>

        <h1 className="ap-headline">Know before<br />you build.</h1>

        {/* Mock verdict card */}
        <div className="mc">
          <div className="mc-head">
            <span>Field Report · No. 2184</span>
            <span className="go">GO</span>
          </div>
          <div className="mc-body">
            <div className="mc-dims">
              {[
                { label: "Market Demand", pct: 88 },
                { label: "Competition",   pct: 69 },
                { label: "Feasibility",   pct: 91 },
                { label: "Timing",        pct: 79 },
              ].map(({ label, pct }) => (
                <div key={label} className="mc-dim">
                  <span className="mc-lbl">{label}</span>
                  <div className="mc-bar"><div className="mc-fill" style={{ width: `${pct}%` }} /></div>
                  <span className="mc-n">{pct}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mc-foot">
            {[
              { k: "Score",        v: "82",  go: true },
              { k: "Confidence",   v: "91%" },
              { k: "Signals",      v: "34"  },
              { k: "Category avg", v: "68"  },
            ].map(({ k, v, go }) => (
              <div key={k} className="mc-fi">
                <span className="mc-fk">{k}</span>
                <span className={`mc-fv${go ? " go" : ""}`}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="ap-footer">
          Real signals from Hacker News, Dev.to, GitHub, and the wider web. Every verdict cites its sources.
        </p>
      </aside>

      {/* Right form panel */}
      <main className="auth-main">
        <div className="auth-bar">
          <span className="auth-m-brand">Pledge<em>OFF</em></span>
          <ThemeToggle />
        </div>
        <div className="auth-body">
          <Suspense
            fallback={<div className="auth-form" style={{ height: "300px" }} />}
          >
            <LoginClient />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
