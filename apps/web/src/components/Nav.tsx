"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface NavProps {
  onWaitlistOpen?: () => void;
}

export function Nav({ onWaitlistOpen }: NavProps) {
  const [user, setUser] = useState<User | null>(null);
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

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--canvas)]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-[1320px] mx-auto px-8 h-14 flex items-center justify-between">
        {/* Logo + live indicator (left group) */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="display text-[16px] font-semibold text-[var(--t1)] tracking-tight"
          >
            Pledge<span className="text-[var(--accent)]">OFF</span>
          </Link>
          <div className="hidden md:flex items-center gap-1 mono text-[11px]">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[var(--accent)] inline-block" />
            <span className="text-[var(--t2)]">3,418 ideas validated this week</span>
          </div>
        </div>

        {/* Right links */}
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-[13px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="text-[13px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
          >
            Blog
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-[13px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[11px] font-semibold text-[var(--t1)] uppercase">
                  {user.email?.[0] ?? "U"}
                </span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-xl overflow-hidden">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2.5 text-[13px] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--border)] transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--border)] transition-colors border-t border-[var(--border)]"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[13px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
              >
                Log in
              </Link>
              <button
                onClick={onWaitlistOpen}
                className="display h-9 px-4 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity"
              >
                Start free →
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
