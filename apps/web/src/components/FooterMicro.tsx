import Link from "next/link";

export function FooterMicro() {
  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: "var(--border)", background: "var(--canvas)" }}
    >
      <div
        className="max-w-[1440px] mx-auto px-4 sm:px-10 py-4 flex items-center justify-between"
      >
        <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>
          © 2026 PledgeOFF
        </span>
        <div className="flex items-center mono text-[11px]" style={{ color: "var(--t3)" }}>
          <Link href="/privacy" className="hover:text-(--t1) transition-colors">Privacy</Link>
          <span className="mx-2" style={{ color: "var(--border-2)" }}>·</span>
          <Link href="/terms" className="hover:text-(--t1) transition-colors">Terms</Link>
          <span className="mx-2" style={{ color: "var(--border-2)" }}>·</span>
          <Link href="/changelog" className="hover:text-(--t1) transition-colors">Changelog</Link>
          <span className="mx-2" style={{ color: "var(--border-2)" }}>·</span>
          <a href="mailto:contact@pledgeoff.com" className="hover:text-(--t1) transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
