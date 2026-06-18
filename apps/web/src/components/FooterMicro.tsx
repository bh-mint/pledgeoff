import Link from "next/link";

export function FooterMicro() {
  return (
    <footer
      className="border-t mt-auto"
      style={{ borderColor: "var(--line)", background: "var(--bg)" }}
    >
      <div
        className="max-w-[1440px] mx-auto px-4 sm:px-10 py-4 flex items-center justify-between"
      >
        <span className="mono text-[11px]" style={{ color: "var(--faint)" }}>
          © 2026 PledgeOFF
        </span>
        <div className="flex items-center mono text-[11px]" style={{ color: "var(--faint)" }}>
          <Link href="/privacy" style={{ color: "var(--dim)" }} className="transition-colors hover:opacity-80">Privacy</Link>
          <span className="mx-2">·</span>
          <Link href="/terms" style={{ color: "var(--dim)" }} className="transition-colors hover:opacity-80">Terms</Link>
          <span className="mx-2">·</span>
          <Link href="/changelog" style={{ color: "var(--dim)" }} className="transition-colors hover:opacity-80">Changelog</Link>
          <span className="mx-2">·</span>
          <a href="mailto:contact@pledgeoff.com" style={{ color: "var(--dim)" }} className="transition-colors hover:opacity-80">Contact</a>
        </div>
      </div>
    </footer>
  );
}
