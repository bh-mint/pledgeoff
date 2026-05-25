import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

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

const NAV_COLS = [
  {
    label: "Product",
    links: [
      { href: "/ideas/new", text: "Signal Verdict" },
      { href: "/dashboard", text: "Dashboard" },
      { href: "/pricing", text: "Pricing" },
      { href: "/changelog", text: "Changelog" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", text: "About" },
      { href: "/blog", text: "Blog" },
      { href: "mailto:hello@pledgeoff.com", text: "Contact", external: true },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/privacy", text: "Privacy" },
      { href: "/terms", text: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t mt-auto" style={{ borderColor: "var(--border)", background: "var(--canvas)" }}>
      {/* Main grid */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 pt-10 pb-8 grid grid-cols-1 sm:grid-cols-12 gap-8">
        {/* Col 1 — brand */}
        <div className="sm:col-span-4 sm:pr-8">
          <div className="flex items-center gap-2" style={{ color: "var(--t1)" }}>
            <Logo size={20} />
            <span className="display text-[15px] font-semibold tracking-tight">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
          </div>
          <p className="text-[13px] leading-relaxed mt-3" style={{ color: "var(--t2)" }}>
            Decision intelligence for founders who ship.
          </p>
          <div className="mt-5">
            <ThemeToggle />
          </div>
        </div>

        {/* Nav cols */}
        {NAV_COLS.map((col) => (
          <div key={col.label} className="sm:col-span-2">
            <div className="mono text-[11px] uppercase tracking-[0.1em] mb-3" style={{ color: "var(--t3)" }}>
              {col.label}
            </div>
            <ul className="space-y-3">
              {col.links.map((link) => (
                <li key={link.href}>
                  {link.external ? (
                    <a
                      href={link.href}
                      className="text-[13px] transition-colors text-(--t2) hover:text-(--t1)"
                    >
                      {link.text}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[13px] transition-colors text-(--t2) hover:text-(--t1)"
                    >
                      {link.text}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Copyright row */}
      <div className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 py-5 flex items-center justify-between">
          <span className="mono text-[12px]" style={{ color: "var(--t3)" }}>
            © 2026 PledgeOFF. All rights reserved.
          </span>
          <div className="flex items-center gap-1">
            <a
              href="https://x.com/pledgeoffhq"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X / Twitter"
              className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors text-(--t3) hover:text-(--t1)"
            >
              <IconX />
            </a>
            <a
              href="https://github.com/bh-mint/PledgeOFF"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors text-(--t3) hover:text-(--t1)"
            >
              <IconGitHub />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
