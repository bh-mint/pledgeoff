import type React from "react";
import Link from "next/link";

const AFFILIATE_DOMAINS = [
  "ahrefs.com",
  "semrush.com",
  "beehiiv.com",
  "convertkit.com",
  "linear.app",
  "mixpanel.com",
  "hotjar.com",
  "loom.com",
  "notion.so",
];

function isInternal(href: string): boolean {
  return href.startsWith("/") || href.startsWith("https://pledgeoff.com");
}

function isAffiliate(href: string): boolean {
  return AFFILIATE_DOMAINS.some((d) => href.includes(d));
}

function MdxLink({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href) return <a {...props}>{children}</a>;
  if (isInternal(href)) return <a href={href} {...props}>{children}</a>;
  if (isAffiliate(href)) {
    return (
      <a href={href} rel="nofollow sponsored noopener noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
      {children}
    </a>
  );
}

function MidArticleCTA() {
  return (
    <div
      className="my-10 rounded-md border p-6 not-prose"
      style={{ borderColor: "var(--accent)", background: "var(--surface)" }}
    >
      <div className="mono text-[10px] mb-2" style={{ color: "var(--accent)" }}>
        Stop theorizing.
      </div>
      <div
        className="display font-semibold leading-tight"
        style={{ fontSize: "20px", color: "var(--t1)" }}
      >
        Validate this idea right now.
      </div>
      <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
        You&apos;ve been reading about validation. Take 60 seconds and do it.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link
          href="/ideas/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          Try PledgeOFF free →
        </Link>
        <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>
          No credit card. Real Reddit signals.
        </span>
      </div>
    </div>
  );
}

export const mdxComponents = {
  a: MdxLink,
  MidArticleCTA,
};
