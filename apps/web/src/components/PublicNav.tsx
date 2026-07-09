"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  extraLink?: { href: string; label: string };
};

const NAV_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/enterprise", label: "Enterprise" },
];

const navLinkStyle: React.CSSProperties = {
  fontFamily: "var(--font-chivo-mono), monospace",
  fontSize: 9,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--dim)",
  padding: "0 13px",
  height: 52,
  display: "flex",
  alignItems: "center",
  borderBottom: "2px solid transparent",
  transition: "color 0.1s, border-color 0.1s",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export function PublicNav({ extraLink }: Props) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const allLinks = extraLink
    ? [...NAV_LINKS, { href: extraLink.href, label: extraLink.label }]
    : NAV_LINKS;

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "0 40px",
            height: 52,
            maxWidth: 1440,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {/* Brand */}
          <Link
            href={loggedIn ? "/dashboard" : "/"}
            aria-label="PledgeOFF home"
            style={{
              fontFamily: "var(--font-chivo-mono), monospace",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink)",
              flexShrink: 0,
            }}
          >
            Pledge<em style={{ color: "var(--go)", fontStyle: "normal" }}>OFF</em>
          </Link>

          {/* Desktop nav links */}
          <nav
            style={{ alignItems: "center", flex: 1 }}
            className="hidden sm:flex"
          >
            {allLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    ...navLinkStyle,
                    color: active ? "var(--ink)" : "var(--dim)",
                    borderBottomColor: active ? "var(--ink)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.color = "var(--ink)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.color = "var(--dim)";
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop right actions */}
          <div
            style={{ gap: 8, alignItems: "center", flexShrink: 0 }}
            className="hidden sm:flex"
          >
            <ThemeToggle />

            {loggedIn ? (
              <Link
                href="/dashboard"
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "7px 16px",
                  background: "var(--ink)",
                  color: "var(--bg)",
                  border: "1px solid var(--ink)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                }}
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "7px 14px",
                    border: "1px solid var(--line)",
                    color: "var(--dim)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface)";
                    e.currentTarget.style.color = "var(--ink)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--dim)";
                  }}
                >
                  Login
                </Link>
                <Link
                  href="/login?mode=signup"
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "7px 16px",
                    background: "var(--ink)",
                    color: "var(--bg)",
                    border: "1px solid var(--ink)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--go)";
                    e.currentTarget.style.borderColor = "var(--go)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--ink)";
                    e.currentTarget.style.borderColor = "var(--ink)";
                  }}
                >
                  Validate free →
                </Link>
              </>
            )}
          </div>

          {/* Mobile: theme + hamburger */}
          <div
            style={{
              marginLeft: "auto",
              alignItems: "center",
              gap: 12,
            }}
            className="flex sm:hidden"
          >
            <ThemeToggle />
            <button
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                cursor: "pointer",
                padding: 6,
                background: "none",
                border: "none",
              }}
            >
              <span style={{ display: "block", width: 22, height: 2, background: "var(--ink)" }} />
              <span style={{ display: "block", width: 22, height: 2, background: "var(--ink)" }} />
              <span style={{ display: "block", width: 22, height: 2, background: "var(--ink)" }} />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav
            style={{
              background: "var(--bg)",
              borderBottom: "1px solid var(--line)",
              padding: "12px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {allLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  fontFamily: "var(--font-chivo-mono), monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--dim)",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--line-soft)",
                }}
              >
                {label}
              </Link>
            ))}
            <div style={{ paddingTop: 12, display: "flex", gap: 8 }}>
              {loggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  style={{
                    fontFamily: "var(--font-chivo-mono), monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "7px 16px",
                    background: "var(--ink)",
                    color: "var(--bg)",
                    border: "1px solid var(--ink)",
                  }}
                >
                  Dashboard →
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      fontFamily: "var(--font-chivo-mono), monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "7px 14px",
                      border: "1px solid var(--line)",
                      color: "var(--dim)",
                    }}
                  >
                    Login
                  </Link>
                  <Link
                    href="/login?mode=signup"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      fontFamily: "var(--font-chivo-mono), monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "7px 16px",
                      background: "var(--ink)",
                      color: "var(--bg)",
                      border: "1px solid var(--ink)",
                    }}
                  >
                    Validate free →
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
