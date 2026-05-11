import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/mdx";

const SITE_URL = "https://pledgeoff.com";

// lastmod on static pages: use a real date, not new Date() — Google ignores inaccurate values
const SITE_LAST_UPDATED = "2026-05-05";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/blog`, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/blog/idea-validation`, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/blog/product-decisions`, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/blog/founder`, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/about`, lastModified: "2026-05-11" },
    { url: `${SITE_URL}/pricing`, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/changelog`, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/terms`, lastModified: SITE_LAST_UPDATED },
    { url: `${SITE_URL}/privacy`, lastModified: SITE_LAST_UPDATED },
  ];

  const articleRoutes: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${SITE_URL}/blog/${a.slug}`,
    lastModified: a.updatedAt,
  }));

  return [...staticRoutes, ...articleRoutes];
}
