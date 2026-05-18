import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/mdx";

const SITE_URL = "https://pledgeoff.com";

function latestInCluster(articles: ReturnType<typeof getAllArticles>, tag: string): string {
  const dates = articles.filter((a) => a.tag === tag).map((a) => a.updatedAt);
  return dates.sort().at(-1) ?? "2026-01-01";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();

  const latestArticle = articles.map((a) => a.updatedAt).sort().at(-1) ?? "2026-01-01";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: "2026-05-18" },
    { url: `${SITE_URL}/blog`, lastModified: latestArticle },
    { url: `${SITE_URL}/blog/idea-validation`, lastModified: latestInCluster(articles, "idea-validation") },
    { url: `${SITE_URL}/blog/product-decisions`, lastModified: latestInCluster(articles, "product-decisions") },
    { url: `${SITE_URL}/blog/founder`, lastModified: latestInCluster(articles, "founder") },
    { url: `${SITE_URL}/about`, lastModified: "2026-05-11" },
    { url: `${SITE_URL}/pricing`, lastModified: "2026-05-17" },
    { url: `${SITE_URL}/changelog`, lastModified: "2026-05-18" },
    { url: `${SITE_URL}/tools/decision-clarity`, lastModified: "2026-05-18" },
    { url: `${SITE_URL}/terms`, lastModified: "2026-05-16" },
    { url: `${SITE_URL}/privacy`, lastModified: "2026-05-16" },
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`,
    lastModified: a.updatedAt,
  }));

  return [...staticRoutes, ...articleRoutes];
}
