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
  discover(cursor?: string): Promise<{ records: IngestionRecord[]; nextCursor?: string; done: boolean }>;
  normalize(raw: unknown): IngestionRecord;
}
