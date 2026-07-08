import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import { HOME_FAQ } from "./home-faq";

export const metadata: Metadata = {
  title: { absolute: "PledgeOFF — Kill bad ideas before they kill you" },
  description:
    "GO / KILL / PIVOT — decided by live signals from Reddit, Hacker News, GitHub, and the web. Validate your startup idea in about 15 seconds. Not your gut.",
  alternates: { canonical: "https://pledgeoff.com" },
  openGraph: {
    title: "PledgeOFF — Kill bad ideas before they kill you",
    description: "Validate your startup idea in about 15 seconds using live signals from Reddit, HN, GitHub, and the web.",
    url: "https://pledgeoff.com",
    type: "website",
    images: [
      {
        url: "https://pledgeoff.com/api/og?type=home",
        width: 1200,
        height: 630,
        alt: "PledgeOFF — GO / KILL / PIVOT — Decision Intelligence for Founders",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PledgeOFF — Kill bad ideas before they kill you",
    description: "Validate your startup idea in about 15 seconds using live signals from Reddit, HN, GitHub, and the web.",
    images: ["https://pledgeoff.com/api/og?type=home"],
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
  description: "Decision Intelligence Platform — GO / KILL / PIVOT in about 15 seconds using live market signals.",
  sameAs: [
    "https://x.com/pledgeoffhq",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PledgeOFF",
  url: "https://pledgeoff.com",
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOME_FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <HomeClient />
    </>
  );
}
