"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/mdx-utils";
import type { ArticleFrontmatter } from "@/lib/mdx";

const ARTICLES_PER_PAGE = 9;

type Category = "all" | "idea-validation" | "product-decisions" | "founder";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "All" },
  { value: "idea-validation", label: "Validation" },
  { value: "product-decisions", label: "Strategy" },
  { value: "founder", label: "Field notes" },
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
      {/* Nav */}
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1100px] mx-auto px-8 h-14 flex items-center justify-between">
          <Link href="/" className="display text-[13px] font-semibold">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </Link>
          <nav className="flex items-center gap-6 mono text-[11px]" style={{ color: "var(--t3)" }}>
            <Link href="/pricing" style={{ color: "var(--t2)" }}>Pricing</Link>
            <Link href="/dashboard" style={{ color: "var(--t2)" }}>Dashboard</Link>
            <span style={{ color: "var(--t1)" }}>Blog</span>
            <Link
              href="/login"
              className="rounded-md px-3 h-8 inline-flex items-center"
              style={{ background: "var(--accent)", color: "#000" }}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

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
        </div>
      </section>

      {/* Sticky filter bar */}
      <section
        className="border-b sticky top-0 z-20 backdrop-blur"
        style={{ borderColor: "var(--border)", background: "rgba(10,10,11,0.85)" }}
      >
        <div className="max-w-[1100px] mx-auto px-8 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 mono text-[11px]">
            {CATEGORIES.map(({ value, label }) => {
              const count = tagCount(value);
              const active = activeTag === value;
              return (
                <button
                  key={value}
                  onClick={() => handleTagChange(value)}
                  className="rounded-full border h-7 px-3 inline-flex items-center transition-colors"
                  style={
                    active
                      ? { borderColor: "var(--accent)", background: "var(--surface)", color: "var(--t1)" }
                      : { borderColor: "var(--border)", color: "var(--t2)" }
                  }
                >
                  {label}
                  <span className="ml-1.5 mono text-[10px]" style={{ color: "var(--t3)" }}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="mono text-[10px]" style={{ color: "var(--t3)" }}>SORT · NEWEST FIRST</div>
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
                className="block max-w-[1100px] mx-auto px-8 py-10 transition-colors hover:bg-white/[0.01]"
              >
                <div className="grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-3">
                    <div className="mono text-[10px]" style={{ color: "var(--accent)" }}>▎ FEATURED</div>
                    <div className="mono text-[10px] mt-2" style={{ color: "var(--t3)" }}>
                      {formatDate(featured.publishedAt).toUpperCase()}
                    </div>
                  </div>
                  <div className="col-span-7">
                    <div className="mono text-[10px] uppercase tracking-wider mb-2" style={{ color: "var(--t3)" }}>
                      {categoryLabel(featured.tag)}
                    </div>
                    <h2
                      className="display text-[36px] font-semibold leading-[1.05] transition-colors group-hover:text-[var(--accent)]"
                      style={{ color: "var(--t1)" }}
                    >
                      {featured.title}
                    </h2>
                    <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--t2)" }}>
                      {featured.excerpt}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
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
            <div className="max-w-[1100px] mx-auto px-8">
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {rest.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/blog/${article.slug}`}
                    className="grid grid-cols-12 gap-6 items-center py-6 border-b transition-colors hover:bg-white/[0.015]"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="col-span-2 mono text-[11px]" style={{ color: "var(--t3)" }}>
                      {formatDate(article.publishedAt).toUpperCase()}
                    </div>
                    <div className="col-span-1 mono text-[10px] uppercase" style={{ color: "var(--t3)" }}>
                      {categoryLabel(article.tag)}
                    </div>
                    <div
                      className="col-span-7 display text-[18px] font-medium transition-colors"
                      style={{ color: "var(--t1)" }}
                    >
                      {article.title}
                    </div>
                    <div className="col-span-1 mono text-[11px]" style={{ color: "var(--t3)" }}>
                      {article.readingTime} MIN
                    </div>
                    <div className="col-span-1 mono text-[11px] text-right" style={{ color: "var(--t3)" }}>
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
                      className="rounded-md border h-8 px-3 inline-flex items-center disabled:opacity-40 transition-colors hover:border-[var(--t3)]"
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

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-[1100px] mx-auto px-8 py-8 flex items-center justify-between">
          <span className="display text-[12px] font-semibold">
            Pledge<span style={{ color: "var(--accent)" }}>OFF</span>
          </span>
          <span className="mono text-[10px]" style={{ color: "var(--t3)" }}>© 2026 · all rights reserved</span>
        </div>
      </footer>
    </div>
  );
}
