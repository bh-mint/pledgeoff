import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";

export const metadata: Metadata = {
  title: { absolute: "PledgeOFF — Kill bad ideas before they kill you" },
  description:
    "GO / KILL / PIVOT — decided by 847 live signals from Reddit and GitHub. Validate your startup idea in 15 seconds. Not your gut.",
  alternates: { canonical: "https://pledgeoff.com" },
  openGraph: {
    title: "PledgeOFF — Kill bad ideas before they kill you",
    description: "Validate your startup idea in 15 seconds using live Reddit and GitHub signals.",
    url: "https://pledgeoff.com",
    type: "website",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PledgeOFF",
  url: "https://pledgeoff.com",
  logo: {
    "@type": "ImageObject",
    url: "https://pledgeoff.com/brand/logo-lockup.svg",
    width: 200,
    height: 48,
  },
  description: "Decision Intelligence Platform — GO / KILL / PIVOT in 15 seconds using live market signals.",
  sameAs: [
    "https://twitter.com/pledgeoff",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PledgeOFF",
  url: "https://pledgeoff.com",
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <HomeClient />
    </>
  );
}
