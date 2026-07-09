import { StatNumber } from "@pledgeoff/web";

const big: React.CSSProperties = {
  fontFamily: "var(--font-bitter), serif",
  fontSize: 42,
  fontWeight: 700,
  color: "var(--ink)",
};

export const AnimatedCount = () => <StatNumber value={1284} style={big} />;

export const WithFallback = () => <StatNumber value={null} fallback="—" style={big} />;

export const SlowCount = () => (
  <StatNumber value={97} duration={1500} style={{ ...big, color: "var(--go)" }} />
);
