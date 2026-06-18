"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { href: "/admin/metrics",       label: "Overview" },
  { href: "/admin/users",         label: "Users" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/outbox",        label: "Outbox" },
  { href: "/admin/otto",          label: "Otto Usage" },
  { href: "/admin/flags",         label: "Feature Flags" },
  { href: "/admin/ai-cost",       label: "AI Cost" },
  { href: "/admin/flywheel",      label: "Flywheel" },
];

const LABELS: Record<string, string> = {
  "/admin/metrics":       "Overview",
  "/admin/users":         "Users",
  "/admin/subscriptions": "Subscriptions",
  "/admin/outbox":        "Outbox",
  "/admin/otto":          "Otto Usage",
  "/admin/flags":         "Feature Flags",
  "/admin/ai-cost":       "AI Cost",
  "/admin/flywheel":      "Flywheel",
};

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const section = LABELS[pathname] ?? Object.entries(LABELS).find(([k]) => pathname.startsWith(k))?.[1] ?? "Admin";

  return (
    <div className="a-shell">
      {/* Sidebar */}
      <aside className="sb">
        <div className="sb-mark">
          <div className="sb-nm">
            Pledge<em>OFF</em>
          </div>
          <div className="sb-sub">Admin</div>
        </div>

        <nav className="sb-nav">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`sbn ${pathname === href || (pathname.startsWith(href + "/") && href !== "/admin") ? "on" : ""}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user">
            <div className="sb-user-dot" />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 140,
              }}
            >
              {email}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="a-main">
        <div className="a-top">
          <div className="a-breadcrumb">
            Admin &rsaquo; <span>{section}</span>
          </div>
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="btn-g"
            style={{ fontSize: 9, padding: "4px 10px" }}
          >
            ← App
          </Link>
        </div>

        <div className="a-content">{children}</div>
      </div>
    </div>
  );
}
