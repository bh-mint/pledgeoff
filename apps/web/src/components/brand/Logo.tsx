// PledgeOFF — Verdict Fork mark (Bulletin design system)
// - size >= 24: full mark with junction node, 32×32 viewBox
// - size <  24: simplified mark, 16×16 viewBox
// - mono: GO arm inherits currentColor instead of var(--go)

export interface LogoProps {
  size?: number;
  mono?: boolean;
  className?: string;
  title?: string;
}

export function Logo({ size = 32, mono = false, className, title = "PledgeOFF" }: LogoProps) {
  const simple = size < 24;
  const goStyle = mono ? undefined : { stroke: "var(--go)" };

  if (simple) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        role="img"
        aria-label={title}
        className={className}
      >
        <path d="M8 15 V8"   stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M8 8 L3 3"  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
        <path d="M8 8 L13 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={goStyle} />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={className}
    >
      <path d="M16 30 V18"   stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 18 L6 6"  stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      <path d="M16 18 L26 6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" style={goStyle} />
      <circle cx="16" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.4" style={{ fill: "var(--bg)" }} />
    </svg>
  );
}
