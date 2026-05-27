"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProfileButtonProps {
  email: string;
  initials: string;
  avatarUrl?: string | null;
}

export function ProfileButton({ email, initials, avatarUrl }: ProfileButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-7 h-7 rounded-full border overflow-hidden display text-[11px] font-semibold flex items-center justify-center text-(--t1) hover:border-(--t2) transition-colors"
        style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
        aria-label="Account menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={initials}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-9 w-[200px] rounded-md border py-1 z-50"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div
            className="px-3 py-2 mono text-[10px] border-b truncate"
            style={{ color: "var(--t3)", borderColor: "var(--border)" }}
          >
            {email}
          </div>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block w-full text-left px-3 py-2 text-[12px] hover:bg-(--border) transition-colors"
            style={{ color: "var(--t2)" }}
          >
            Settings
          </Link>
          <div style={{ borderTop: "1px solid var(--border)" }} />
          <button
            onClick={handleSignOut}
            className="w-full text-left px-3 py-2 text-[12px] hover:bg-(--border) transition-colors"
            style={{ color: "var(--t2)" }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
