"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavProps {
  onWaitlistOpen?: () => void;
  loggedIn?: boolean;
}

export function Nav({ onWaitlistOpen, loggedIn: loggedInProp }: NavProps) {
  const [user, setUser] = useState<User | null>(null);
  const isLoggedIn = loggedInProp ?? !!user;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
  };

  const userInitials = (user?.email ?? "?").split("@")[0].slice(0, 2).toUpperCase();

  return (
    <nav
      className="border-b sticky top-0 z-50"
      style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-10 h-14 flex items-center justify-between">
        {/* Left — logo + nav links */}
        <div className="flex items-center gap-8 sm:gap-10">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-2"
            style={{ color: "var(--t1)" }}
            aria-label="PledgeOFF home"
          >
            <Logo size={22} />
            <span className="display text-[15px] font-semibold tracking-tight">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {isLoggedIn ? (
              <>
                <Link href="/dashboard" className="text-[13px] transition-colors" style={{ color: "var(--t2)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                  Dashboard
                </Link>
                <Link href="/ideas/new" className="text-[13px] transition-colors" style={{ color: "var(--t2)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                  Validator
                </Link>
                <Link href="/blog" className="text-[13px] transition-colors" style={{ color: "var(--t2)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                  Blog
                </Link>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center">
          {isLoggedIn && (
            <div className="hidden md:flex items-center gap-2 mr-4">
              <span className="pulse-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: "var(--accent)" }} />
              <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>live</span>
            </div>
          )}

          <div className="hidden md:block w-px h-4 mx-4" style={{ background: "var(--border)" }} />
          <div className="hidden md:block mr-3">
            <ThemeToggle />
          </div>

          {user ? (
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center">
                <span
                  className="w-7 h-7 rounded-full border flex items-center justify-center mono text-[11px]"
                  style={{ borderColor: "var(--border-2)", background: "var(--surface)", color: "var(--t1)" }}
                >
                  {userInitials}
                </span>
              </button>
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-44 border rounded-md overflow-hidden shadow-xl"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <Link href="/dashboard" className="block px-4 py-2.5 text-[13px] transition-colors"
                    style={{ color: "var(--t2)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
                    onClick={() => setDropdownOpen(false)}>
                    Dashboard
                  </Link>
                  <Link href="/settings" className="block px-4 py-2.5 text-[13px] border-t transition-colors"
                    style={{ color: "var(--t2)", borderColor: "var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}
                    onClick={() => setDropdownOpen(false)}>
                    Settings
                  </Link>
                  <button onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-[13px] border-t transition-colors"
                    style={{ color: "var(--t2)", borderColor: "var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"
                className="inline-flex items-center h-9 px-4 rounded-md border text-[13px] transition-colors"
                style={{ borderColor: "var(--border)", color: "var(--t2)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--t2)")}>
                Login
              </Link>
              <button onClick={onWaitlistOpen}
                className="inline-flex items-center h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>
                Start free →
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
