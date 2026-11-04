import { db } from '../lib/db/client';
import { ingestionRuns, sourceCursors, researchPapers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { classifyDinosaur } from '../lib/ai/jev-style';
import { europePmcAdapter } from '../lib/ingestion/europe-pmc';
import { arxivAdapter } from '../lib/ingestion/arxiv';
import { crossrefAdapter } from '../lib/ingestion/crossref';

const adapters = [europePmcAdapter, arxivAdapter, crossrefAdapter];

const run = async () => {
  for (const adapter of adapters) {
    const runId = (await db.insert(ingestionRuns).values({ source: adapter.sourceName, status: 'running', startedAt: new Date() }).returning({ id: ingestionRuns.id }))[0].id;
    try {
      const cursorRow = await db.select().from(sourceCursors).where(eq(sourceCursors.source, adapter.sourceName)).limit(1);
      const cursor = cursorRow[0]?.cursor || undefined;
      const { records, nextCursor, done } = await adapter.discover(cursor);

      // Insert papers — DB unique on DOI prevents duplicates
      for (const r of records.slice(0, 5)) {
        const existing = await db.select().from(researchPapers).where(
          r.doi ? eq(researchPapers.doi, r.doi) : eq(researchPapers.title, (r.title || '').slice(0, 200))
        ).limit(1);
        await db.insert(researchPapers).values({
          title: r.title?.slice(0, 500) || 'Untitled',
          doi: r.doi || null,
          abstract: r.abstract ? r.abstract.slice(0, 4000) : null,
          journalName: r.journalName || null,
          publisher: r.publisher || null,
          peerReviewStatus: (r.peerReviewStatus as any) || 'unknown',
          studyType: null,
          metadata: (r.rawMetadata || {}) as any,
        }).onConflictDoNothing();
        // Optional Jev-Style classification (Vercel-compatible remote)
        if (process.env.JEVSTYLE_API_KEY && r.title) {
          try {
            const cls = await classifyDinosaur(r.title + ' ' + (r.abstract || ''), process.env.JEVSTYLE_API_KEY);
            console.log('  classified:', r.title?.slice(0, 40), 'dinosaur prob:', cls.questions?.dinosaur?.probability);
          } catch (e) { /* silent. classification is optional */ }
        }
      }

      // Update cursor
      await db.insert(sourceCursors).values({ source: adapter.sourceName, cursor: nextCursor || null, updatedAt: new Date() }).onConflictDoNothing();
      await db.update(sourceCursors).set({ cursor: nextCursor || null, updatedAt: new Date() }).where(eq(sourceCursors.source, adapter.sourceName));

      await db.update(ingestionRuns).set({ status: done ? 'completed' : 'partial', recordsDiscovered: records.length, completedAt: new Date() }).where(eq(ingestionRuns.id, runId));
      console.log(adapter.sourceName, 'saved:', records.length, 'done=', done);
    } catch (e: any) {
      await db.update(ingestionRuns).set({ status: 'failed', errors: String(e).slice(0, 500), completedAt: new Date() }).where(eq(ingestionRuns.id, runId));
      console.error(adapter.sourceName, 'failed:', e.message || e);
    }
  }
};

run();
