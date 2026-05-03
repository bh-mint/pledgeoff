import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllArticles, getArticleBySlug, getRelatedArticles } from "@/lib/mdx";
import { formatDate } from "@/lib/mdx-utils";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ArticleCard } from "@/components/blog/ArticleCard";
import { TableOfContents } from "@/components/blog/TableOfContents";
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
  "idea-validation": "IDEA VALIDATION",
  "product-decisions": "PRODUCT DECISIONS",
  "founder": "FOUNDER MINDSET",
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug, article.tag, 3);

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

      <div className="min-h-screen bg-[var(--canvas)]">
        <Nav />

        <div className="max-w-[1320px] mx-auto px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-12">
            {/* Article */}
            <article>
              {/* Header */}
              <header className="mb-10 pb-10 border-b border-[var(--border)]">
                <span className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--t3)]">
                  {TAG_LABELS[article.tag] ?? article.tag}
                </span>
                <h1 className="display text-[40px] font-black leading-[1.1] text-[var(--t1)] mt-3 mb-4">
                  {article.title}
                </h1>
                <p className="text-[16px] text-[var(--t2)] leading-relaxed mb-6 max-w-[640px]">
                  {article.excerpt}
                </p>
                <div className="flex items-center gap-4 mono text-[11px] text-[var(--t3)] uppercase tracking-[0.06em]">
                  <span>{formatDate(article.publishedAt)}</span>
                  <span>·</span>
                  <span>{article.readingTimeText}</span>
                  {article.affiliateDisclosure && (
                    <>
                      <span>·</span>
                      <span className="text-[var(--t3)]">contains affiliate links</span>
                    </>
                  )}
                </div>
              </header>

              {/* Body */}
              <div className="prose-pledgeoff">
                <MDXRemote source={article.content} />
              </div>

              {/* Affiliate disclosure */}
              {article.affiliateDisclosure && (
                <div className="mt-12 pt-6 border-t border-[var(--border)]">
                  <p className="mono text-[11px] text-[var(--t3)] leading-relaxed">
                    <strong className="text-[var(--t2)]">Affiliate disclosure:</strong>{" "}
                    This article contains affiliate links. If you purchase through them, we
                    may earn a commission at no extra cost to you. We only recommend tools
                    we&apos;ve evaluated and believe in.
                  </p>
                </div>
              )}

              {/* Share */}
              <div className="mt-10 pt-6 border-t border-[var(--border)] flex items-center gap-4">
                <span className="mono text-[11px] text-[var(--t3)] uppercase tracking-[0.08em]">Share:</span>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`https://pledgeoff.com/blog/${slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-[11px] text-[var(--t3)] hover:text-[var(--accent)] transition-colors uppercase tracking-[0.06em]"
                >
                  Twitter/X
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://pledgeoff.com/blog/${slug}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-[11px] text-[var(--t3)] hover:text-[var(--accent)] transition-colors uppercase tracking-[0.06em]"
                >
                  LinkedIn
                </a>
              </div>

              {/* CTA box */}
              <div className="mt-12 p-8 bg-[var(--surface)] border border-[var(--border)] rounded-md">
                <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-2">
                  Stop guessing. Start deciding.
                </p>
                <h2 className="display text-[24px] font-bold text-[var(--t1)] mb-3">
                  See a GO / KILL / PIVOT verdict on your idea in 15 seconds.
                </h2>
                <p className="text-[14px] text-[var(--t2)] mb-6 max-w-md leading-relaxed">
                  PledgeOFF scans 847 live signals from Reddit and GitHub and
                  returns a weighted verdict with verbatim evidence. Free to try.
                </p>
                <a
                  href="/"
                  className="display inline-block h-11 px-6 rounded-md bg-[var(--accent)] text-black text-[14px] font-semibold hover:opacity-90 transition-opacity leading-[44px]"
                >
                  Validate my idea →
                </a>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <TableOfContents />
              </div>
            </aside>
          </div>

          {/* Related articles */}
          {related.length > 0 && (
            <section className="mt-20 pt-12 border-t border-[var(--border)]">
              <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-6">
                Related articles
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {related.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
            </section>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
