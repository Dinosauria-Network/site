export async function discoverFromSitemap(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinosauriaBot/1.0)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const xml = await res.text();
    const urls: string[] = [];
    const matches = xml.match(/<loc>([^<]+)<\/loc>/g);
    if (matches) {
      for (const m of matches) {
        const u = m.replace(/<\/?loc>/g, '').trim();
        if (u && !urls.includes(u)) urls.push(u);
      }
    }
    // Also try RSS-style links inside sitemap
    const linkMatches = xml.match(/<url>\s*<loc>([^<]+)<\/loc>/g);
    if (linkMatches) {
      for (const m of linkMatches) {
        const u = m.match(/<loc>([^<]+)<\/loc>/)?.[1];
        if (u && !urls.includes(u)) urls.push(u);
      }
    }
    return urls.slice(0, 50); // limit to 50 per feed
  } catch (err: any) {
    console.error(`Discovery failed for ${url}:`, err?.message || err);
    return [];
  }
}

export async function discoverFromIndex(url: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinosauriaBot/1.0)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const html = await res.text();
    const links = html.match(/href="([^"]+\d{4}[^"]*)"/g) || [];
    const urls = links.map(l => l.replace('href="', '').replace('"', ''))
      .filter(u => u.includes('/') && (u.includes('news') || u.includes('article') || u.includes('blog') || u.includes('research')));
    return [...new Set(urls)].slice(0, 30);
  } catch (err: any) {
    console.error(`Index discovery failed for ${url}:`, err?.message || err);
    return [];
  }
}
