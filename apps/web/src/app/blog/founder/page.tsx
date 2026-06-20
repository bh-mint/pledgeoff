import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticles, CLUSTER_META } from "@/lib/mdx";
import { formatDate } from "@/lib/mdx-utils";
import { ArticleCTAButton } from "@/components/blog/ArticleCTAButton";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

const TAG = "founder" as const;
const cluster = CLUSTER_META[TAG];
const others = (["idea-validation", "product-decisions"] as const).map((t) => CLUSTER_META[t]);

export const metadata: Metadata = {
  title: "Founder Mindset — Evidence-Based Thinking",
  description: cluster.description,
  alternates: { canonical: "https://pledgeoff.com/blog/founder" },
  openGraph: {
    title: "Founder Mindset — Evidence-Based Thinking | PledgeOFF",
    description: cluster.description,
    url: "https://pledgeoff.com/blog/founder",
    type: "website",
  },
};

const TAG_COLOR = "var(--caution)";

export default function FounderPage() {
  const articles = getAllArticles().filter((a) => a.tag === TAG);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": "https://pledgeoff.com/blog/founder#webpage",
        name: "Founder Mindset — PledgeOFF",
        description: cluster.description,
        url: "https://pledgeoff.com/blog/founder",
        inLanguage: "en",
        publisher: { "@type": "Organization", name: "PledgeOFF", url: "https://pledgeoff.com" },
        hasPart: articles.map((a) => ({
          "@type": "BlogPosting",
          headline: a.title,
          url: `https://pledgeoff.com/blog/${a.slug}`,
          datePublished: a.publishedAt,
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Blog", item: "https://pledgeoff.com/blog" },
          { "@type": "ListItem", position: 2, name: "Founder Mindset", item: "https://pledgeoff.com/blog/founder" },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav extraLink={{ href: "/blog", label: "← All articles" }} />

        <div className="w-page-sm" style={{ paddingTop: 56, paddingBottom: 96 }}>

          {/* Breadcrumb */}
          <div className="mono text-[10px] uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: "var(--faint)" }}>
            <Link href="/blog" className="hover:text-(--t2) transition-colors">Blog</Link>
            <span>›</span>
            <span style={{ color: TAG_COLOR }}>Founder Mindset</span>
          </div>

          {/* Header */}
          <h1 className="display font-bold leading-tight mb-3" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
            Founder Mindset
          </h1>
          <p className="text-[15px] leading-relaxed mb-2" style={{ color: "var(--dim)" }}>
            {cluster.description}
          </p>
          <p className="mono text-[11px] mb-10" style={{ color: "var(--faint)" }}>
            {articles.length} articles
          </p>

          {/* Article list */}
          <div className="rounded-md border divide-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            {articles.map((a) => (
              <Link
                key={a.slug}
                href={`/blog/${a.slug}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
              >
                <div>
                  <div className="display text-[15px]" style={{ color: "var(--ink)" }}>{a.title}</div>
                  <div className="mono text-[10px] mt-1" style={{ color: "var(--faint)" }}>
                    {formatDate(a.publishedAt).toUpperCase()} · {a.readingTime} MIN READ
                  </div>
                </div>
                <span className="mono text-[11px] shrink-0 ml-4" style={{ color: "var(--faint)" }}>→</span>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 border p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
            <div className="display font-semibold mb-2" style={{ fontSize: "20px" }}>
              Stop guessing. Start validating.
            </div>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: "var(--dim)" }}>
              Replace gut feeling with evidence. Real Reddit signals, GitHub trends, GO / KILL / PIVOT in under 60 seconds.
            </p>
            <ArticleCTAButton
              href="/ideas/new"
              location="hub_founder"
              className="inline-flex items-center h-9 px-5 display text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--go)", color: "var(--accent-fg)" }}
            >
              Run a validation →
            </ArticleCTAButton>
          </div>

          {/* Also explore */}
          <div className="mt-12">
            <div className="mono text-[10px] mb-4 uppercase tracking-widest" style={{ color: "var(--faint)" }}>Also explore</div>
            <div className="flex flex-col sm:flex-row gap-3">
              {others.map((o) => (
                <Link
                  key={o.slug}
                  href={`/blog/${o.slug}`}
                  className="flex-1 border px-4 py-3 transition-colors hover:border-(--t3)"
                  style={{ borderColor: "var(--line)", background: "var(--surface)" }}
                >
                  <div className="display text-[14px] font-semibold mb-1" style={{ color: "var(--ink)" }}>{o.label}</div>
                  <div className="mono text-[10px]" style={{ color: "var(--faint)" }}>{o.description.split(" — ")[0]}</div>
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
