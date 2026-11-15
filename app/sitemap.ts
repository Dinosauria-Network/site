import { MetadataRoute } from "next";
import { getAllGenera, getAllPosts } from "@/lib/genus-data";
import { TOPICS } from "@/lib/topics";
import { SITE_URL } from "@/lib/site";

// Revalidate weekly — static paths only; JSON dates are real dates.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const genera = getAllGenera();
  const posts = getAllPosts();
  const urls = [
    { url: base, lastModified: new Date() },
    { url: `${base}/about`, lastModified: new Date() },
    { url: `${base}/genera`, lastModified: new Date() },
    { url: `${base}/topics`, lastModified: new Date() },
    { url: `${base}/news`, lastModified: new Date() },
    { url: `${base}/phylogeny`, lastModified: new Date() },
    { url: `${base}/mesozoic`, lastModified: new Date() },
  ];
  for (const g of genera) {
    urls.push({ url: `${base}/genus/${g.post_name}`, lastModified: new Date() });
  }
  for (const t of TOPICS) {
    urls.push({ url: `${base}/topics/${t.slug}`, lastModified: new Date() });
  }
  for (const p of posts.slice(0, 20)) {
    urls.push({ url: `${base}/news/${p.id}`, lastModified: new Date(p.date) });
  }
  return urls;
}
