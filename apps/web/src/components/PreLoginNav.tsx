"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { WaitlistModal } from "./WaitlistModal";

interface PreLoginNavProps {
  extraLink?: { href: string; label: string };
}

export function PreLoginNav({ extraLink }: PreLoginNavProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
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
        <div className="max-w-[1320px] mx-auto px-8 h-12 flex items-center justify-between">
          <Link
            href={loggedIn ? "/dashboard" : "/"}
            className="display text-[15px] font-semibold text-[var(--t1)] tracking-tight"
          >
            Pledge<span className="text-[var(--accent)]">OFF</span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-5">
            {!loggedIn && (
              <Link href="/" className="hidden sm:inline text-[11px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors">
                ← Back to main page
              </Link>
            )}
            <Link href="/pricing" className="hidden sm:inline text-[11px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="hidden sm:inline text-[11px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors">
              Blog
            </Link>
            {!loggedIn && (
              <button
                onClick={() => setModalOpen(true)}
                className="hidden sm:inline text-[11px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
              >
                Get access
              </button>
            )}
            {extraLink && (
              <Link
                href={extraLink.href}
                className="text-[11px] text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
              >
                {extraLink.label}
              </Link>
            )}
            {loggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center h-7 px-3 rounded-md bg-[var(--accent)] text-black text-[11px] font-semibold hover:opacity-90 transition-opacity"
              >
                Dashboard →
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center h-7 px-3 rounded-md bg-[var(--accent)] text-black text-[11px] font-semibold hover:opacity-90 transition-opacity"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <WaitlistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        source="nav"
      />
    </>
  );
}
