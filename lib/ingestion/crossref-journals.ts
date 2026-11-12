import { SourceAdapter, IngestionRecord } from './types';
import { normalizeCrossrefRecord } from './crossref-adapter';

/**
 * Watched journals — latest articles regardless of keywords.
 * Our keyword query (`query=dinosaur`) can never see papers whose deposited
 * metadata lacks the word "dinosaur" (e.g. "Growth dynamics of Sinornithomimus
 * dongi…" in Cretaceous Research, no abstract deposited). These are the
 * highest-signal dinosaur/vertebrate-palaeo journals on Crossref; each latest
 * sweep takes the 10 most recently published journal-articles.
 *
 * Papers with no deposited abstract enter title-only — excerpt falls back to
 * the headline (with a warning) at propose time.
 */
const WATCHED_JOURNALS = [
  { name: 'Cretaceous Research', issn: '0195-6671' },
  { name: 'Journal of Vertebrate Paleontology', issn: '0272-4634' },
  { name: 'Historical Biology', issn: '0891-2963' },
] as const;

const UA = { 'User-Agent': 'Dinosauria-Science-Pub/1.0 (mailto:admin@dinosauria.net)' };

export const journalCrossrefAdapter: SourceAdapter = {
  sourceName: 'crossref-journals',
  async discover() {
    const out: IngestionRecord[] = [];
    const failures: string[] = [];
    for (const j of WATCHED_JOURNALS) {
      const url = new URL('https://api.crossref.org/works');
      url.searchParams.set('filter', `issn:${j.issn},type:journal-article`);
      url.searchParams.set('sort', 'published');
      url.searchParams.set('order', 'desc');
      url.searchParams.set('rows', '10');
      url.searchParams.set('mailto', 'admin@dinosauria.net'); // polite
      try {
        const res = await fetch(url.toString(), { headers: UA });
        if (!res.ok) { failures.push(`${j.name}: HTTP ${res.status}`); continue; }
        const data = (await res.json()) as { message?: { items?: Array<unknown> } };
        const items = data.message?.items ?? [];
        out.push(...items.map((i) => normalizeCrossrefRecord(i)));
      } catch (e) {
        failures.push(`${j.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    // Newest first, de-duplicated by DOI — the ingest cap takes the head.
    const seen = new Set<string>();
    const records = out
      .filter((r) => r.doi || r.title)
      .sort((a, b) => (b.publicationDate?.getTime() ?? 0) - (a.publicationDate?.getTime() ?? 0))
      .filter((r) => (r.doi ? (seen.has(r.doi) ? false : (seen.add(r.doi), true)) : true));
    if (failures.length) console.log('journal-sweep failures:', failures.join('; '));
    return { records, nextCursor: undefined, done: true };
  },
  normalize(raw) {
    return normalizeCrossrefRecord(raw);
  },
};
