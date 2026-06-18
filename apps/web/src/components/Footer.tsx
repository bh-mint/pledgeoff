"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CookiePreferencesButton } from "@/components/CookiePreferencesButton";

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9.3 7.1 14 2h-1.4L8.7 6.5 5.6 2H2l4.9 6.9L2 14h1.4l4.2-4.8L11 14h3.6L9.3 7.1Zm-1.5 1.7-.5-.7L4 3.1h1.7l3.2 4.5.5.7 4 5.5h-1.7L7.8 8.8Z" fill="currentColor" />
    </svg>
  );
}

function IconGitHub() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 1.5a6.5 6.5 0 0 0-2 12.7c.3 0 .5-.2.5-.4v-1.5c-1.8.4-2.2-.9-2.2-.9-.3-.7-.7-.9-.7-.9-.6-.4 0-.4 0-.4.7 0 1 .7 1 .7.6 1 1.5.7 1.9.5.1-.4.2-.7.4-.9-1.4-.2-2.9-.7-2.9-3.2 0-.7.3-1.3.7-1.7-.1-.2-.3-.9.1-1.8 0 0 .6-.2 1.8.7a6 6 0 0 1 3.3 0c1.2-.9 1.8-.7 1.8-.7.3.9.1 1.6 0 1.8.5.4.7 1 .7 1.7 0 2.5-1.5 3-2.9 3.2.2.2.4.6.4 1.2v1.7c0 .2.1.4.5.4A6.5 6.5 0 0 0 8 1.5Z" fill="currentColor" />
    </svg>
  );
}

const monoLabel: React.CSSProperties = {
  fontFamily: "var(--font-chivo-mono), monospace",
  fontSize: 8,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "var(--faint)",
  marginBottom: 12,
  display: "block",
};

const footerLink: React.CSSProperties = {
  fontSize: 13,
  color: "var(--dim)",
  display: "block",
  marginBottom: 10,
  transition: "color 0.1s",
};

const NAV_COLS = [
  {
    label: "Product",
    links: [
      { href: "/ideas/new", text: "Signal Verdict" },
      { href: "/dashboard", text: "Dashboard" },
      { href: "/pricing", text: "Pricing" },
      { href: "/changelog", text: "Changelog" },
      { href: "/api-docs", text: "API docs" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", text: "About" },
      { href: "/blog", text: "Blog" },
      { href: "/enterprise", text: "Enterprise" },
      { href: "/roadmap", text: "Roadmap" },
      { href: "/affiliate", text: "Affiliate program" },
    ],
  },
  {
    label: "Support",
    links: [
      { href: "/contact", text: "Contact" },
      { href: "mailto:support@pledgeoff.com", text: "Customer support", external: true },
      { href: "mailto:billing@pledgeoff.com", text: "Billing & invoices", external: true },
      { href: "mailto:partnerships@pledgeoff.com", text: "Partnerships", external: true },
      { href: "/security", text: "Security" },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/privacy", text: "Privacy policy" },
      { href: "/terms", text: "Terms of service" },
      { href: "/privacy#s8", text: "Cookie policy" },
      { href: "https://anpc.ro/ce-este-sal/", text: "ANPC — SAL", external: true },
      { href: "https://ec.europa.eu/consumers/odr/", text: "SOL — ODR", external: true },
      { href: "https://www.anspdcp.ro", text: "ANSPDCP", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        marginTop: "auto",
        background: "var(--surface)",
      }}
    >
      {/* Main grid */}
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "48px 40px 36px",
          gap: 32,
        }}
        className="grid grid-cols-2 sm:grid-cols-5"
      >
        {/* Brand col */}
        <div style={{ gridColumn: "span 1" }}>
          <div
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink)",
              marginBottom: 10,
            }}
          >
            Pledge<em style={{ color: "var(--go)", fontStyle: "normal" }}>OFF</em>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--dim)",
              lineHeight: 1.65,
              marginBottom: 16,
            }}
          >
            Decision intelligence for founders who ship.
          </p>
          <ThemeToggle />
        </div>

        {/* Nav cols */}
        {NAV_COLS.map((col) => (
          <div key={col.label}>
            <span style={monoLabel}>{col.label}</span>
            {col.links.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={footerLink}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
                >
                  {link.text}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  style={footerLink}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--dim)")}
                >
                  {link.text}
                </Link>
              )
            )}
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div style={{ borderTop: "1px solid var(--line)" }}>
        <div
          style={{
            maxWidth: 1440,
            margin: "0 auto",
            padding: "14px 40px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 10,
                color: "var(--faint)",
                display: "block",
                marginBottom: 4,
              }}
            >
              © 2026 S.C. PledgeOFF S.R.L. · CUI [TBD] · All rights reserved.
            </span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "0 12px",
                fontFamily: "var(--font-chivo-mono), monospace",
                fontSize: 9,
                color: "var(--faint)",
              }}
            >
              <a
                href="https://anpc.ro/ce-este-sal/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                ANPC — Alternative Dispute Resolution
              </a>
              <span aria-hidden="true">·</span>
              <a
                href="https://www.anspdcp.ro"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                ANSPDCP
              </a>
              <span aria-hidden="true">·</span>
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                SOL — ODR
              </a>
              <span aria-hidden="true">·</span>
              <CookiePreferencesButton />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <a
              href="https://x.com/pledgeoffhq"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X / Twitter"
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--faint)",
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--faint)")}
            >
              <IconX />
            </a>
            <a
              href="https://github.com/bh-mint/PledgeOFF"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--faint)",
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--faint)")}
            >
              <IconGitHub />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
