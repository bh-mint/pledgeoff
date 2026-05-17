"use client";

import Link from "next/link";
import { trackEvent } from "@/components/GoogleAnalytics";

interface Props {
  href: string;
  children: React.ReactNode;
  location: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ArticleCTAButton({ href, children, location, className, style }: Props) {
  return (
    <Link
      href={href}
      onClick={() => trackEvent("cta_click", { location })}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
