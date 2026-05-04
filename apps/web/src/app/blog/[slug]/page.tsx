import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllArticles, getArticleBySlug, getRelatedArticles } from "@/lib/mdx";
import { formatDate } from "@/lib/mdx-utils";
import { ReadingProgress } from "@/components/blog/ReadingProgress";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  const ogImage = `/api/og?title=${encodeURIComponent(article.title)}&tag=${encodeURIComponent(article.tag)}`;

  return {
    title: `${article.title} — PledgeOFF`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://pledgeoff.com/blog/${slug}`,
    },
  };
}

const TAG_LABELS: Record<string, string> = {
  "idea-validation": "VALIDATION",
  "product-decisions": "STRATEGY",
  "founder": "FIELD NOTES",
};

const TAG_COLORS: Record<string, string> = {
  "idea-validation": "var(--validated)",
  "product-decisions": "var(--accent)",
  "founder": "var(--caution)",
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug, article.tag, 2);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    publisher: {
      "@type": "Organization",
      name: "PledgeOFF",
      url: "https://pledgeoff.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://pledgeoff.com/blog/${slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress />

      <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
        {/* Header */}
        <header className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[1100px] mx-auto px-8 h-14 flex items-center justify-between">
            <Link href="/" className="display text-[13px] font-semibold">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </Link>
            <Link href="/blog" className="mono text-[11px]" style={{ color: "var(--t3)" }}>
              ← All articles
            </Link>
          </div>
        </header>

        {/* Article */}
        <article className="max-w-2xl mx-auto px-6 pt-16 pb-24">

          {/* Category */}
          <div className="mono text-[10px] uppercase tracking-wider" style={{ color: "var(--t3)" }}>
            {TAG_LABELS[article.tag] ?? article.tag}
          </div>

          {/* Title */}
          <h1
            className="display font-bold mt-3 leading-[1.05]"
            style={{ fontSize: "40px", letterSpacing: "-0.04em", color: "var(--t1)" }}
          >
            {article.title}
          </h1>

          {/* Meta row */}
          <div
            className="mt-6 pb-6 flex items-center gap-3 mono text-[11px] flex-wrap"
            style={{ color: "var(--t3)", borderBottom: "1px solid var(--border)" }}
          >
            <span>{formatDate(article.publishedAt).toUpperCase()}</span>
            <span>·</span>
            <span style={{ color: "var(--t2)" }}>PledgeOFF</span>
            <span>·</span>
            <span>{article.readingTime} min read</span>
            {article.affiliateDisclosure && (
              <>
                <span>·</span>
                <span style={{ color: "var(--caution)" }}>affiliate links</span>
              </>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: TAG_COLORS[article.tag] ?? "var(--t3)" }}
              />
              <span style={{ color: TAG_COLORS[article.tag] ?? "var(--t3)" }}>
                {TAG_LABELS[article.tag] ?? article.tag}
              </span>
            </span>
          </div>

          {/* Body */}
          <div className="prose-pledgeoff mt-8">
            <MDXRemote source={article.content} />
          </div>

          {/* Affiliate disclosure */}
          {article.affiliateDisclosure && (
            <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="mono text-[11px] leading-relaxed" style={{ color: "var(--t3)" }}>
                <strong style={{ color: "var(--t2)" }}>Affiliate disclosure:</strong>{" "}
                This article contains affiliate links marked with rel=&quot;nofollow sponsored&quot;. If you
                purchase through them, we may earn a commission at no extra cost to you. We only recommend
                tools we&apos;ve evaluated and believe in.
              </p>
            </div>
          )}

          {/* End-of-article CTA */}
          <div
            className="mt-16 rounded-md border p-6"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div className="mono text-[10px] mb-3" style={{ color: "var(--t3)" }}>END_OF_ARTICLE · CTA</div>
            <div
              className="display font-semibold leading-tight"
              style={{ fontSize: "22px", color: "var(--t1)" }}
            >
              Validate your idea now.
            </div>
            <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "var(--t2)" }}>
              Get a verdict in 15 seconds. Four dimensions, one composite, full per-axis breakdown.
            </p>
            <Link
              href="/ideas/new"
              className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-md display text-[13px] font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Run a validation →
            </Link>
          </div>

          {/* Author */}
          <div
            className="mt-10 pt-8 flex items-start gap-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div
              className="w-10 h-10 rounded-full border flex-shrink-0"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            />
            <div className="flex-1">
              <div className="text-[14px]" style={{ color: "var(--t1)" }}>PledgeOFF Team</div>
              <div className="mono text-[11px] mt-0.5" style={{ color: "var(--t3)" }}>
                Writes on validation &amp; founder strategy
              </div>
            </div>
            <Link href="/blog" className="mono text-[11px] underline" style={{ color: "var(--t3)" }}>
              More posts →
            </Link>
          </div>

          {/* Share */}
          <div
            className="mt-8 pt-6 flex items-center gap-4"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="mono text-[11px] uppercase tracking-[0.08em]" style={{ color: "var(--t3)" }}>
              Share:
            </span>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://pledgeoff.com/blog/${slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:opacity-70"
              style={{ color: "var(--t3)" }}
            >
              Twitter/X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://pledgeoff.com/blog/${slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:opacity-70"
              style={{ color: "var(--t3)" }}
            >
              LinkedIn
            </a>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-16">
              <div className="mono text-[10px] mb-4" style={{ color: "var(--t3)" }}>CONTINUE READING</div>
              <div
                className="rounded-md border divide-y"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                {related.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/blog/${a.slug}`}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
                  >
                    <div>
                      <div className="display text-[15px]" style={{ color: "var(--t1)" }}>{a.title}</div>
                      <div className="mono text-[10px] mt-1" style={{ color: "var(--t3)" }}>
                        {TAG_LABELS[a.tag] ?? a.tag} · {a.readingTime} MIN
                      </div>
                    </div>
                    <span className="mono text-[11px]" style={{ color: "var(--t3)" }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Footer */}
        <footer className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-[1100px] mx-auto px-8 py-8 flex items-center justify-between">
            <span className="display text-[12px] font-semibold">
              Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
            </span>
            <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>© 2026</span>
          </div>
        </footer>
      </div>
    </>
  );
}
