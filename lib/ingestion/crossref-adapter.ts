import { SourceAdapter, IngestionRecord } from './types';

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
    url.searchParams.set('mailto', 'admin@dinosaur publication.local'); // polite

    const res = await fetch(url.toString(), { headers: { 'User-Agent': 'Dinosauria-Science-Pub/1.0' } });
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
    const item = raw as {
      DOI?: string;
      title?: string[];
      abstract?: string;
      author?: Array<unknown>;
      'published-print'?: { 'date-parts'?: number[][] };
      'published-online'?: { 'date-parts'?: number[][] };
      'container-title'?: string[];
      publisher?: string;
      type?: string;
      URL?: string;
    };
    const doi = item.DOI || undefined;
    const title = Array.isArray(item.title) ? item.title[0] : (item.title || 'Untitled');
    const abstract = item.abstract || undefined;
    const authors = (item.author || []).map(normalizeAuthor);
    const pubDate = item['published-print']?.['date-parts']?.[0] || item['published-online']?.['date-parts']?.[0];
    const publicationDate = pubDate ? new Date(pubDate[0], (pubDate[1] || 1) - 1, pubDate[2] || 1) : undefined;
    const journalName = Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'];
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
  },
};
