import { SourceAdapter, IngestionRecord, IngestionResult } from './types';

export const arxivAdapter: SourceAdapter = {
  sourceName: 'arXiv',
  async discover(cursor?: string) {
    const start = cursor ? parseInt(cursor) || 0 : 0;
    const url = `http://export.arxiv.org/api/query?search_query=cat:q-bio.PE+OR+cat:cs.CV&start=${start}&max_results=10`;
    const res = await fetch(url);
    const text = await res.text();
    // Simple parser: count entries by <entry> tags; real parse requires XML parser or regex extraction
    const entries = text.split('<entry>').slice(1);
    const records: IngestionRecord[] = entries.map((entryXml) => {
      const getTag = (tag: string) => {
        const match = entryXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return match ? match[1].trim() : undefined;
      };
      return {
        source: 'arXiv',
        externalId: getTag('id') || '',
        doi: getTag('doi') || undefined,
        title: getTag('title')?.replace(/\n/g, ' '),
        abstract: getTag('summary')?.replace(/\n/g, ' '),
        authors: (getTag('author') || '').split(',').map((n: string) => ({ fullName: n.trim() })),
        publicationDate: getTag('published') ? new Date(getTag('published')!) : undefined,
        journalName: undefined,
        publisher: 'arXiv',
        peerReviewStatus: 'preprint',
        rawMetadata: { xml: entryXml },
      } as IngestionRecord;
    }).filter(r => r.title && r.externalId);
    return {
      records,
      nextCursor: records.length ? String(start + records.length) : undefined,
      done: records.length < 10,
    };
  },
  normalize(raw: unknown): IngestionRecord {
    const r = raw as any;
    return {
      source: 'arXiv',
      externalId: r.externalId || '',
      title: r.title || '',
      abstract: r.abstract,
      peerReviewStatus: 'preprint',
      rawMetadata: r.rawMetadata || {},
      authors: r.authors || [],
    } as IngestionRecord;
  },
};
