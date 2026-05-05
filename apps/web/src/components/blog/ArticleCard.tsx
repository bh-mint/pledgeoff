import Link from "next/link";
import type { ArticleFrontmatter } from "@/lib/mdx";
import { formatDate } from "@/lib/mdx-utils";

const TAG_COLORS: Record<string, string> = {
  "idea-validation":   "text-[#CAFF47] bg-[#CAFF47]/10 border-[#CAFF47]/20",
  "product-decisions": "text-[#F5A623] bg-[#F5A623]/10 border-[#F5A623]/20",
  "founder":           "text-[#60A5FA] bg-[#60A5FA]/10 border-[#60A5FA]/20",
};

const TAG_LABELS: Record<string, string> = {
  "idea-validation":   "IDEA VALIDATION",
  "product-decisions": "PRODUCT DECISIONS",
  "founder":           "FOUNDER MINDSET",
};

export function ArticleCard({ article }: { article: ArticleFrontmatter }) {
  const tagColor = TAG_COLORS[article.tag] ?? "text-(--t3)";
  const tagLabel = TAG_LABELS[article.tag] ?? article.tag;

  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block bg-(--surface) border border-(--border) rounded-md p-6 hover:border-(--t3) transition-colors"
    >
      <span
        className={`mono text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 rounded border ${tagColor}`}
      >
        {tagLabel}
      </span>

      <h2 className="display text-[17px] font-semibold text-(--t1) mt-3 mb-2 leading-snug group-hover:text-(--accent) transition-colors">
        {article.title}
      </h2>

      <p className="text-[13px] text-(--t2) leading-relaxed line-clamp-2">
        {article.excerpt}
      </p>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 mono text-[11px] text-(--t3) uppercase tracking-[0.06em]">
          <span>{article.readingTime} min read</span>
          <span>·</span>
          <span>{formatDate(article.publishedAt)}</span>
        </div>
        <span className="text-(--t3) group-hover:text-(--accent) transition-colors text-[13px]">
          →
        </span>
      </div>
    </Link>
  );
}
