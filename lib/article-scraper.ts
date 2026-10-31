import { extract } from 'article-parser';

export interface ScrapedMeta {
  title: string | null;
  excerpt: string | null;
  image: string | null;
  url: string;
}

function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export async function scrapeArticleMeta(url: string, timeoutMs: number = 10000): Promise<ScrapedMeta> {
  console.log("[scrape] starting", url);
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) console.log("[scrape] retry", attempt, url);
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new Error("Invalid URL: " + url); }
      if (parsed.protocol !== "https:") throw new Error("Only https allowed: " + url);
      const hostname = parsed.hostname;
      if (/^(localhost|127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|::1|fc|fe80:)/i.test(hostname)) {
        throw new Error("Private/local IP blocked: " + url);
      }
      const article = await extract(url);
      const image = article.image || article.images?.[0] || null;
      return {
        title: article.title || null,
        excerpt: article.description || article.content?.slice(0, 300) || null,
        image,
        url: parsed.href
      };
    } catch (err) {
      lastErr = err;
      console.error("[scrape] error for", url, err);
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
  }
  return { title: null, excerpt: null, image: null, url };
}

function getMeta(html: string, prop: string): string | null {
  const escapedProp = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\s+(?:property|name)=["']` + escapedProp + `["']\\s+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']` + escapedProp + `["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) return decodeHtmlEntities(match[1]);
  }
  return null;
}

export function enrichPostMetadata(existing: any, scraped: ScrapedMeta): any {
  return {
    ...existing,
    ogTitle: scraped.title || existing.ogTitle,
    ogDescription: scraped.excerpt || existing.ogDescription,
    ogImage: scraped.image || existing.ogImage,
    sourceUrl: scraped.url,
    scrapedAt: new Date().toISOString()
  };
}

export async function scrapeAndEnrich(existing: any, url: string): Promise<any> {
  const scraped = await scrapeArticleMeta(url, 10000);
  return enrichPostMetadata(existing, scraped);
}
