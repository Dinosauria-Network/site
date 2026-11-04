import { SourceAdapter, IngestionRecord } from './types';

export const crossrefAdapter: SourceAdapter = {
  sourceName: 'Crossref',
  async discover(cursor?: string) {
    const url = `https://api.crossref.org/works?query.title=dinosaur&rows=10&offset=${cursor || 0}`;
    const res = await fetch(url);
    const data = await res.json();
    const items = data.message?.items || [];
    const records: IngestionRecord[] = items.map((item: any) => ({
      source: 'Crossref',
      externalId: item.DOI || item.URL || '',
      doi: item.DOI,
      title: (item.title || [''])[0],
      abstract: item.abstract || undefined,
      authors: (item.author || []).map((a: any) => ({ fullName: `${a.given || ''} ${a.family || ''}`.trim(), institution: a.affiliation?.[0]?.name })),
      publicationDate: item.published?.['date-parts'] ? new Date(item.published['date-parts'][0][0], item.published['date-parts'][0][1] || 0, item.published['date-parts'][0][2] || 1) : undefined,
      journalName: item['container-title']?.[0] || undefined,
      publisher: item.publisher || undefined,
      peerReviewStatus: item['peer-reviewed'] ? 'peer_reviewed' : 'unknown',
      rawMetadata: item,
    }));
    return {
      records,
      nextCursor: items.length ? String((parseInt(cursor || '0') + items.length)) : undefined,
      done: items.length < 10,
    };
  },
  normalize(raw: unknown): IngestionRecord {
    const r = raw as any;
    return {
      source: 'Crossref',
      externalId: r.doi || r.externalId || '',
      title: r.title || '',
      abstract: r.abstract,
      peerReviewStatus: r.peerReviewStatus || 'unknown',
      rawMetadata: r.rawMetadata || {},
      authors: r.authors || [],
    } as IngestionRecord;
  },
};
