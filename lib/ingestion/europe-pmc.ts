import { SourceAdapter, IngestionRecord } from './types';

export const europePmcAdapter: SourceAdapter = {
  sourceName: 'Europe PMC',
  async discover(cursor?: string) {
    const query = cursor || 'dinosaur*';
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=10&resultType=core`;
    const res = await fetch(url);
    const data = await res.json();
    const results = data.resultList?.result || [];
    const records: IngestionRecord[] = results.map((r: any) => ({
      source: 'Europe PMC',
      externalId: r.id || r.doi || r.pmid || String(Math.random()),
      externalUrl: r.url || r.link?.[0]?.url,
      doi: r.doi,
      title: r.title || 'Untitled',
      abstract: r.abstractText || undefined,
      authors: Array.isArray(r.authorList?.author)
        ? r.authorList.author.map((a: any) => ({ fullName: (a.fullName || `${a.firstName || ''} ${a.lastName || ''}`).trim(), orcid: a.authorId || undefined }))
        : (r.authorString || '').split(',').map((n: string) => ({ fullName: n.trim() })),
      publicationDate: r.pubYear ? new Date(r.pubYear, 0, 1) : undefined,
      // Europe PMC returns the MEDLINE *abbreviated* name in journalTitle
      // (e.g. "R Soc Open Sci"); the full title lives in journalInfo.journal.title.
      journalName: r.journalInfo?.journal?.title || r.journalTitle || undefined,
      publisher: r.publisher || undefined,
      peerReviewStatus: r.journalType === 'journal' ? 'peer_reviewed' : (r.journalType === 'preprint' ? 'preprint' : 'unknown'),
      rawMetadata: r,
    }));
    return {
      records,
      nextCursor: data.resultList?.nextCursor || undefined,
      done: !data.resultList?.nextCursor,
    };
  },
  normalize(raw: unknown): IngestionRecord {
    const r = raw as any;
    return {
      source: 'Europe PMC',
      externalId: r.id || r.doi || r.pmid || '',
      title: r.title || '',
      authors: Array.isArray(r.authorList?.author)
        ? r.authorList.author.map((a: any) => ({ fullName: (a.fullName || `${a.firstName || ''} ${a.lastName || ''}`).trim() }))
        : (r.authorString || '').split(',').map((n: string) => ({ fullName: n.trim() })),
      peerReviewStatus: r.journalType === 'journal' ? 'peer_reviewed' : 'unknown',
      rawMetadata: r,
    } as IngestionRecord;
  },
};
