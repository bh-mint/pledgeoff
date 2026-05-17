export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function extractTocHeadings(source: string): TocItem[] {
  const items: TocItem[] = [];
  for (const line of source.split("\n")) {
    const h3 = line.match(/^### (.+)/);
    const h2 = !h3 ? line.match(/^## (.+)/) : null;
    if (h2) items.push({ id: slugifyHeading(h2[1]), text: h2[1], level: 2 });
    else if (h3) items.push({ id: slugifyHeading(h3[1]), text: h3[1], level: 3 });
  }
  return items;
}
