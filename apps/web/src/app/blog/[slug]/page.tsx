import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/lib/mdx-components";
import { getAllArticles, getArticleBySlug, getRelatedArticles, getSeeAlsoArticles, CLUSTER_META } from "@/lib/mdx";
import { formatDate } from "@/lib/mdx-utils";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { ArticleViewTracker } from "@/components/blog/ArticleViewTracker";
import { ArticleCTAButton } from "@/components/blog/ArticleCTAButton";
import { ArticleFeedback } from "@/components/blog/ArticleFeedback";
import { MidArticleCTA } from "@/components/blog/MidArticleCTA";
import { HighlightToTweet } from "@/components/blog/HighlightToTweet";
import { CopyLinkButton } from "@/components/blog/CopyLinkButton";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

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

  const ogImage = `/api/og?title=${encodeURIComponent(article.title)}&tag=${encodeURIComponent(article.tag)}&excerpt=${encodeURIComponent(article.excerpt ?? "")}`;

  return {
    title: article.title,
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
  "product-decisions": "var(--go)",
  "founder": "var(--caution)",
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug, article.tag, 2);
  const seeAlso = getSeeAlsoArticles(slug, article.tag, 2);
  const cluster = CLUSTER_META[article.tag];

  const ogImage = `/api/og?title=${encodeURIComponent(article.title)}&tag=${encodeURIComponent(article.tag)}&excerpt=${encodeURIComponent(article.excerpt ?? "")}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: "PledgeOFF",
      url: "https://pledgeoff.com",
    },
    publisher: {
      "@type": "Organization",
      name: "PledgeOFF",
      url: "https://pledgeoff.com",
    },
    image: `https://pledgeoff.com${ogImage}`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://pledgeoff.com/blog/${slug}`,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: "https://pledgeoff.com/blog" },
      { "@type": "ListItem", position: 2, name: cluster.label, item: `https://pledgeoff.com/blog/${cluster.slug}` },
      { "@type": "ListItem", position: 3, name: article.title, item: `https://pledgeoff.com/blog/${slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ReadingProgress />
      <ArticleViewTracker slug={slug} tag={article.tag} />

      <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
        <PublicNav extraLink={{ href: "/blog", label: "← All articles" }} />

        {/* Article */}
        <article className="w-page-sm" style={{ paddingTop: 64, paddingBottom: 96 }}>

          {/* Category */}
          <div className="mono text-[10px] uppercase tracking-wider" style={{ color: "var(--faint)" }}>
            {TAG_LABELS[article.tag] ?? article.tag}
          </div>

          {/* Title */}
          <h1
            className="display font-bold mt-3 leading-[1.05]"
            style={{ fontSize: "40px", letterSpacing: "-0.04em", color: "var(--ink)" }}
          >
            {article.title}
          </h1>

          {/* Meta row */}
          <div
            className="mt-6 pb-6 flex items-center gap-3 mono text-[11px] flex-wrap"
            style={{ color: "var(--faint)", borderBottom: "1px solid var(--line)" }}
          >
            <span>{formatDate(article.publishedAt).toUpperCase()}</span>
            <span>·</span>
            <span style={{ color: "var(--dim)" }}>PledgeOFF</span>
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
                className="w-1.5 h-1.5"
                style={{ background: TAG_COLORS[article.tag] ?? "var(--faint)" }}
              />
              <span style={{ color: TAG_COLORS[article.tag] ?? "var(--faint)" }}>
                {TAG_LABELS[article.tag] ?? article.tag}
              </span>
            </span>
          </div>

          {/* Table of Contents */}
          <div className="mt-8">
            <TableOfContents />
          </div>

          {/* Body */}
          <div className="prose-pledgeoff mt-6">
            <MDXRemote source={article.content} components={mdxComponents} />
          </div>

          {/* Highlight to share on X */}
          <HighlightToTweet />

          {/* Mid-article CTA — fires at 60% scroll */}
          <MidArticleCTA />

          {/* Affiliate disclosure */}
          {article.affiliateDisclosure && (
            <div className="mt-12 pt-6" style={{ borderTop: "1px solid var(--line)" }}>
              <p className="mono text-[11px] leading-relaxed" style={{ color: "var(--faint)" }}>
                <strong style={{ color: "var(--dim)" }}>Affiliate disclosure:</strong>{" "}
                This article contains affiliate links marked with rel=&quot;nofollow sponsored&quot;. If you
                purchase through them, we may earn a commission at no extra cost to you. We only recommend
                tools we&apos;ve evaluated and believe in.
              </p>
            </div>
          )}

          {/* End-of-article CTA */}
          <div
            className="mt-16 border p-6"
            style={{ borderColor: "var(--line)", background: "var(--surface)" }}
          >
            <div className="mono text-[10px] mb-3" style={{ color: "var(--faint)" }}>
              You just learned how.
            </div>
            <div
              className="display font-semibold leading-tight"
              style={{ fontSize: "22px", color: "var(--ink)" }}
            >
              Now let the data decide.
            </div>
            <p className="text-[14px] mt-2 leading-relaxed" style={{ color: "var(--dim)" }}>
              PledgeOFF scans thousands of live signals from Reddit and GitHub and returns GO / KILL / PIVOT in under 60 seconds.
              No surveys. No guesswork. Just evidence.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <ArticleCTAButton
                href="/ideas/new"
                location="article_end"
                className="inline-flex items-center gap-2 h-10 px-5 display text-[13px] font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--go)", color: "var(--accent-fg)" }}
              >
                Validate your idea →
              </ArticleCTAButton>
              <span className="mono text-[11px]" style={{ color: "var(--faint)" }}>
                Free to start · 1 validation/month · No credit card
              </span>
            </div>
          </div>

          {/* Author */}
          <div
            className="mt-10 pt-8 flex items-start gap-4"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <div
              className="w-10 h-10 border shrink-0 flex items-center justify-center mono text-[11px]"
              style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--faint)" }}
            >
              PO
            </div>
            <div className="flex-1">
              <div className="text-[14px]" style={{ color: "var(--ink)" }}>
                PledgeOFF Team{" "}
                <Link href="/about" className="mono text-[11px] underline" style={{ color: "var(--faint)" }}>
                  About us →
                </Link>
              </div>
              <div className="mono text-[11px] mt-0.5" style={{ color: "var(--faint)" }}>
                Writes on idea validation, market timing &amp; founder strategy
              </div>
            </div>
            <Link href="/blog" className="mono text-[11px] underline shrink-0" style={{ color: "var(--faint)" }}>
              All posts →
            </Link>
          </div>

          {/* Share */}
          <div
            className="mt-8 pt-6 flex items-center gap-4"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <span className="mono text-[11px] uppercase tracking-[0.08em]" style={{ color: "var(--faint)" }}>
              Share:
            </span>
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://pledgeoff.com/blog/${slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:opacity-70"
              style={{ color: "var(--faint)" }}
            >
              Share on X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://pledgeoff.com/blog/${slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mono text-[11px] uppercase tracking-[0.06em] transition-colors hover:opacity-70"
              style={{ color: "var(--faint)" }}
            >
              LinkedIn
            </a>
            <CopyLinkButton url={`https://pledgeoff.com/blog/${slug}`} />
          </div>

          {/* Feedback */}
          <ArticleFeedback slug={slug} />

          {/* Related — same cluster */}
          {related.length > 0 && (
            <div className="mt-16">
              <div className="mono text-[10px] mb-4" style={{ color: "var(--faint)" }}>CONTINUE READING · {cluster.label.toUpperCase()}</div>
              <div
                className="rounded-md border divide-y"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                {related.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/blog/${a.slug}`}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
                  >
                    <div>
                      <div className="display text-[15px]" style={{ color: "var(--ink)" }}>{a.title}</div>
                      <div className="mono text-[10px] mt-1" style={{ color: "var(--faint)" }}>
                        {TAG_LABELS[a.tag] ?? a.tag} · {a.readingTime} MIN
                      </div>
                    </div>
                    <span className="mono text-[11px]" style={{ color: "var(--faint)" }}>→</span>
                  </Link>
                ))}
                <Link
                  href={`/blog/${cluster.slug}`}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-white/5"
                >
                  <span className="mono text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--faint)" }}>
                    All {cluster.label} articles →
                  </span>
                </Link>
              </div>
            </div>
          )}

          {/* See also — cross-cluster */}
          {seeAlso.length > 0 && (
            <div className="mt-8">
              <div className="mono text-[10px] mb-4" style={{ color: "var(--faint)" }}>SEE ALSO</div>
              <div
                className="rounded-md border divide-y"
                style={{ borderColor: "var(--line)", background: "var(--surface)" }}
              >
                {seeAlso.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/blog/${a.slug}`}
                    className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/5"
                  >
                    <div>
                      <div className="display text-[15px]" style={{ color: "var(--ink)" }}>{a.title}</div>
                      <div className="mono text-[10px] mt-1" style={{ color: "var(--faint)" }}>
                        {TAG_LABELS[a.tag] ?? a.tag} · {a.readingTime} MIN
                      </div>
                    </div>
                    <span className="mono text-[11px]" style={{ color: "var(--faint)" }}>→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        <Footer />
      </div>
    </>
  );
}
