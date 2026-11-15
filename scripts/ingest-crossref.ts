import { db } from '../lib/db/client';
import { researchPapers, paperSources, ingestionRuns } from '../lib/db/schema';
import { crossrefAdapter } from '../lib/ingestion/crossref-adapter';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Starting Crossref ingestion...');
  let cursor: string | undefined;
  let discovered = 0;
  let imported = 0;
  let errors = 0;

  try {
    do {
      const { records, nextCursor, done } = await crossrefAdapter.discover(cursor);
      discovered += records.length;
      console.log(`Batch: ${records.length} records (cursor ${cursor || 'start'})`);

      for (const r of records) {
        try {
          const existing = await db.select().from(researchPapers).where(eq(researchPapers.doi, r.doi || '')).execute();
          if (existing.length > 0 && existing[0].id) {
            // skip duplicate for now; could update
            continue;
          }
          const [paper] = await db.insert(researchPapers).values({
            doi: r.doi || null,
            title: r.title,
            abstract: r.abstract || null,
            publicationDate: r.publicationDate || null,
            journalName: r.journalName || null,
            publisher: r.publisher || null,
            peerReviewStatus: r.peerReviewStatus,
            metadata: r.rawMetadata,
          }).returning();

          await db.insert(paperSources).values({
            paperId: paper.id,
            sourceName: r.source,
            externalId: r.externalId,
            externalUrl: r.externalUrl || null,
            lastSyncedAt: new Date(),
            rawMetadata: r.rawMetadata,
          });
          imported++;
        } catch (e) {
          console.error('Record error:', (e as Error).message);
          errors++;
        }
      }
      cursor = nextCursor;
      if (done || !cursor) break;
    } while (cursor);

    await db.insert(ingestionRuns).values({
      source: 'crossref',
      status: 'completed',
      recordsDiscovered: discovered,
      recordsImported: imported,
      recordsUpdated: 0,
      errors: errors > 0 ? String(errors) : null,
      startedAt: new Date(),
      completedAt: new Date(),
    });
    console.log(`Done. Discovered ${discovered}, imported ${imported}, errors ${errors}`);
  } catch (e) {
    console.error('Ingestion failed:', (e as Error).message);
    await db.insert(ingestionRuns).values({
      source: 'crossref',
      status: 'failed',
      errors: String((e as Error).message),
      startedAt: new Date(),
      completedAt: new Date(),
    });
    process.exit(1);
  }
}

main();
