import { SourceAdapter, IngestionRecord } from './types';
import { stripTags } from '../license';

/**
 * Normalize a raw Crossref `works` item. Shared by the keyword adapter and the
 * watched-journals adapter (same schema, same DOI uniqueness).
 */
export function normalizeCrossrefRecord(raw: unknown): IngestionRecord {
    const item = raw as {
      DOI?: string;
      title?: string[];
      abstract?: string;
      author?: Array<unknown>;
      'published-print'?: { 'date-parts'?: number[][] };
      'published-online'?: { 'date-parts'?: number[][] };
      created?: { 'date-time'?: string };
      'container-title'?: string[];
      publisher?: string;
      type?: string;
      URL?: string;
    };
    const doi = item.DOI || undefined;
    const title = stripTags(Array.isArray(item.title) ? item.title[0] : (item.title || 'Untitled')) || 'Untitled';
    const abstract = item.abstract || undefined;
    const authors = (item.author || []).map(normalizeAuthor);
    const online = item['published-online']?.['date-parts']?.[0];
    const print = item['published-print']?.['date-parts']?.[0];
    const toDate = (p?: number[]) => (p && p.length ? new Date(p[0], (p[1] || 1) - 1, p[2] || 1) : undefined);
    const onlineDate = toDate(online);
    const printDate = toDate(print);
    const created = item.created?.['date-time'];
    const createdDate = created && !isNaN(new Date(created).getTime()) ? new Date(created) : undefined;
    // Prefer the online / version-of-record date over the print issue date.
    // Elsevier's issue-ahead records (e.g. Cretaceous Research's 2027-print
    // issue deposited in late 2026) deposit no published-online, only a future
    // published-print — there the Crossref `created` timestamp (registration
    // ≈ online availability, within days of OpenAlex's publication_date) is
    // the honest site date. A print date already in the past is kept as-is.
    let publicationDate: Date | undefined;
    if (onlineDate) publicationDate = onlineDate;
    else if (printDate && printDate <= new Date()) publicationDate = printDate;
    else if (createdDate) publicationDate = createdDate;
    else publicationDate = printDate;
    const journalName = stripTags(Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title']);
    const peerReviewStatus: IngestionRecord['peerReviewStatus'] = item.type === 'preprint' ? 'preprint' : (item.type === 'journal-article' ? 'peer_reviewed' : 'unknown');
    return {
      source: 'crossref',
      externalId: doi || `crossref-${String(Math.random()).slice(2)}`,
      externalUrl: item.URL ? `https://doi.org/${doi}` : undefined,
      doi,
      title,
      abstract,
      authors,
      publicationDate,
      journalName,
      publisher: item.publisher,
      peerReviewStatus,
      rawMetadata: item,
    };
}

function normalizeAuthor(a: unknown): { fullName: string; orcid?: string; institution?: string } {
  const item = a as { given?: string; family?: string; ORCID?: string; name?: string };
  const full = item.name || `${item.given || ''} ${item.family || ''}`.trim();
  return { fullName: full || 'Unknown', orcid: item.ORCID, institution: undefined };
}

export const crossrefAdapter: SourceAdapter = {
  sourceName: 'crossref',
  async discover(cursor) {
    const offset = cursor ? parseInt(cursor, 10) : 0;
    const url = new URL('https://api.crossref.org/works');
    url.searchParams.set('query', 'dinosaur');
    url.searchParams.set('rows', '20');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('filter', 'type:journal-article');
    url.searchParams.set('mailto', 'admin@dinosauria.net'); // polite

    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'Dinosauria-Science-Pub/1.0' }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`Crossref error ${res.status}`);
    const data = await res.json() as { message?: { items?: Array<unknown>; 'total-results'?: number } };
    const items = data.message?.items || [];
    const records: IngestionRecord[] = items.map((raw) => this.normalize(raw));
    const nextOffset = offset + items.length;
    const total = data.message?.['total-results'] || 0;
    return {
      records,
      nextCursor: nextOffset < total ? String(nextOffset) : undefined,
      done: nextOffset >= total,
    };
  },
  normalize(raw) {
    return normalizeCrossrefRecord(raw);
  },
};
