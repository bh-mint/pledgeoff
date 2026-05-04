import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-auto bg-[var(--canvas)]">
      <div className="max-w-[1320px] mx-auto px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="display text-[15px] font-semibold text-[var(--t1)]">
            Pledge<span className="text-[var(--accent)]">OFF</span>
          </p>
          <span className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.08em]">
            every number is sourced
          </span>
        </div>

        <div className="flex items-center gap-6 text-[11px] text-[var(--t3)]">
          <Link href="/privacy" className="hover:text-[var(--t2)] transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[var(--t2)] transition-colors">
            Terms
          </Link>
          <Link href="/changelog" className="hover:text-[var(--t2)] transition-colors">
            Changelog
          </Link>
          <a
            href="https://x.com/pledgeoff"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--t2)] transition-colors"
          >
            @pledgeoff
          </a>
        </div>
      </div>

      <div className="border-t border-[var(--border)]">
        <div className="max-w-[1320px] mx-auto px-8 py-3">
          <p className="text-[11px] mono text-[var(--t3)]">
            © 2026 Pledge<span className="text-[var(--accent)]">OFF</span> · Built to kill bad ideas early.
          </p>
        </div>
      </div>
    </footer>
  );
}
