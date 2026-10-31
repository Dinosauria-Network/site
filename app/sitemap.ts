import { MetadataRoute } from "next";
import { getAllGenera, getAllPosts } from "@/lib/genus-data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://dinosauria.network";
  const genera = getAllGenera();
  const posts = getAllPosts();
  const urls = [
    { url: base, lastModified: new Date() },
    { url: `${base}/about`, lastModified: new Date() },
    { url: `${base}/genera`, lastModified: new Date() },
    { url: `${base}/news`, lastModified: new Date() },
    { url: `${base}/phylogeny`, lastModified: new Date() },
    { url: `${base}/mesozoic`, lastModified: new Date() },
  ];
  for (const g of genera) {
    urls.push({ url: `${base}/genus/${g.post_name}`, lastModified: new Date() });
  }
  for (const p of posts.slice(0, 20)) {
    urls.push({ url: `${base}/news/${p.id}`, lastModified: new Date(p.date) });
  }
  return urls;
}
