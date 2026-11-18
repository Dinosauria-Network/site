export interface IngestionRecord {
  source: string;
  externalId: string;
  externalUrl?: string;
  doi?: string;
  title: string;
  abstract?: string;
  authors: Array<{ fullName: string; orcid?: string; institution?: string }>;
  publicationDate?: Date;
  journalName?: string;
  publisher?: string;
  peerReviewStatus: 'peer_reviewed' | 'preprint' | 'unknown';
  rawMetadata: Record<string, unknown>;
}

export interface IngestionResult {
  discovered: number;
  imported: number;
  updated: number;
  errors: string[];
  cursor?: string;
}

export interface SourceAdapter {
  sourceName: string;
  // fromDate/toDate are optional (YYYY-MM-DD, deposit-side filters); adapters
  // that don't support them must ignore them — extra args are fine to accept.
  discover(cursor?: string, fromDate?: string, toDate?: string): Promise<{ records: IngestionRecord[]; nextCursor?: string; done: boolean }>;
  normalize(raw: unknown): IngestionRecord;
}
