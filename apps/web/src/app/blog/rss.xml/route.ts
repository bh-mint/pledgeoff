import { getAllArticles } from "@/lib/mdx";

const SITE_URL = "https://pledgeoff.com";

export async function GET() {
  const articles = getAllArticles();

  const items = articles
    .map(
      (a) => `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${SITE_URL}/blog/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${a.slug}</guid>
      <description><![CDATA[${a.excerpt}]]></description>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <category>${a.tag}</category>
    </item>`
    )
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PledgeOFF Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Decisions backed by evidence. How to validate ideas, prioritize ruthlessly, and build things people actually want.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
