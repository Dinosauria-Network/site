import { SourceAdapter, IngestionRecord } from './types';
import { stripTags } from '../license';
import Parser from 'rss-parser';

/**
 * Non-journal outlets — RSS/Atom feeds for sources the editorial desk reads
 * that have no Crossref presence: museum/university blogs, palaeo blogs, a
 * magazine and the NSF/USGS newsrooms.
 *
 * Items enter research_papers as peerReviewStatus='unknown' (they are NOT
 * papers) and are scored by the same Jev-Style pass as everything else; the
 * classifier is the relevance filter — an item about dinosaur ecology on
 * svpow.com scores like an article, a funding announcement on USGS scores low.
 * Dedup at ingest time keys on title (feed items carry no DOI).
 *
 * Feed fetch failures never kill the sweep — the outlet is skipped and logged.
 */
const OUTLETS = [
  { name: 'Burke Museum', url: 'https://www.burkemuseum.org/news/feed.xml' },
  { name: "Dave Hone's Archosaur Musings", url: 'https://archosaurmusings.wordpress.com/feed/' },
  { name: 'SVPOW', url: 'https://svpow.com/feed' },
  { name: 'Sauropoda blogspot', url: 'https://sauropoda.blogspot.com/feeds/posts/default' },
  { name: 'Tetrapod Zoology', url: 'https://scienceblogs.com/tetrapodzoology/feed' },
  { name: 'Scientific American', url: 'https://www.scientificamerican.com/platform/syndication/rss/' },
  { name: 'NSF News', url: 'https://www.nsf.gov/rss/rss_www_news.xml' },
  { name: 'USGS News', url: 'https://www.usgs.gov/rss/news.rss' },
  { name: 'Noticias de la Ciencia y la Tecnología', url: 'https://noticiasdelaciencia.com/coverrss' },
] as const;

const UA = 'DinosauriaNetwork/1.0 (mailto:research@dinosauria.network)';
const TIMEOUT_MS = 15_000;

const parser = new Parser({ timeout: TIMEOUT_MS, headers: { 'User-Agent': UA } });

/** Feed titles arrive with raw numeric/named entities (e.g. NCYT's "B&#45;12"). */
const decodeEntities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

export const rssAdapter: SourceAdapter = {
  sourceName: 'rss',
  async discover() {
    const records: IngestionRecord[] = [];
    const failures: string[] = [];
    for (const outlet of OUTLETS) {
      try {
        const res = await fetch(outlet.url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (!res.ok) { failures.push(`${outlet.name}: HTTP ${res.status}`); continue; }
        const xml = await res.text();
        const feed = await parser.parseString(xml);
        for (const item of feed.items ?? []) {
          const title = decodeEntities((item.title ?? '').trim());
          if (!title) continue;
          // Feed HTML comes pre-tag-stripped in contentSnippet; fall back to stripping ourselves.
          const snippet = decodeEntities((item.contentSnippet ?? stripTags(item.content ?? item.contentSnippet ?? ''))).slice(0, 2000);
          const pub = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : undefined;
          records.push({
            source: 'rss',
            externalId: item.guid || item.link || `${outlet.name}:${title.slice(0, 120)}`,
            externalUrl: item.link,
            doi: undefined,
            title,
            abstract: snippet || undefined,
            authors: item.creator ? [{ fullName: String(item.creator) }] : [],
            publicationDate: pub && !isNaN(pub.getTime()) ? pub : undefined,
            journalName: outlet.name,
            publisher: outlet.name,
            peerReviewStatus: 'unknown',
            rawMetadata: {
              outlet: outlet.name,
              feedUrl: outlet.url,
              link: item.link,
              categories: item.categories,
              isoDate: item.isoDate,
            },
          });
        }
      } catch (e) {
        failures.push(`${outlet.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    // Round-robin interleave per outlet (each newest-first internally) — a
    // plain global newest-first sort lets the high-volume general feeds
    // consume the whole ingest cap (SciAm 50 items, NCYT 99 items…) and the
    // low-volume paleo outlets never get a slot. Each pass takes the next
    // item from every outlet in turn.
    const byOutlet = new Map<string, IngestionRecord[]>();
    for (const r of records) {
      const key = r.journalName ?? 'unknown';
      const g = byOutlet.get(key);
      if (g) g.push(r);
      else byOutlet.set(key, [r]);
    }
    for (const g of byOutlet.values()) {
      g.sort((a, b) => (b.publicationDate?.getTime() ?? 0) - (a.publicationDate?.getTime() ?? 0));
    }
    const interleaved: IngestionRecord[] = [];
    const queues = [...byOutlet.values()];
    for (let i = 0; ; i++) {
      let added = false;
      for (const q of queues) {
        const item = q[i];
        if (item) { interleaved.push(item); added = true; }
      }
      if (!added) break;
    }
    if (failures.length) console.log('rss-sweep failures:', failures.join('; '));
    return { records: interleaved, nextCursor: undefined, done: true };
  },
  normalize(raw) {
    const r = raw as IngestionRecord;
    return { ...r, source: 'rss' };
  },
};
