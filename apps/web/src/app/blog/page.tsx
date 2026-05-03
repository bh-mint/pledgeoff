import type { Metadata } from "next";
import { getAllArticles } from "@/lib/mdx";
import { BlogPageClient } from "./BlogPageClient";

export const metadata: Metadata = {
  title: "Blog — Decisions backed by evidence",
  description:
    "How to validate ideas, prioritize ruthlessly, and build things people actually want. No fluff. Every claim is sourced.",
  openGraph: {
    title: "PledgeOFF Blog — Decisions backed by evidence",
    description:
      "How to validate ideas, prioritize ruthlessly, and build things people actually want.",
    type: "website",
  },
  alternates: {
    canonical: "https://pledgeoff.com/blog",
  },
};

export default function BlogPage() {
  const articles = getAllArticles();
  return <BlogPageClient articles={articles} />;
}
