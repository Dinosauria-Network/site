import fs from "fs";
import path from "path";
import { Genus, NewsPost, TaxonomyTerm } from "./domain";

const DATA_PATH = path.join(process.cwd(), "_data", "genus-data.json");
let cachedData: any = null;

export function loadData(): any {
  if (cachedData) return cachedData;
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    cachedData = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load data file:", DATA_PATH, e);
    cachedData = { site: { name: "Dinosauria Network", title: "Dinosauria Network", url: "https://dinosauria.network", description: "Dinosauria Network", generatedAt: new Date().toISOString() }, postTypes: { genus: [] } };
  }
  return cachedData;
}

export function getSiteMetadata() {
  return loadData().site;
}

export function getAllGenera(): Genus[] {
  const genera = loadData().postTypes.genus || [];
  return [...genera].sort((a: any, b: any) => {
    const dateA = new Date(a.post_date || 0);
    const dateB = new Date(b.post_date || 0);
    return dateB.getTime() - dateA.getTime(); // newest first
  });
}

export function getGenusBySlug(slug: string): Genus | null {
  return getAllGenera().find((g) => g.post_name === slug) || null;
}

export function getUniquePeriods(): TaxonomyTerm[] {
  const periods = new Set<string>();
  const result: TaxonomyTerm[] = [];
  for (const g of getAllGenera()) {
    for (const t of g.taxonomy || []) {
      if (t.taxonomy === "chronostratigraphy" && !periods.has(t.slug)) {
        periods.add(t.slug);
        result.push(t);
      }
    }
  }
  return result;
}

export function getGeneraByPeriod(periodSlug: string): Genus[] {
  return getAllGenera().filter((g) =>
    (g.taxonomy || []).some((t) => t.taxonomy === "chronostratigraphy" && t.slug === periodSlug)
  );
}

export function getPostById(id: number): NewsPost | undefined {
  const posts = getAllPosts();
  return posts.find((p) => p.id === id);
}

export function getAllPosts(): NewsPost[] {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "_data", "news-posts.json"), "utf-8");
    const posts = JSON.parse(raw) as NewsPost[];
    return posts.sort((a: any, b: any) => {
      const dateA = new Date(a.post_date || a.date || a.pubDate || a.meta?.scrapedAt || 0).getTime();
      const dateB = new Date(b.post_date || b.date || b.pubDate || b.meta?.scrapedAt || 0).getTime();
      return dateB - dateA; // newest first
    });
  } catch {
    return [];
  }
}

export function getPostsPaginated(page = 1, perPage = 10) {
  const posts = getAllPosts();
  const totalPages = Math.ceil(posts.length / perPage);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  const start = (currentPage - 1) * perPage;
  return {
    posts: posts.slice(start, start + perPage),
    totalPages,
    currentPage
  };
}

export const SOURCE_DOMAINS: Record<string, string> = {
  "nature.com": "nature.com",
  "sciencedirect.com": "sciencedirect.com",
};

const faviconCache = new Map<string, string>();
export function getSourceFavicon(source: string): string {
  if (faviconCache.has(source)) return faviconCache.get(source)!;
  const domain = SOURCE_DOMAINS[source] || source.toLowerCase().replace(/[^a-z0-9.]/g, "") || "example.com";
  const url = `https://www.google.com/s2/favicons?domain=${domain}`;
  faviconCache.set(source, url);
  return url;
}
