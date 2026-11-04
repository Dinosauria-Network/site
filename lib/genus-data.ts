import fs from "fs";
import path from "path";
import { ScrapedMeta, scrapeArticleMeta } from "./article-scraper";

const faviconCache = new Map<string, string>();
const enrichedCache = new Map<number, any>();

export interface TaxonomyTerm {
  term_id: number;
  name: string;
  slug: string;
  taxonomy: string;
}

export interface GenusMeta {
  period?: string;
  author?: string;
  description_date?: number;
  [key: string]: unknown;
}

export interface Genus {
  id: number;
  post_author: number;
  author?: string;
  post_date: string;
  post_date_gmt: string;
  post_content: string | null;
  post_title: string;
  post_excerpt: string | null;
  post_status: string;
  comment_status: string;
  ping_status: string;
  post_name: string;
  post_modified: string;
  post_modified_gmt: string;
  post_parent: number;
  guid: string;
  menu_order: number;
  post_type: string;
  post_mime_type: string | null;
  comment_count: number;
  meta: GenusMeta;
  taxonomy: TaxonomyTerm[];
}

export interface SiteMetadata {
  name: string;
  url: string;
  description: string;
  generatedAt: string;
}

export interface NewsPost {
  id: number | string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  source: string;
  url?: string;
  guid?: string;
  image?: string;
  post_name?: string;
  syndication_source?: string;
}

interface GenusData {
  site: SiteMetadata;
  postTypes: {
    genus: Genus[];
  };
}

const DATA_PATH = path.join(process.cwd(), "_data", "genus-data.json");

let cachedData: GenusData | null = null;

function loadData(): GenusData {
  if (cachedData) return cachedData;
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    cachedData = JSON.parse(raw) as GenusData;
  } catch (e) {
    console.error("Failed to load data file:", DATA_PATH, e);
    cachedData = { site: { name: "Dinosauria Network", title: "Dinosauria Network", url: "https://dinosauria.network", description: "Dinosauria Network", generatedAt: new Date().toISOString() }, postTypes: { genus: [] } } as unknown as GenusData;
  }
  return cachedData;
}

export function getSiteMetadata(): SiteMetadata {
  const data = loadData().site;
  return {
    ...data,
    description: data.description || "Dispensing your daily dose of dinosaurs",
  };
}

export function getAllGenera(): Genus[] {
  return loadData().postTypes.genus;
}

export function getGenusBySlug(slug: string): Genus | null {
  const genera = getAllGenera();
  return genera.find((g) => g.post_name === slug) ?? null;
}

export function getGeneraByPeriod(periodSlug: string): Genus[] {
  const genera = getAllGenera();
  return genera.filter((g) =>
    g.taxonomy.some((t) => t.slug === periodSlug)
  );
}

export function getUniquePeriods(): TaxonomyTerm[] {
  const genera = getAllGenera();
  const seen = new Set<string>();
  const terms: TaxonomyTerm[] = [];
  for (const genus of genera) {
    for (const term of genus.taxonomy) {
      if (!seen.has(term.slug)) {
        seen.add(term.slug);
        terms.push(term);
      }
    }
  }
  return terms;
}

/**
 * Dinosaur news/blog posts for the homepage masonry grid.
 * Data sourced from the Dinosauria.net Wayback Machine snapshot (2010).
 * Falls back to hardcoded posts if extracted JSON is unavailable.
 */
const POSTS_DATA_PATH = path.join(process.cwd(), "_data", "news-posts.json");

// Hardcoded fallback posts (original 8 from the Fossils theme)
const FALLBACK_POSTS: NewsPost[] = [
  {
    id: 1,
    title: "Largest documented dinosaur graveyard unearthed in Badlands",
    excerpt:
      "The largest dinosaur bone-bed ever unearthed is providing evidence that the dinosaurs were wiped out in catastrophic coastal storms, new findings published this month report.",
    date: "2010-06-20",
    author: "admin",
    source: "DrumhellerMail.com",
  },
  {
    id: 2,
    title: "Long-Necked Dinosaurs Held Heads High",
    excerpt:
      "The sauropod dinosaurs, which included titans such as Brachiosaurus, Diplodocus, and Apatosaurus (once known as Brontosaurus), are well-known for the very long necks they usually sported.",
    date: "2010-06-10",
    author: "Charles Q. Choi",
    source: "LiveScience",
  },
  {
    id: 3,
    title: "High-energy X-ray confirms feathered dinosaur",
    excerpt:
      "Stanford researchers have aimed high-energy X-ray beams at an Archaeopteryx fossil, identifying key chemicals in the creature's 150-million-year-old bones and wings.",
    date: "2010-05-12",
    author: "David Perlman",
    source: "San Francisco Chronicle",
  },
  {
    id: 4,
    title: "Magyarosaurus Was A Shrunken Giant",
    excerpt:
      "Nopcsa interpreted small dinosaur bones discovered on a Transylvanian estate as the remains of dwarfed animals that had once lived on an island.",
    date: "2010-05-03",
    author: "University of Bonn",
    source: "RedOrbit",
  },
  {
    id: 5,
    title: "Dinosaur Feathers Changed With Age",
    excerpt:
      "Newly found fossils of a feathered dinosaur suggest that extinct reptiles might have possessed a diversity in plumage types.",
    date: "2010-05-03",
    author: "Charles Q. Choi",
    source: "National Geographic News",
  },
  {
    id: 6,
    title: "North American dinosaurs may have had a greater range than previously thought",
    excerpt:
      "Tremendous herds of dinosaurs hundreds of thousands strong once ruled the entire western interior of North America, according to a new statistical analysis of the fossil record.",
    date: "2010-04-20",
    author: "Jeremy A. Kaplan",
    source: "Fox News",
  },
  {
    id: 7,
    title: "New bony-skulled dinosaur species discovered in Texas",
    excerpt:
      "Paleontologists have discovered a new species of dinosaur with a softball-sized lump of solid bone on top of its skull.",
    date: "2010-04-20",
    author: "Suzanne Muzzin",
    source: "EurekAlert!",
  },
  {
    id: 8,
    title: "Velociraptor Frozen in Time Scavenging a Larger Dinosaur",
    excerpt:
      "The swift predator Velociraptor has been caught frozen in time apparently scavenging on the corpse of another, larger dinosaur.",
    date: "2010-04-19",
    author: "Charles Q. Choi",
    source: "LiveScience",
  },
];

