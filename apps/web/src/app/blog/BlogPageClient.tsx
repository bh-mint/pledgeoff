"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/mdx-utils";
import type { ArticleFrontmatter } from "@/lib/mdx";
import { PublicNav } from "@/components/PublicNav";
import { Footer } from "@/components/Footer";

const ARTICLES_PER_PAGE = 9;

const START_HERE_SLUGS = [
  "how-to-know-if-youre-building-for-a-real-problem",
  "how-to-find-out-if-people-will-pay-for-your-idea",
  "how-to-decide-when-to-quit-your-idea-and-move-on",
];

// Updated weekly — slug of the most-read article this week
const TRENDING_SLUG = "how-to-know-if-youre-building-for-a-real-problem";

type Category = "all" | "idea-validation" | "product-decisions" | "founder";

const CATEGORIES: { value: Category; label: string; color?: string }[] = [
  { value: "all", label: "All" },
  { value: "idea-validation", label: "Idea Validation", color: "var(--validated)" },
  { value: "product-decisions", label: "Product Decisions", color: "var(--go)" },
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
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const byTag = activeTag === "all" ? articles : articles.filter((a) => a.tag === activeTag);
    if (!query.trim()) return byTag;
    const q = query.toLowerCase();
    return byTag.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.excerpt ?? "").toLowerCase().includes(q)
    );
  }, [articles, activeTag, query]);

  const totalPages = Math.ceil(filtered.length / ARTICLES_PER_PAGE);
  const featured = filtered[0];
  const rest = filtered.slice(1, ARTICLES_PER_PAGE * page);

  const handleTagChange = (tag: Category) => {
    setActiveTag(tag);
    setPage(1);
    setQuery("");
  };

  const tagCount = (tag: Category) =>
    tag === "all" ? articles.length : articles.filter((a) => a.tag === tag).length;

  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)" }}>
      <PublicNav />

      {/* Hero */}
      <section className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="w-bleed" style={{ paddingTop: 64, paddingBottom: 64 }}>
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 pulse-dot" style={{ background: "var(--go)" }} />
            <span className="mono text-[10px] tracking-wider uppercase" style={{ color: "var(--faint)" }}>
              INSIGHTS · UPDATED WEEKLY
            </span>
          </div>
          <h1
            className="display font-semibold leading-[0.95]"
            style={{ fontSize: "clamp(40px, 7vw, 72px)", color: "var(--ink)" }}
          >
            The Founder&apos;s<br />Intelligence Briefing.
          </h1>
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed" style={{ color: "var(--dim)" }}>
            Field notes on validation, market timing, and killing ideas before they kill you.
            No hype, no growth-hacks — just signal.
          </p>

          {/* Stats strip */}
          <div
            className="mt-10 grid grid-cols-3 max-w-md gap-px border overflow-hidden"
            style={{ borderColor: "var(--line)", background: "var(--line)" }}
          >
            {[
              { value: String(articles.length), label: "ARTICLES" },
              { value: "Weekly", label: "NEW CONTENT" },
              { value: "7m", label: "AVG READ" },
            ].map(({ value, label }) => (
              <div key={label} className="p-4" style={{ background: "var(--bg)" }}>
                <div className="display text-[28px] font-semibold tnum">{value}</div>
                <div className="mono text-[10px]" style={{ color: "var(--faint)" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Browse by topic — filters in-page */}
          <div className="mt-10 max-w-xl">
            <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--faint)" }}>Browse by topic</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.value !== "all").map((c) => {
                const isActive = activeTag === c.value;
                const count = tagCount(c.value);
                return (
                  <button
                    key={c.value}
                    onClick={() => handleTagChange(c.value)}
                    className="mono text-[11px] border h-8 px-3 inline-flex items-center gap-1.5 transition-all"
                    style={{
                      borderColor: isActive ? c.color : "var(--line)",
                      color: isActive ? c.color : "var(--faint)",
                      background: isActive ? `${c.color}12` : "transparent",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {isActive && <span className="text-[8px]" aria-hidden="true">●</span>}
                    {c.label}
                    <span style={{ opacity: 0.6 }}>({count})</span>
                  </button>
                );
              })}
              {activeTag !== "all" && (
                <button
                  onClick={() => handleTagChange("all")}
                  aria-label="Clear filter"
                  className="mono text-[11px] border h-8 px-3 inline-flex items-center transition-colors"
                  style={{ borderColor: "var(--line)", color: "var(--faint)" }}
                >
                  × clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Start here — always visible */}
      <section className="border-b" style={{ borderColor: "var(--line)" }}>
          <div className="w-bleed" style={{ paddingTop: 32, paddingBottom: 32 }}>
            <div className="mono text-[10px] uppercase tracking-widest mb-4" style={{ color: "var(--faint)" }}>
              ▎ Start here — if it&apos;s your first time
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {articles
                .filter((a) => START_HERE_SLUGS.includes(a.slug))
                .sort((a, b) => START_HERE_SLUGS.indexOf(a.slug) - START_HERE_SLUGS.indexOf(b.slug))
                .map((a, i) => (
                  <Link
                    key={a.slug}
                    href={`/blog/${a.slug}`}
                    className="group border p-4 transition-colors hover:bg-white/2"
                    style={{ borderColor: "var(--line)", background: "var(--surface)" }}
                  >
                    <div className="mono text-[10px] mb-2" style={{ color: "var(--faint)" }}>
                      READ FIRST · 0{i + 1}
                    </div>
                    <div className="display text-[15px] font-medium leading-snug group-hover:underline" style={{ color: "var(--ink)" }}>
                      {a.title}
                    </div>
                    <div className="mono text-[10px] mt-2" style={{ color: "var(--faint)" }}>
                      {a.readingTime} min read →
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>

      {/* Sticky filter bar */}
      <section
        className="border-b sticky top-12 z-40 backdrop-blur"
        style={{ borderColor: "var(--line)", background: "rgba(10,10,11,0.85)" }}
      >
        <div className="w-page h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 mono text-[11px] overflow-x-auto">
            {CATEGORIES.map(({ value, label, color }) => {
              const count = tagCount(value);
              const active = activeTag === value;
              const activeColor = color ?? "var(--go)";
              return (
                <button
                  key={value}
                  onClick={() => handleTagChange(value)}
                  className="rounded-full border h-8 px-3 inline-flex items-center transition-all shrink-0"
                  style={
                    active
                      ? { borderColor: activeColor, background: `${activeColor}15`, color: "var(--ink)" }
                      : { borderColor: "var(--line)", color: "var(--dim)" }
                  }
                >
                  {active && <span className="mr-1 text-[8px]" style={{ color: activeColor }} aria-hidden="true">●</span>}
                  {label}
                  <span className="ml-1.5 mono text-[10px]" style={{ color: "var(--faint)" }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search…"
          aria-label="Search articles"
          className="mono text-[11px] h-8 px-3 border bg-transparent outline-none w-28 focus:w-44 transition-all"
          style={{ borderColor: "var(--line)", color: "var(--ink)" }}
        />
      </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="w-bleed" style={{ paddingTop: 96, paddingBottom: 96, textAlign: "center" }}>
          <p className="text-[14px]" style={{ color: "var(--faint)" }}>No articles in this category yet.</p>
        </div>
      ) : (
        <>
          {/* Featured article */}
          {featured && (
            <section className="border-b" style={{ borderColor: "var(--line)" }}>
              <Link
                href={`/blog/${featured.slug}`}
                className="block w-page transition-colors hover:bg-white/1"
                style={{ paddingTop: 32, paddingBottom: 40 }}
              >
                <div className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-8 sm:items-start gap-3">
                  <div className="sm:col-span-3 flex items-center gap-3 sm:block">
                    <div className="mono text-[10px]" style={{ color: "var(--go)" }}>▎ FEATURED</div>
                    {featured.slug === TRENDING_SLUG && (
                      <span
                        className="mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 inline-flex items-center gap-1 sm:mt-1"
                        style={{
                          color: "var(--caution)",
                          background: "color-mix(in srgb, var(--caution) 12%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--caution) 25%, transparent)",
                        }}
                      >
                        <span aria-hidden="true">▲ </span>trending
                      </span>
                    )}
                    <div className="mono text-[10px] sm:mt-2" style={{ color: "var(--faint)" }}>
                      {formatDate(featured.publishedAt).toUpperCase()}
                    </div>
                    <div className="sm:hidden ml-auto mono text-[10px]" style={{ color: "var(--faint)" }}>
                      {featured.readingTime} MIN
                    </div>
                  </div>
                  <div className="sm:col-span-7">
                    <div className="mono text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--faint)" }}>
                      {categoryLabel(featured.tag)}
                    </div>
                    <h2
                      className="display text-[28px] sm:text-[36px] font-semibold leading-[1.05]"
                      style={{ color: "var(--ink)" }}
                    >
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--dim)" }}>
                      {featured.excerpt}
                    </p>
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-right">
                    <div className="mono text-[10px]" style={{ color: "var(--faint)" }}>
                      {featured.readingTime} MIN
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Article list rows */}
          <section>
            <div className="w-bleed">
              <div className="divide-y" style={{ borderColor: "var(--line)" }}>
                {rest.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/blog/${article.slug}`}
                    className="flex flex-col sm:grid sm:grid-cols-12 sm:gap-6 sm:items-center py-5 sm:py-6 border-b transition-colors hover:bg-white/1.5"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <div className="flex items-center gap-3 mb-1 sm:contents">
                      <div className="sm:col-span-2 mono text-[10px] sm:text-[11px]" style={{ color: "var(--faint)" }}>
                        {formatDate(article.publishedAt).toUpperCase()}
                      </div>
                      <div className="sm:col-span-1 mono text-[10px] uppercase" style={{ color: "var(--faint)" }}>
                        {categoryLabel(article.tag)}
                      </div>
                      <div className="sm:hidden ml-auto flex items-center gap-2 mono text-[10px]" style={{ color: "var(--faint)" }}>
                        <span>{article.readingTime} MIN</span>
                        <span>→</span>
                      </div>
                    </div>
                    <div className="sm:col-span-7">
                      <div
                        className="display text-[16px] sm:text-[18px] font-medium leading-snug"
                        style={{ color: "var(--ink)" }}
                      >
                        {article.title}
                      </div>
                      {article.slug === TRENDING_SLUG && (
                        <span
                          className="mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 inline-flex items-center gap-1 mt-1"
                          style={{
                            color: "var(--caution)",
                            background: "color-mix(in srgb, var(--caution) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--caution) 25%, transparent)",
                          }}
                        >
                          <span aria-hidden="true">▲ </span>trending this week
                        </span>
                      )}
                    </div>
                    <div className="hidden sm:block sm:col-span-1 mono text-[11px]" style={{ color: "var(--faint)" }}>
                      {article.readingTime} MIN
                    </div>
                    <div className="hidden sm:block sm:col-span-1 mono text-[11px] text-right" style={{ color: "var(--faint)" }}>
                      →
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div
                className="flex items-center justify-between py-10 mono text-[11px]"
                style={{ color: "var(--faint)" }}
              >
                <span>{filtered.length === 1 ? "1 article" : `${Math.min(ARTICLES_PER_PAGE * page, filtered.length)} of ${filtered.length} articles`}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-md border h-8 px-3 inline-flex items-center disabled:opacity-40 transition-colors hover:border-(--t3)"
                      style={{ borderColor: "var(--line)" }}
                    >
                      ← prev
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-md border h-8 px-3 inline-flex items-center disabled:opacity-40 transition-colors"
                      style={{ borderColor: "var(--line)", color: "var(--ink)" }}
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
