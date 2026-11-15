import { SourceAdapter, IngestionRecord } from './types';
import { normalizeCrossrefRecord } from './crossref-adapter';

/**
 * Watched journals — latest articles regardless of keywords.
 * Our keyword query (`query=dinosaur`) can never see papers whose deposited
 * metadata lacks the word "dinosaur" (e.g. "Growth dynamics of Sinornithomimus
 * dongi…" in Cretaceous Research, no abstract deposited). The original three
 * were the highest-signal dinosaur/vertebrate-palaeo journals; the rest of the
 * user's monitored journal list (ISSN-verified against Crossref, 2026-11) is
 * added for the same reason. Each latest sweep takes the 10 most recently
 * published journal-articles per journal.
 *
 * Papers with no deposited abstract enter title-only — excerpt falls back to
 * the headline (with a warning) at propose time.
 */
const WATCHED_JOURNALS = [
  { name: 'Cretaceous Research', issn: '0195-6671' },
  { name: 'Journal of Vertebrate Paleontology', issn: '0272-4634' },
  { name: 'Historical Biology', issn: '0891-2963' },
  // The remainder of the user's monitored journal list, added 2026-11 after an
  // ISSN-by-ISSN Crossref directory audit (title + works count verified).
  // Most are Crossref depositors whose keyword sweep matches only metadata
  // containing "dinosaur"; they earn the same latest-issue guarantee.
  // Broad multidisciplinary titles (PNAS — 172k works; J. Geophys. Res. Solid
  // Earth — 8k works) will ingest mostly off-topic papers; the Jev-Style
  // classifier + --prune is the filter, exactly as with the Elsevier cases.
  { name: 'Acta Palaeontologica Polonica', issn: '0567-7920' },
  { name: 'Ameghiniana', issn: '0002-7014' },
  { name: 'Annual Review of Earth and Planetary Sciences', issn: '0084-6597' },
  { name: 'BSGF – Earth Sciences Bulletin', issn: '0037-9409' },
  { name: 'Bulletin of the Peabody Museum of Natural History', issn: '0079-032X' },
  { name: 'Canadian Journal of Earth Sciences', issn: '0008-4077' },
  { name: 'Geological Society London Special Publications', issn: '0305-8719' },
  { name: 'Geological Journal', issn: '0072-1050' },
  { name: 'Journal of Systematic Palaeontology', issn: '1477-2019' },
  { name: 'Gondwana Research', issn: '1342-937X' },
  { name: 'Swiss Journal of Geosciences', issn: '1661-8726' },
  { name: 'The American Midland Naturalist', issn: '0003-0031' },
  { name: 'Palaeontologia Electronica', issn: '1935-3952' },
  { name: 'Paleontological Contributions', issn: '1946-0279' },
  { name: 'Proceedings of the National Academy of Sciences', issn: '0027-8424' },
  { name: 'Zoologica Scripta', issn: '0300-3256' },
  { name: 'Journal of Geophysical Research: Solid Earth', issn: '2169-9313' },
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
