"use client";

import { useEffect } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

export function ArticleViewTracker({ slug, tag }: { slug: string; tag: string }) {
  useEffect(() => {
    trackEvent("blog_article_view", { slug, tag });
  }, [slug, tag]);
  return null;
}
