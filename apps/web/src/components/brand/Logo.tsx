// apps/web/src/components/brand/Logo.tsx
// PledgeOFF — Verdict Fork mark
// - size >= 24px: full mark (with junction node, 32x32 viewBox)
// - size <  24px: simple mark (no node, 16x16 viewBox, kill-arm dimmed further)
// - mono: GO arm uses currentColor instead of lime (#D6FF3D)

export interface LogoProps {
  size?: number;
  mono?: boolean;
  className?: string;
  title?: string;
}

export function Logo({ size = 32, mono = false, className, title = "PledgeOFF" }: LogoProps) {
  const simple = size < 24;
  const go = mono ? "currentColor" : "#D6FF3D";

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
        <path d="M8 8 L13 3" stroke={go}           strokeWidth="2.5" strokeLinecap="round" />
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
      <path d="M16 30 V18"  stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M16 18 L6 6" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" opacity="0.55" />
      <path d="M16 18 L26 6" stroke={go}          strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="16" cy="18" r="2.4" fill="#111114" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

// Wordmark lockup — pair with text:
//   <Logo size={32} /> <span className="font-[InterTight] font-bold tracking-[-0.045em]">Pledge<span className="text-[#D6FF3D]">OFF</span></span>
