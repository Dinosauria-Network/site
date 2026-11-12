import { db } from '../lib/db/client';
import { researchPapers, editorialStories } from '../lib/db/schema';
import { resolveAbstract, abstractOutcomeMetadata } from '../lib/ingestion/abstracts';
import { stripTags, sentencePrefix } from '../lib/license';
import { eq, isNull, or, sql } from 'drizzle-orm';

/**
 * Backfill missing abstracts via the multi-provider resolver
 * (OpenAlex -> Crossref -> Semantic Scholar -> Elsevier).
 *
 * A paywalled publisher refusal (Elsevier 401/403) is recorded in the paper's
 * metadata as abstractStatus=publisher-access-unavailable — distinct from
 * abstractStatus=not-deposited — so "we were refused" is never reported as
 * "no abstract exists". Pass --dry-run to only report what would change.
 * Updates draft/story descriptions that were generated from a missing abstract
 * (the headline fallback) so drafts created before the abstract arrived get a
 * real dek.
 */
const dryRun = process.argv.includes('--dry-run');
const limitFlag = process.argv.indexOf('--limit');
const limit = limitFlag >= 0 ? Math.max(1, parseInt(process.argv[limitFlag + 1], 10) || 50) : 50;

const run = async () => {
  const missing = await db.select({ id: researchPapers.id, title: researchPapers.title, doi: researchPapers.doi, metadata: researchPapers.metadata })
    .from(researchPapers)
    .where(or(isNull(researchPapers.abstract), sql`trim(coalesce(abstract, '')) = ''`))
    .limit(limit);

  console.log(`${missing.length} paper(s) missing abstract${dryRun ? ' (dry-run)' : ''}:`);
  const filled: Array<{ id: string; title: string | null; abstract: string }> = [];
  const tally = { notDeposited: 0, publisherBlocked: 0, error: 0 };
  for (const p of missing) {
    if (!p.doi) { console.log('  skip (no DOI):', p.title?.slice(0, 50)); continue; }
    const result = await resolveAbstract(p.doi);
    const attempts = result.attempts.map((a) => `${a.provider}:${a.outcome}${a.detail ? ` (${a.detail})` : ''}`).join(', ');
    if (result.status !== 'found') {
      if (result.status === 'not-deposited') tally.notDeposited++;
      else if (result.status === 'publisher-access-unavailable') tally.publisherBlocked++;
      else tally.error++;
      console.log(`  miss (${result.status}): ${p.title?.slice(0, 56)} — ${attempts}`);
      if (!dryRun) {
        const meta = abstractOutcomeMetadata(p.metadata, result) as any;
        await db.update(researchPapers).set({ metadata: meta }).where(eq(researchPapers.id, p.id));
      }
      continue;
    }
    console.log('  hit :', `${p.title?.slice(0, 56)} — ${result.source}`);
    const clean = stripTags(result.abstract);
    if (!dryRun) {
      const meta = abstractOutcomeMetadata(p.metadata, result) as any;
      await db.update(researchPapers).set({ abstract: clean.slice(0, 4000), metadata: meta }).where(eq(researchPapers.id, p.id));
    }
    filled.push({ id: p.id, title: p.title, abstract: clean });
  }

  // Refresh draft descriptions that hold the headline-fallback deck.
  let deksFixed = 0;
  for (const p of filled) {
    const stories = await db.select().from(editorialStories).where(eq(editorialStories.paperId, p.id));
    for (const s of stories) {
      if (s.description && s.description.trim() !== s.headline.trim()) continue; // human/real dek — keep
      const dek = sentencePrefix(p.abstract, 240);
      if (!dek) continue;
      if (!dryRun) await db.update(editorialStories).set({ description: dek }).where(eq(editorialStories.id, s.id));
      console.log(`  dek ${dryRun ? 'would fix' : 'fixed'}: ${s.slug.slice(0, 48)}`);
      deksFixed++;
    }
  }
  console.log(`\nfilled=${filled.length} not-deposited=${tally.notDeposited} publisher-access-unavailable=${tally.publisherBlocked} error=${tally.error} deks_refreshed=${deksFixed}${dryRun ? ' (dry-run)' : ''}`);
};

run().catch((e) => { console.error(e); process.exit(1); });
