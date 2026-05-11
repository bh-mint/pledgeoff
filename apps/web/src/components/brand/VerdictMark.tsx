// Verdict Fork mark tinted per verdict verdict.
// GO:    right arm = validated green, left arm dimmed 25%
// PIVOT: both arms = caution amber (left at 55% opacity)
// KILL:  left arm = kill red, right arm dimmed 25%

type Verdict = "GO" | "PIVOT" | "KILL";

interface VerdictMarkProps {
  verdict: Verdict;
  size?: number;
}

const COLORS = {
  GO:    { left: "#F5F5F4", leftOp: 0.25, right: "#7DD66B", rightOp: 1 },
  PIVOT: { left: "#E8B341", leftOp: 0.55, right: "#E8B341", rightOp: 1 },
  KILL:  { left: "#E55B3C", leftOp: 1,    right: "#F5F5F4", rightOp: 0.25 },
} satisfies Record<Verdict, { left: string; leftOp: number; right: string; rightOp: number }>;

export function VerdictMark({ verdict, size = 40 }: VerdictMarkProps) {
  const c = COLORS[verdict];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-label={verdict}
      role="img"
      style={{ flexShrink: 0 }}
    >
      <path d="M16 30 V18" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 18 L6 6"  stroke={c.left}  strokeWidth="3.5" strokeLinecap="round" opacity={c.leftOp} />
      <path d="M16 18 L26 6" stroke={c.right} strokeWidth="3.5" strokeLinecap="round" opacity={c.rightOp} />
      <circle cx="16" cy="18" r="2.4" fill="var(--surface)" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
