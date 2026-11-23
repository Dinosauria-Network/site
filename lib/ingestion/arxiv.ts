import { SourceAdapter, IngestionRecord } from './types';
import { stripTags } from '../license';

/** Parse arxiv <author><name>…</name></author> blocks into an ordered list. */
export function parseArxivAuthors(entryXml: string): Array<{ fullName: string }> {
  const authorBlocks = entryXml.match(/<author>[\s\S]*?<\/author>/g) || [];
  return authorBlocks.map((block) => {
    const nameMatch = block.match(/<name[^>]*>([\s\S]*?)<\/name>/);
    return { fullName: (nameMatch ? nameMatch[1] : '').trim().replace(/\n/g, ' ') };
  }).filter((a) => a.fullName);
}

export const arxivAdapter: SourceAdapter = {
  sourceName: 'arXiv',
  async discover(cursor?: string, _fromDate?: string, _toDate?: string) {
    const start = cursor ? parseInt(cursor, 10) || 0 : 0;
    const url = `http://export.arxiv.org/api/query?search_query=cat:q-bio.PE+OR+cat:cs.CV&start=${start}&max_results=10`;
    const res = await fetch(url);
    const text = await res.text();
    const entries = text.split('<entry>').slice(1);
    const records: IngestionRecord[] = entries.map((entryXml) => {
      const getTag = (tag: string) => {
        const match = entryXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return match ? match[1].trim() : undefined;
      };
      // arxiv uses repeated <author><name>…</name></author> blocks, not a
      // comma-joined string — parse each one individually.
      const authors = parseArxivAuthors(entryXml);
      return {
        source: 'arXiv',
        externalId: getTag('id') || '',
        doi: getTag('doi') || undefined,
        title: getTag('title')?.replace(/\n/g, ' '),
        abstract: getTag('summary')?.replace(/\n/g, ' '),
        authors,
        publicationDate: getTag('published') ? new Date(getTag('published')!) : undefined,
        journalName: undefined,
        publisher: 'arXiv',
        peerReviewStatus: 'preprint',
        rawMetadata: { xml: entryXml },
      } as IngestionRecord;
    }).filter((r) => r.title && r.externalId);
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
