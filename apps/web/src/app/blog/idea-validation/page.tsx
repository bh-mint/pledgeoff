import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticles, CLUSTER_META } from "@/lib/mdx";
import { formatDate } from "@/lib/mdx-utils";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";

const TAG = "idea-validation" as const;
const cluster = CLUSTER_META[TAG];
const others = (["product-decisions", "founder"] as const).map((t) => CLUSTER_META[t]);

export const metadata: Metadata = {
  title: "Idea Validation — Guides & Frameworks",
  description: cluster.description,
  alternates: { canonical: "https://pledgeoff.com/blog/idea-validation" },
  openGraph: {
    title: "Idea Validation — Guides & Frameworks | PledgeOFF",
    description: cluster.description,
    url: "https://pledgeoff.com/blog/idea-validation",
    type: "website",
  },
};

const TAG_COLOR = "var(--validated)";

export default function IdeaValidationPage() {
  const articles = getAllArticles().filter((a) => a.tag === TAG);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Idea Validation — PledgeOFF",
    description: cluster.description,
    url: "https://pledgeoff.com/blog/idea-validation",
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: "https://pledgeoff.com/blog" },
        { "@type": "ListItem", position: 2, name: "Idea Validation", item: "https://pledgeoff.com/blog/idea-validation" },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
        <PreLoginNav extraLink={{ href: "/blog", label: "← All articles" }} />

        <div className="max-w-2xl mx-auto px-6 pt-14 pb-24">

          {/* Breadcrumb */}
          <div className="mono text-[10px] uppercase tracking-[0.1em] mb-6 flex items-center gap-2" style={{ color: "var(--t3)" }}>
            <Link href="/blog" className="hover:text-(--t2) transition-colors">Blog</Link>
            <span>›</span>
            <span style={{ color: TAG_COLOR }}>Idea Validation</span>
          </div>

          {/* Header */}
          <h1 className="display font-bold leading-tight mb-3" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
            Idea Validation
          </h1>
          <p className="text-[15px] leading-relaxed mb-2" style={{ color: "var(--t2)" }}>
            {cluster.description}
          </p>
          <p className="mono text-[11px] mb-10" style={{ color: "var(--t3)" }}>
            {articles.length} articles
          </p>

          {/* Article list */}
          <div className="rounded-md border divide-y" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
              >
                <div>
                  <div className="display text-[15px]" style={{ color: "var(--t1)" }}>{a.title}</div>
                  <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                    {formatDate(a.publishedAt).toUpperCase()} · {a.readingTime} MIN READ
                  </div>
                </div>
                <span className="mono text-[11px] flex-shrink-0 ml-4" style={{ color: "var(--t3)" }}>→</span>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-md border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="display font-semibold mb-2" style={{ fontSize: "20px" }}>
              Ready to validate your idea?
            </div>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--t2)" }}>
              Get a GO / KILL / PIVOT verdict in under 60 seconds using real Reddit and GitHub signals.
            </p>
            <Link
              href="/ideas/new"
              className="inline-flex items-center h-9 px-5 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
            >
              Run a validation →
            </Link>
          </div>

          {/* Also explore */}
          <div className="mt-12">
            <div className="mono text-[10px] mb-4 uppercase tracking-[0.1em]" style={{ color: "var(--t3)" }}>Also explore</div>
            <div className="flex flex-col sm:flex-row gap-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/blog/${o.slug}`}
                  className="flex-1 rounded-md border px-4 py-3 transition-colors hover:border-(--t3)"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <div className="display text-[14px] font-semibold mb-1" style={{ color: "var(--t1)" }}>{o.label}</div>
                  <div className="mono text-[10px]" style={{ color: "var(--t3)" }}>{o.description.split(" — ")[0]}</div>
                </Link>
              ))}
            </div>
          </div>

        </div>
        <Footer />
      </div>
    </>
  );
}
