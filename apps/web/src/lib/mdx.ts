import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

export interface ArticleFrontmatter {
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  updatedAt: string;
  tag: "idea-validation" | "product-decisions" | "founder";
  readingTime: number;
  affiliateDisclosure: boolean;
}

export interface Article extends ArticleFrontmatter {
  content: string;
  readingTimeText: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content/blog");

export function getAllArticles(): ArticleFrontmatter[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, filename), "utf-8");
      const { data } = matter(raw);
      return data as ArticleFrontmatter;
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

export function getArticleBySlug(slug: string): Article | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  const stats = readingTime(content);

  return {
    ...(data as ArticleFrontmatter),
    content,
    readingTimeText: stats.text,
  };
}

export function getRelatedArticles(
  currentSlug: string,
  tag: string,
  limit = 3
): ArticleFrontmatter[] {
  return getAllArticles()
    .filter((a) => a.slug !== currentSlug && a.tag === tag)
    .slice(0, limit);
}