let cachedPosts: NewsPost[] | null = null;

function loadPosts(): NewsPost[] {
  if (cachedPosts) return cachedPosts;
  try {
    const raw = fs.readFileSync(POSTS_DATA_PATH, "utf-8");
    const rawData = JSON.parse(raw) as any[];
    cachedPosts = rawData.map((post) => ({
      id: post.id,
      title: post.post_title ?? post.title ?? '',
      excerpt: post.post_excerpt ?? post.excerpt ?? post.post_content ?? '',
      date: post.post_date ?? post.date ?? '',
      author: post.author ?? 'Palai',
      source: post.syndication_source ?? post.source ?? '',
      url: post.guid ?? post.url,
      guid: post.guid ?? post.url ?? '',
      image: post.image ?? undefined,
      post_name: post.post_name ?? '',
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return cachedPosts;
  } catch {
    cachedPosts = FALLBACK_POSTS;
    return FALLBACK_POSTS;
  }
}

export function getAllPosts(): NewsPost[] {
  return loadPosts();
}

export function getPostsPaginated(page: number, perPage: number): {
  posts: NewsPost[];
  total: number;
  totalPages: number;
  currentPage: number;
} {
  const posts = loadPosts();
  const total = posts.length;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    posts: posts.slice(start, end),
    total,
    totalPages,
    currentPage: page,
  };
}

export function getPostById(id: number): NewsPost | null {
  return loadPosts().find((p) => p.id === id) ?? null;
}

/**
 * Map known syndication sources to their domains for favicon lookup.
 * Sources that are already domains (e.g. "DrumhellerMail.com") map to themselves.
 */
const SOURCE_DOMAINS: Record<string, string> = {
  "DrumhellerMail.com": "drumhellermail.com",
  LiveScience: "livescience.com",
  "San Francisco Chronicle": "sfchronicle.com",
  RedOrbit: "redorbit.com",
  "National Geographic News": "nationalgeographic.com",
  "Fox News": "foxnews.com",
  "EurekAlert!": "eurekalert.org",
};

/**
 * Return a favicon URL for a given syndication source.
 * Uses Google's favicon service with a known-domain mapping, falling back
 * to a sanitized version of the source name as the domain.
 */
export function getSourceFavicon(source: string): string {
  if (faviconCache.has(source)) return faviconCache.get(source)!;
  const domain =
    SOURCE_DOMAINS[source] ||
    source.toLowerCase().replace(/[^a-z0-9.]/g, "") ||
    "example.com";
  const url = `https://www.google.com/s2/favicons?domain=${domain}`;
  faviconCache.set(source, url);
  return url;
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
/**
 * Scraper integration for enriching post metadata with live web data.
 * Uses the same logic as site/lib/article-scraper.ts for consistency.
 */

}

interface EnrichedPost extends NewsPost {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  sourceUrl?: string;
  scrapedAt?: string;
}

/**
 * Enrich a news post with scraped metadata.
 */
export async function enrichPostMetadata(post: NewsPost): Promise<EnrichedPost> {
  const scraped = await scrapeArticleMeta(post.url || "");
  return {
    ...post,
    ogTitle: scraped.title || post.title,
    ogDescription: scraped.excerpt || post.excerpt,
    ogImage: scraped.image || post.image,
    sourceUrl: scraped.url,
    scrapedAt: new Date().toISOString()
  };
}

/**
 * Fetch and enrich a single news post by ID.
 */
export async function getEnrichedPostById(id: number): Promise<EnrichedPost | null> {
  if (enrichedCache.has(id)) return enrichedCache.get(id)!;
  try {
    const cacheFile = fs.readFileSync(path.join(process.cwd(), "_data", "enriched-cache.json"), "utf-8");
    const cacheData = JSON.parse(cacheFile);
    if (cacheData[String(id)]) { enrichedCache.set(id, cacheData[String(id)]); return cacheData[String(id)]; }
  } catch { /* no build-time cache */ }
  const post = getPostById(id);
  if (!post || !post.url) { enrichedCache.set(id, post as EnrichedPost | null); return post as EnrichedPost | null; }
  const enriched = await enrichPostMetadata(post);
  enrichedCache.set(id, enriched);
  return enriched;
}
