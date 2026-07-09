import { ThemeToggle } from "@pledgeoff/web";

export const InNavContext = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, background: "var(--surface)", border: "1px solid var(--line)" }}>
    <span style={{ fontFamily: "var(--font-chivo-mono), monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--dim)" }}>
      Theme
    </span>
    <ThemeToggle />
  </div>
);
