"use client";

import { useState, useMemo } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { WaitlistModal } from "@/components/WaitlistModal";
import { ArticleCard } from "@/components/blog/ArticleCard";
import type { ArticleFrontmatter } from "@/lib/mdx";

const ARTICLES_PER_PAGE = 10;

const TAG_OPTIONS = [
  { value: "all", label: "ALL" },
  { value: "idea-validation", label: "IDEA VALIDATION" },
  { value: "product-decisions", label: "PRODUCT DECISIONS" },
  { value: "founder", label: "FOUNDER MINDSET" },
] as const;

interface BlogPageClientProps {
  articles: ArticleFrontmatter[];
}

export function BlogPageClient({ articles }: BlogPageClientProps) {
  const [activeTag, setActiveTag] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = useMemo(
    () =>
      activeTag === "all"
        ? articles
        : articles.filter((a) => a.tag === activeTag),
    [articles, activeTag]
  );

  const totalPages = Math.ceil(filtered.length / ARTICLES_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ARTICLES_PER_PAGE,
    page * ARTICLES_PER_PAGE
  );

  const handleTagChange = (tag: string) => {
    setActiveTag(tag);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <Nav onWaitlistOpen={() => setModalOpen(true)} />
      <WaitlistModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        source="blog"
      />

      {/* Hero */}
      <section className="max-w-[1320px] mx-auto px-8 pt-16 pb-12 border-b border-[var(--border)]">
        <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-4">
          The PledgeOFF Blog
        </p>
        <h1 className="display text-[52px] font-black leading-[1] text-[var(--t1)] mb-4">
          Decisions backed
          <br />
          by evidence.
        </h1>
        <p className="text-[15px] text-[var(--t2)] max-w-[560px] leading-relaxed mb-8">
          How to validate ideas, prioritize ruthlessly, and build things people
          actually want. No fluff. Every claim is sourced.
        </p>

        <div className="grid grid-cols-3 gap-8 pt-6 border-t border-[var(--border)] max-w-sm">
          {[
            { value: "30+", label: "articles" },
            { value: "14k+", label: "monthly readers" },
            { value: "100%", label: "by founders, for founders" },
          ].map((s) => (
            <div key={s.label}>
              <p className="display text-[22px] font-black text-[var(--t1)] tnum">
                {s.value}
              </p>
              <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.06em] mt-0.5">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Filter tags */}
      <section className="max-w-[1320px] mx-auto px-8 py-6 border-b border-[var(--border)]">
        <div className="flex gap-2 flex-wrap">
          {TAG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTagChange(opt.value)}
              className={`mono text-[10px] uppercase tracking-[0.1em] px-3 py-1.5 rounded border transition-colors ${
                activeTag === opt.value
                  ? "bg-[var(--accent)] text-black border-[var(--accent)]"
                  : "text-[var(--t3)] border-[var(--border)] hover:text-[var(--t2)] hover:border-[var(--t3)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Articles grid */}
      <section className="max-w-[1320px] mx-auto px-8 py-12">
        {paginated.length === 0 ? (
          <p className="text-[14px] text-[var(--t3)]">No articles yet in this category.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-[12px] mono transition-colors ${
                  page === p
                    ? "bg-[var(--accent)] text-black"
                    : "text-[var(--t3)] border border-[var(--border)] hover:text-[var(--t2)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Email capture banner */}
      <section className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-[1320px] mx-auto px-8 py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="mono text-[10px] text-[var(--t3)] uppercase tracking-[0.12em] mb-2">
              Stay Sharp
            </p>
            <h2 className="display text-[28px] font-bold text-[var(--t1)] leading-snug mb-2">
              One decision framework.
              <br />
              Every two weeks.
            </h2>
            <p className="text-[13px] text-[var(--t2)] max-w-xs">
              No noise. No daily emails. Just the one insight that changes how
              you think about your next build.
            </p>
          </div>

          <InlineEmailCapture source="blog-banner" />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function InlineEmailCapture({ source }: { source: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/v1/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source }),
    });
    setStatus(res.ok ? "success" : "error");
  };

  if (status === "success") {
    return (
      <p className="text-[13px] text-[var(--validated)] mono">
        ✓ You&apos;re in. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="h-10 px-4 rounded-md bg-[var(--canvas)] border border-[var(--border)] text-[13px] text-[var(--t1)] placeholder-[var(--t3)] focus:outline-none focus:border-[var(--accent)] transition-colors w-64"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="display h-10 px-5 rounded-md bg-[var(--accent)] text-black text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap"
      >
        Subscribe free →
      </button>
      <p className="mono text-[10px] text-[var(--t3)] self-center hidden sm:block">
        Join 2,847 founders · Unsubscribe anytime
      </p>
    </form>
  );
}
