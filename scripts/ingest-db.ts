import { db } from '../lib/db/client';
import { ingestionRuns, sourceCursors, researchPapers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { classifyDinosaur } from '../lib/ai/jev-style';
import { europePmcAdapter } from '../lib/ingestion/europe-pmc';
import { arxivAdapter } from '../lib/ingestion/arxiv';
import { crossrefAdapter } from '../lib/ingestion/crossref-adapter';
import { journalCrossrefAdapter } from '../lib/ingestion/crossref-journals';
import { rssAdapter } from '../lib/ingestion/rss';
import { resolveAbstract, abstractOutcomeMetadata } from '../lib/ingestion/abstracts';
import { stripTags } from '../lib/license';

const adapters = [europePmcAdapter, arxivAdapter, crossrefAdapter, journalCrossrefAdapter, rssAdapter];

/**
 * --adapter europe-pmc|arxiv|crossref|crossref-journals|rss   run just one source
 * default (no flag)                                       run all four
 * --limit N                                               max NEW papers per adapter (default 5)
 * Names are case-insensitive.
 */
const adapterArg = (() => {
  const i = process.argv.indexOf('--adapter');
  if (i < 0) return null;
  const name = (process.argv[i + 1] || '').toLowerCase().replace(/[^a-z]/g, '');
  const key = { europepmc: 'europe-pmc', europe: 'europe-pmc', arxiv: 'arxiv', crossref: 'crossref', crossrefjournals: 'crossref-journals', journals: 'crossref-journals', rss: 'rss' }[name];
  if (!key) { console.error('bad --adapter value:', process.argv[i + 1], '(expected europe-pmc, arxiv, crossref, crossref-journals or rss)'); process.exit(1); }
  return key;
})();
const selected = adapterArg
  ? adapters.filter((a) => a.sourceName.toLowerCase().replace(/[^a-z]/g, '') === adapterArg.replace(/[^a-z]/g, ''))
  : adapters;
if (!selected.length) { console.error('no adapter matched', adapterArg); process.exit(1); }

const run = async () => {
  for (const adapter of selected) {
    const runId = (await db.insert(ingestionRuns).values({ source: adapter.sourceName, status: 'running', startedAt: new Date() }).returning({ id: ingestionRuns.id }))[0].id;
    try {
      const cursorRow = await db.select().from(sourceCursors).where(eq(sourceCursors.source, adapter.sourceName)).limit(1);
      const cursor = cursorRow[0]?.cursor || undefined;
      const { records, nextCursor, done } = await adapter.discover(cursor);

      // Dedup BEFORE capping — otherwise duplicate rows swallow the --limit budget.
      const capFlag = process.argv.indexOf('--limit');
      const cap = capFlag >= 0 ? Math.max(1, parseInt(process.argv[capFlag + 1], 10) || 5) : 5;
      const fresh: typeof records = [];
      for (const r of records) {
        if (fresh.length >= cap) break;
        const existing = await db.select().from(researchPapers).where(
          r.doi ? eq(researchPapers.doi, r.doi) : eq(researchPapers.title, (r.title || '').slice(0, 200))
        ).limit(1);
        if (existing.length) continue;
        fresh.push(r);
      }
      console.log(`${adapter.sourceName}: ${records.length} discovered, ${fresh.length} new (cap=${cap})`);

      // Insert papers — DB unique on DOI prevents duplicates
      for (const r of fresh) {
        await db.insert(researchPapers).values({
          title: r.title?.slice(0, 500) || 'Untitled',
          doi: r.doi || null,
          abstract: r.abstract ? r.abstract.slice(0, 4000) : null,
          publicationDate: r.publicationDate ?? null,
          journalName: r.journalName || null,
          publisher: r.publisher || null,
          peerReviewStatus: (r.peerReviewStatus as any) || 'unknown',
          studyType: null,
          metadata: (r.rawMetadata || {}) as any,
        }).onConflictDoNothing();
        // Enrich a missing abstract — multi-provider resolver; a paywalled
        // publisher refusal (Elsevier 401/403) is recorded as
        // publisher-access-unavailable in metadata, never collapsed to "missing".
        if (r.doi && !r.abstract) {
          try {
            const result = await resolveAbstract(r.doi);
            const meta = abstractOutcomeMetadata(r.rawMetadata, result) as any;
            if (result.status === 'found') {
              await db.update(researchPapers).set({ abstract: stripTags(result.abstract).slice(0, 4000), metadata: meta }).where(eq(researchPapers.doi, r.doi));
              console.log(`  abstract: ${result.source} enriched`);
            } else {
              await db.update(researchPapers).set({ metadata: meta }).where(eq(researchPapers.doi, r.doi));
              const why = result.attempts.filter((a) => a.outcome !== 'skipped').map((a) => `${a.provider}:${a.outcome}`).join(', ');
              console.log(`  abstract: ${result.status} (${why})`);
            }
          } catch { /* enrichment is optional */ }
        }
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
      console.log(adapter.sourceName, 'saved:', fresh.length, 'done=', done);
    } catch (e: any) {
      await db.update(ingestionRuns).set({ status: 'failed', errors: String(e).slice(0, 500), completedAt: new Date() }).where(eq(ingestionRuns.id, runId));
      console.error(adapter.sourceName, 'failed:', e.message || e);
    }
  }
};

run();
