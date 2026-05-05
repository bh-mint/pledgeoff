import type React from "react";

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

export const mdxComponents = {
  a: MdxLink,
};
