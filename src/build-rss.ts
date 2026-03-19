import type { Article } from "./types.ts";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc2822(isoDate: string): string {
  return new Date(isoDate).toUTCString();
}

export function buildRss(articles: Article[], feedUrl: string): string {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
  );

  const items = sorted
    .slice(0, 100)
    .map((a) => {
      const link = `https://www.feltet.dk${a.url}`;
      const categories = a.tags
        .map((t) => `      <category>${escapeXml(t)}</category>`)
        .join("\n");

      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${toRfc2822(a.published)}</pubDate>
      <description>${escapeXml(a.description)}</description>
${categories}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>feltet.dk</title>
    <link>https://www.feltet.dk</link>
    <description>Seneste nyheder fra feltet.dk - dansk cykelsport</description>
    <language>da</language>
    <lastBuildDate>${toRfc2822(new Date().toISOString())}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}
