"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

interface PreLoginNavProps {
  extraLink?: { href: string; label: string };
}

export function PreLoginNav({ extraLink }: PreLoginNavProps) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <>
      <header
        className="border-b sticky top-0 z-50"
        style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
      >
        <div className="max-w-360 mx-auto px-4 sm:px-10 h-14 flex items-center justify-between">
          {/* Left — logo + nav links */}
          <div className="flex items-center gap-8 sm:gap-10">
            <Link
              href={loggedIn ? "/dashboard" : "/"}
              className="flex items-center gap-2"
              style={{ color: "var(--t1)" }}
              aria-label="PledgeOFF home"
            >
              <Logo size={22} />
              <span className="display text-[15px] font-semibold tracking-tight">
                Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-7">
              <Link href="/pricing" className="text-[13px] transition-colors" style={{ color: "var(--t2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                Pricing
              </Link>
              <Link href="/blog" className="text-[13px] transition-colors" style={{ color: "var(--t2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                Blog
              </Link>
              <Link href="/about" className="text-[13px] transition-colors" style={{ color: "var(--t2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                About
              </Link>
              {extraLink && (
                <Link href={extraLink.href} className="text-[13px] transition-colors" style={{ color: "var(--t2)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                  {extraLink.label}
                </Link>
              )}
            </nav>
          </div>

          {/* Right — separator + toggle + buttons */}
          <div className="flex items-center">
            <div className="hidden sm:block w-px h-4 mx-4" style={{ background: "var(--border)" }} />
            <div className="hidden sm:block mr-3">
              <ThemeToggle />
            </div>

            {loggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
              >
                Dashboard →
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center h-9 px-4 rounded-md border text-[13px] transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
                >
                  Login
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
                >
                  Start free →
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

    </>
  );
}
