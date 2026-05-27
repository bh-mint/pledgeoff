"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Plan } from "@pledgeoff/core";

type NavItem = { href: string; label: string; studioOnly?: boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/settings/profile", label: "Account" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/audit-log", label: "Activity", studioOnly: true },
  { href: "/settings/developer", label: "Developer" },
  { href: "/settings/data", label: "Danger zone" },
];

export function SettingsNav({ plan }: { plan: Plan }) {
  const pathname = usePathname();
  const isStudio = plan === "studio" || plan === "enterprise";
  const items = NAV_ITEMS.filter((item) => !item.studioOnly || isStudio);

  return (
    <>
      {/* Mobile: horizontal tab row */}
      <div
        className="col-span-12 md:hidden flex gap-1 overflow-x-auto pb-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="mono text-[10px] whitespace-nowrap px-3 py-1.5 rounded-md shrink-0 transition-colors"
              style={{
                background: active ? "var(--accent)" : "var(--surface)",
                color: active ? "#000" : "var(--t2)",
                border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:block col-span-3">
        <div
          className="mono text-[10px] uppercase tracking-[0.14em] mb-4"
          style={{ color: "var(--t3)" }}
        >
          settings
        </div>
        <nav className="flex flex-col">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="text-left text-[13px] py-2.5 border-b flex items-center justify-between transition-all rounded-sm"
                style={{
                  borderColor: "var(--border)",
                  color: active ? "var(--t1)" : "var(--t2)",
                  background: active
                    ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                    : "transparent",
                  paddingLeft: active ? "12px" : "8px",
                }}
              >
                {item.label}
                {active && <span style={{ color: "var(--accent)" }}>→</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
