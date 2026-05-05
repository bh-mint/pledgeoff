"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/mdx-utils";
import type { ArticleFrontmatter } from "@/lib/mdx";
import { PreLoginNav } from "@/components/PreLoginNav";
import { Footer } from "@/components/Footer";

const ARTICLES_PER_PAGE = 9;

type Category = "all" | "idea-validation" | "product-decisions" | "founder";

const CATEGORIES: { value: Category; label: string; color?: string }[] = [
  { value: "all", label: "All" },
  { value: "idea-validation", label: "Idea Validation", color: "var(--validated)" },
  { value: "product-decisions", label: "Product Decisions", color: "var(--accent)" },
  { value: "founder", label: "Founder Mindset", color: "var(--caution)" },
];

function categoryLabel(tag: string) {
  switch (tag) {
    case "idea-validation": return "VALIDATION";
    case "product-decisions": return "STRATEGY";
    case "founder": return "FIELD NOTES";
    default: return tag.toUpperCase();
  }
}

interface BlogPageClientProps {
  articles: ArticleFrontmatter[];
}

export function BlogPageClient({ articles }: BlogPageClientProps) {
  const [activeTag, setActiveTag] = useState<Category>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => activeTag === "all" ? articles : articles.filter((a) => a.tag === activeTag),
    [articles, activeTag]
  );

  const totalPages = Math.ceil(filtered.length / ARTICLES_PER_PAGE);
  const featured = filtered[0];
  const rest = filtered.slice(1, ARTICLES_PER_PAGE * page);

  const handleTagChange = (tag: Category) => {
    setActiveTag(tag);
    setPage(1);
  };

  const tagCount = (tag: Category) =>
    tag === "all" ? articles.length : articles.filter((a) => a.tag === tag).length;

  return (
    <div style={{ background: "var(--canvas)", color: "var(--t1)" }}>
      <PreLoginNav />

      {/* Hero */}
      <section className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1100px] mx-auto px-8 py-16">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--accent)" }} />
            <span className="mono text-[10px] tracking-wider uppercase" style={{ color: "var(--t3)" }}>
              INSIGHTS · UPDATED WEEKLY
            </span>
          </div>
          <h1
            className="display font-semibold leading-[0.95]"
            style={{ fontSize: "clamp(40px, 7vw, 72px)", color: "var(--t1)" }}
          >
            The Founder&apos;s<br />Intelligence Briefing.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed" style={{ color: "var(--t2)" }}>
            Field notes on validation, market timing, and killing ideas before they kill you.
            No hype, no growth-hacks — just signal.
          </p>

          {/* Stats strip */}
          <div
            className="mt-10 grid grid-cols-3 max-w-md gap-px rounded-md border overflow-hidden"
            style={{ borderColor: "var(--border)", background: "var(--border)" }}
          >
            {[
              { value: String(articles.length), label: "ARTICLES" },
              { value: "11.4k", label: "SUBSCRIBERS" },
              { value: "7m", label: "AVG READ" },
            ].map(({ value, label }) => (
              <div key={label} className="p-4" style={{ background: "var(--canvas)" }}>
                <div className="display text-[28px] font-semibold tnum">{value}</div>
                <div className="mono text-[10px]" style={{ color: "var(--t3)" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Browse by topic — filters in-page */}
          <div className="mt-10 max-w-xl">
            <div className="mono text-[10px] uppercase tracking-[0.1em] mb-3" style={{ color: "var(--t3)" }}>Browse by topic</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.value !== "all").map((c) => {
                const isActive = activeTag === c.value;
                return (
                  <button
                    key={c.value}
                    onClick={() => handleTagChange(c.value)}
                    className="mono text-[11px] rounded-full border h-7 px-3 inline-flex items-center transition-all"
                    style={{
                      borderColor: isActive ? c.color : "var(--border)",
                      color: isActive ? c.color : "var(--t3)",
                      background: isActive ? `${c.color}12` : "transparent",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {isActive && <span className="mr-1.5 text-[8px]">●</span>}
                    {c.label}
                  </button>
                );
              })}
              {activeTag !== "all" && (
                <button
                  onClick={() => handleTagChange("all")}
                  className="mono text-[11px] rounded-full border h-7 px-3 inline-flex items-center transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--t3)" }}
                >
                  × clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky filter bar */}
      <section
        className="border-b sticky top-12 z-40 backdrop-blur"
        style={{ borderColor: "var(--border)", background: "rgba(10,10,11,0.85)" }}
      >
        <div className="max-w-[1100px] mx-auto px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 mono text-[11px] overflow-x-auto">
            {CATEGORIES.map(({ value, label, color }) => {
              const count = tagCount(value);
              const active = activeTag === value;
              const activeColor = color ?? "var(--accent)";
              return (
                <button
                  key={value}
                  onClick={() => handleTagChange(value)}
                  className="rounded-full border h-7 px-3 inline-flex items-center transition-all flex-shrink-0"
                  style={
                    active
                      ? { borderColor: activeColor, background: `${activeColor}15`, color: "var(--t1)" }
                      : { borderColor: "var(--border)", color: "var(--t2)" }
                  }
                >
                  {active && <span className="mr-1 text-[8px]" style={{ color: activeColor }}>●</span>}
                  {label}
                  <span className="ml-1.5 mono text-[10px]" style={{ color: "var(--t3)" }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="mono text-[10px] hidden sm:block flex-shrink-0 ml-4" style={{ color: "var(--t3)" }}>SORT · NEWEST FIRST</div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="max-w-[1100px] mx-auto px-8 py-24 text-center">
          <p className="text-[14px]" style={{ color: "var(--t3)" }}>No articles in this category yet.</p>
        </div>
      ) : (
        <>
          {/* Featured article */}
          {featured && (
            <section className="border-b" style={{ borderColor: "var(--border)" }}>
              <Link
                href={`/blog/${featured.slug}`}
                className="block max-w-[1100px] mx-auto px-4 sm:px-8 py-8 sm:py-10 transition-colors hover:bg-white/[0.01]"
              >
                <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-8 sm:items-start gap-3">
                  <div className="sm:col-span-3 flex items-center gap-3 sm:block">
                    <div className="mono text-[10px]" style={{ color: "var(--accent)" }}>▎ FEATURED</div>
                    <div className="mono text-[10px] sm:mt-2" style={{ color: "var(--t3)" }}>
                      {formatDate(featured.publishedAt).toUpperCase()}
                    </div>
                    <div className="sm:hidden ml-auto mono text-[10px]" style={{ color: "var(--t3)" }}>
                      {featured.readingTime} MIN
                    </div>
                  </div>
                  <div className="sm:col-span-7">
                    <div className="mono text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--t3)" }}>
                      {categoryLabel(featured.tag)}
                    </div>
                    <h2
                      className="display text-[28px] sm:text-[36px] font-semibold leading-[1.05]"
                      style={{ color: "var(--t1)" }}
                    >
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--t2)" }}>
                      {featured.excerpt}
                    </p>
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-right">
                    <div className="mono text-[10px]" style={{ color: "var(--t3)" }}>
                      {featured.readingTime} MIN
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Article list rows */}
          <section>
            <div className="max-w-[1100px] mx-auto px-4 sm:px-8">
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {rest.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/blog/${article.slug}`}
                    className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-6 sm:items-center py-5 sm:py-6 border-b transition-colors hover:bg-white/[0.015]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center gap-3 mb-1 sm:contents">
                      <div className="sm:col-span-2 mono text-[10px] sm:text-[11px]" style={{ color: "var(--t3)" }}>
                        {formatDate(article.publishedAt).toUpperCase()}
                      </div>
                      <div className="sm:col-span-1 mono text-[10px] uppercase" style={{ color: "var(--t3)" }}>
                        {categoryLabel(article.tag)}
                      </div>
                      <div className="sm:hidden ml-auto flex items-center gap-2 mono text-[10px]" style={{ color: "var(--t3)" }}>
                        <span>{article.readingTime} MIN</span>
                        <span>→</span>
                      </div>
                    </div>
                    <div
                      className="sm:col-span-7 display text-[16px] sm:text-[18px] font-medium leading-snug"
                      style={{ color: "var(--t1)" }}
                    >
                      {article.title}
                    </div>
                    <div className="hidden sm:block sm:col-span-1 mono text-[11px]" style={{ color: "var(--t3)" }}>
                      {article.readingTime} MIN
                    </div>
                    <div className="hidden sm:block sm:col-span-1 mono text-[11px] text-right" style={{ color: "var(--t3)" }}>
                      →
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div
                className="flex items-center justify-between py-10 mono text-[11px]"
                style={{ color: "var(--t3)" }}
              >
                <span>{filtered.length === 1 ? "1 article" : `${Math.min(ARTICLES_PER_PAGE * page, filtered.length)} of ${filtered.length} articles`}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-md border h-8 px-3 inline-flex items-center disabled:opacity-40 transition-colors hover:border-(--t3)"
                      style={{ borderColor: "var(--border)" }}
                    >
                      ← prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-md border h-8 px-3 inline-flex items-center disabled:opacity-40 transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--t1)" }}
                    >
                      next →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}
