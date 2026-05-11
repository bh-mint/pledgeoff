"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Logo } from "@/components/brand/Logo";

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

  return (
    <nav className="border-b border-(--border) bg-(--canvas) sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-10 h-12 flex items-center justify-between">
        {/* Logo + live indicator */}
        <div className="flex items-center gap-8">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-center gap-2 text-(--t1)"
            aria-label="PledgeOFF home"
          >
            <Logo size={22} />
            <span className="display text-[15px] font-semibold tracking-tight">
              Pledge<span className="text-(--accent)">OFF</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-1 mono text-[10px]">
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-(--accent) inline-block" />
            <span className="text-(--t2)">3,418 ideas validated this week</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/pricing"
            className="text-[11px] text-(--t2) hover:text-(--t1) transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="text-[11px] text-(--t2) hover:text-(--t1) transition-colors"
          >
            Blog
          </Link>

          {!user && (
            <button
              onClick={onWaitlistOpen}
              className="text-[11px] text-(--t2) hover:text-(--t1) transition-colors"
            >
              Get access
            </button>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center"
              >
                <span className="w-6 h-6 rounded-full bg-(--surface) border border-(--border) flex items-center justify-center text-[10px] font-semibold text-(--t1) uppercase">
                  {user.email?.[0] ?? "U"}
                </span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-(--surface) border border-(--border) rounded-md shadow-xl overflow-hidden">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2.5 text-[11px] text-(--t2) hover:text-(--t1) hover:bg-(--border) transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2.5 text-[11px] text-(--t2) hover:text-(--t1) hover:bg-(--border) transition-colors border-t border-(--border)"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-[11px] text-(--t2) hover:text-(--t1) hover:bg-(--border) transition-colors border-t border-(--border)"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center h-7 px-3 rounded-md bg-(--accent) text-black text-[11px] font-semibold hover:opacity-90 transition-opacity"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
