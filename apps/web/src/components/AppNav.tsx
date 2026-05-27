"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileButton } from "@/components/ProfileButton";

interface AppNavProps {
  email: string;
  initials: string;
  avatarUrl?: string | null;
  planLimitRemaining?: number | null;
}

export function AppNav({ email, initials, avatarUrl, planLimitRemaining }: AppNavProps) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/ideas/new", label: "Signal Verdict" },
    { href: "/blog", label: "Blog" },
  ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <nav
      className="border-b sticky top-0 z-50"
      style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
    >
      <div className="max-w-360 mx-auto px-4 sm:px-10 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8 sm:gap-10">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            style={{ color: "var(--t1)" }}
            aria-label="PledgeOFF home"
          >
            <Logo size={22} />
            <span className="display text-[15px] font-semibold tracking-tight">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-[13px]">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors"
                style={{ color: isActive(href) ? "var(--t1)" : "var(--t2)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--t1)")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = isActive(href)
                    ? "var(--t1)"
                    : "var(--t2)")
                }
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          {planLimitRemaining !== null && planLimitRemaining !== undefined && (
            <Link
              href="/ideas/new"
              className="hidden md:inline-flex items-center mono text-[10px] px-2.5 h-7 rounded-md border mr-3 transition-colors hover:border-(--caution) hover:text-(--caution)"
              style={{
                borderColor: planLimitRemaining === 0 ? "color-mix(in srgb, var(--caution) 50%, transparent)" : "var(--border)",
                color: planLimitRemaining === 0 ? "var(--caution)" : "var(--t3)",
              }}
            >
              {planLimitRemaining === 0 ? "0 left" : `${planLimitRemaining} left`}
            </Link>
          )}
          <div className="hidden md:flex items-center gap-2 mr-4">
            <span
              className="pulse-dot w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: "var(--accent)" }}
            />
            <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>
              live
            </span>
          </div>
          <div
            className="hidden md:block w-px h-4 mx-4"
            style={{ background: "var(--border)" }}
          />
          <div className="hidden md:block mr-3">
            <ThemeToggle />
          </div>
          <ProfileButton email={email} initials={initials} avatarUrl={avatarUrl} />
        </div>
      </div>
    </nav>
  );
}
