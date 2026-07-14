"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
  { href: "/settings/security", label: "Security" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/developer", label: "Developer" },
  { href: "/settings/audit-log", label: "Activity Log" },
  { href: "/settings/data", label: "Data & Account" },
];

export function SettingsTabBar() {
  const pathname = usePathname();
  return (
    <div className="set-tabwrap">
      <div className="set-ctx">
        <span className="set-brand">
          Pledge<em>OFF</em>
        </span>
        <span className="set-rule" />
        <span className="set-ctx-lbl">Settings</span>
      </div>
      <nav className="set-tabs" aria-label="Settings navigation">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`set-tab${pathname === tab.href ? " on" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function SettingsNav() {
  return <SettingsTabBar />;
}
