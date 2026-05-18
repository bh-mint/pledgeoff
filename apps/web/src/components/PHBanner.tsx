"use client";

export function PHBanner() {
  const phUrl = process.env.NEXT_PUBLIC_PH_URL;
  if (!phUrl) return null;

  return (
    <div
      className="border-b py-2.5 px-4 flex items-center justify-center gap-3"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full pulse-dot bg-(--accent)" />
      <span className="text-[12px]" style={{ color: "var(--t2)" }}>
        We&apos;re live on Product Hunt today.
      </span>
      <a
        href={phUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mono text-[11px] font-semibold underline underline-offset-2"
        style={{ color: "var(--t1)" }}
      >
        Support us →
      </a>
    </div>
  );
}
